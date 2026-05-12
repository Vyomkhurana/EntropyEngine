"""
Entropy Engine — Control Orchestrator
=======================================
Central service that bridges AI ↔ Backend ↔ Frontend.

1. Polls simulation backend for plant state  (GET /metrics)
2. Runs AI controller for optimal valve       (ai_bridge)
3. Applies safety constraints                 (safety.py)
4. Anti-oscillation clamp
5. Sends final valve command to backend       (POST /control)
6. Records history for frontend charts

Frontend-facing API (port 8001):
    GET  /api/state         → unified snapshot for dashboard
    POST /api/ai/toggle     → enable / disable AI
    GET  /api/ai/status     → AI mode, confidence, safety
    GET  /api/history       → recent decision log (chart data)
    GET  /api/comparison    → baseline vs AI power comparison
    GET  /api/safety        → safety stats + override counts
    GET  /api/health        → liveness probe
"""

from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime

from config import (
    CONTROL_INTERVAL,
    MAX_CONSECUTIVE_ERRORS,
    MAX_HISTORY,
    MAX_RECOVERY_ATTEMPTS,
    MAX_VALVE,
    MAX_VALVE_CHANGE_PER_TICK,
    MIN_VALVE,
    ORCHESTRATOR_HOST,
    ORCHESTRATOR_PORT,
    SAFE_VALVE_POSITION,
    SIM_AI_MODE_URL,
    SIM_CONTROL_URL,
    SIM_HEALTH_URL,
    SIM_METRICS_URL,
)
from safety import SafetyFallback
from confidence import ConfidenceMonitor
from logger import (
    log,
    log_ai_event,
    log_tick,
)
from ai_bridge import get_ai_decision, is_ai_loaded, get_load_error
from business_metrics import (
    BusinessCalculator,
    MultiFactoryAggregator,
    OperationalMetrics,
)
from websocket_manager import ws_manager  # ── NEW: WebSocket support ──


# ═══════════════════════════════════════════════
#  AI Mode State Machine
# ═══════════════════════════════════════════════

class AIModeManager:
    """
    Manages transitions: IDLE ↔ ACTIVE ↔ FALLBACK.

    IDLE:     AI off — no control commands sent.
    ACTIVE:   AI making real-time decisions.
    FALLBACK: AI failed — using safe defaults, auto-recovery attempted.
    """

    def __init__(self) -> None:
        self.mode: str = "IDLE"          # IDLE | ACTIVE | FALLBACK
        self.ai_enabled: bool = False
        self.fallback_reason: str | None = None
        self.recovery_attempts: int = 0
        self.max_recovery: int = MAX_RECOVERY_ATTEMPTS

    def enable_ai(self) -> None:
        self.ai_enabled = True
        self.mode = "ACTIVE"
        self.recovery_attempts = 0
        self.fallback_reason = None
        log_ai_event("ENABLE", "AI ACTIVATED — entering ACTIVE mode")

    def disable_ai(self) -> None:
        self.ai_enabled = False
        self.mode = "IDLE"
        self.fallback_reason = None
        log_ai_event("DISABLE", "AI DEACTIVATED — entering IDLE mode")

    def enter_fallback(self, reason: str) -> None:
        self.mode = "FALLBACK"
        self.fallback_reason = reason
        log_ai_event("FALLBACK", f"Entering FALLBACK: {reason}")

    def attempt_recovery(self) -> bool:
        """Try to return to ACTIVE. Returns False if max attempts exceeded."""
        if self.recovery_attempts >= self.max_recovery:
            log_ai_event("RECOVERY", "Max recovery attempts reached — staying in FALLBACK")
            return False
        self.recovery_attempts += 1
        self.mode = "ACTIVE"
        log_ai_event(
            "RECOVERY",
            f"Recovery attempt {self.recovery_attempts}/{self.max_recovery}",
        )
        return True

    def get_status(self) -> dict:
        return {
            "mode": self.mode,
            "ai_enabled": self.ai_enabled,
            "fallback_reason": self.fallback_reason,
            "recovery_attempts": self.recovery_attempts,
        }


# ═══════════════════════════════════════════════
#  Core Orchestrator
# ═══════════════════════════════════════════════

class Orchestrator:
    """
    Main orchestration loop — ticks once per second.
    """

    def __init__(self) -> None:
        self.mode_manager = AIModeManager()
        self.safety = SafetyFallback()
        self.confidence = ConfidenceMonitor()

        self.last_metrics: dict = {}
        self.last_decision: dict = {}
        self.last_safety: dict = {"level": "NORMAL"}
        self.last_business_metrics: dict = {}
        self.history: list[dict] = []

        self.baseline_readings: list[float] = []
        self.ai_readings: list[float] = []
        self.baseline_snapshot_power: float | None = None
        self.revenue_series: list[dict] = []

        self.tick_count: int = 0
        self.error_count: int = 0
        self.start_time: float = time.time()

        self._running: bool = False
        self._recovery_cooldown: int = 0

        # ── NEW: Business metrics layer ──
        self.business_calculator = BusinessCalculator()
        self.factory_aggregator = MultiFactoryAggregator(num_factories=5)

    # ── Main loop ────────────────────────────

    async def run(self) -> None:
        """Background loop — runs until stopped."""
        self._running = True
        log.info("🚀 Orchestrator loop STARTED")

        while self._running:
            try:
                await self._tick()
            except Exception as exc:
                log.error("Orchestrator tick error: %s", exc, exc_info=True)
            await asyncio.sleep(CONTROL_INTERVAL)

        log.info("🛑 Orchestrator loop STOPPED")

    def stop(self) -> None:
        self._running = False

    # ── Single tick ──────────────────────────

    async def _tick(self) -> None:
        self.tick_count += 1

        # 1. Fetch plant state
        metrics = await self._fetch_metrics()
        if metrics is None:
            return  # backend down
        self.last_metrics = metrics

        power = metrics.get("power_output", 0)
        current_valve = metrics.get("valve_position", 50)

        # ── NEW: Calculate business metrics from operational metrics ──
        operational_metrics = OperationalMetrics(
            power_output_kw=metrics.get("power_output", 0),
            efficiency_pct=metrics.get("efficiency_pct", 75.0),
            temperature_c=metrics.get("temperature", 500),
            pressure_bar=metrics.get("pressure", 6.0),
            turbine_rpm=metrics.get("turbine_rpm", 0),
            valve_position_pct=metrics.get("valve_position", 50),
            heat_recovered_kwh=metrics.get("heat_recovered_kwh", 0),
            energy_loss_pct=metrics.get("energy_loss_pct", 25.0),
            co2_avoided_tons=metrics.get("co2_avoided_tons", 0),
        )
        
        dt_hours = CONTROL_INTERVAL / 3600.0  # Convert seconds to hours
        business_metrics = self.business_calculator.calculate(operational_metrics, dt_hours)
        self.last_business_metrics = {
            "power_generated_kw": business_metrics.power_generated_kw,
            "energy_generated_kwh": business_metrics.energy_generated_kwh,
            "revenue_from_power_usd": business_metrics.revenue_from_power_usd,
            "revenue_from_co2_usd": business_metrics.revenue_from_co2_usd,
            "total_hourly_revenue_usd": business_metrics.total_hourly_revenue_usd,
            "grid_cost_avoided_usd": business_metrics.grid_cost_avoided_usd,
            "monthly_savings_usd": business_metrics.monthly_savings_usd,
            "annual_savings_usd": business_metrics.annual_savings_usd,
            "potential_monthly_savings_usd": business_metrics.potential_monthly_savings_usd,
            "co2_avoided_tons": business_metrics.co2_avoided_tons,
            "co2_value_usd": business_metrics.co2_value_usd,
            "efficiency_pct": business_metrics.efficiency_pct,
            "roi_pct": business_metrics.roi_pct,
            "payback_months": business_metrics.payback_months,
            "operational_health_pct": business_metrics.operational_health_pct,
            "forecast_p10_monthly_savings_usd": business_metrics.forecast_p10_monthly_savings_usd,
            "forecast_p50_monthly_savings_usd": business_metrics.forecast_p50_monthly_savings_usd,
            "forecast_p90_monthly_savings_usd": business_metrics.forecast_p90_monthly_savings_usd,
            "baseline_monthly_savings_usd": 0.0 if not self.mode_manager.ai_enabled else business_metrics.monthly_savings_usd,
        }
        
        # Update factory aggregator for current factory (factory 1 for now, can be extended)
        current_factory_id = 1
        baseline_power = sum(self.baseline_readings) / len(self.baseline_readings) if self.baseline_readings else metrics.get("power_output", 0)
        self.factory_aggregator.update_factory(current_factory_id, business_metrics, baseline_power_kw=baseline_power)

        # 2. Collect baseline (when AI is off)
        if not self.mode_manager.ai_enabled:
            self.baseline_readings.append(power)
            if len(self.baseline_readings) > MAX_HISTORY:
                self.baseline_readings = self.baseline_readings[-MAX_HISTORY:]

        # 3. Decide valve
        decision = await self._decide(metrics)
        proposed_valve = decision.get("valve", current_valve)

        # 4. Safety enforcement
        safe_valve, safety_report = self.safety.check(metrics, proposed_valve)
        decision["valve"] = safe_valve
        self.last_safety = safety_report

        # 5. Anti-oscillation clamp
        delta = safe_valve - current_valve
        delta = max(-MAX_VALVE_CHANGE_PER_TICK, min(MAX_VALVE_CHANGE_PER_TICK, delta))
        final_valve = current_valve + delta
        final_valve = max(MIN_VALVE, min(MAX_VALVE, round(final_valve, 2)))
        decision["valve"] = final_valve

        # 6. Send control command (only when AI is active)
        if self.mode_manager.ai_enabled:
            await self._send_control(final_valve)
            self.ai_readings.append(power)
            if len(self.ai_readings) > MAX_HISTORY:
                self.ai_readings = self.ai_readings[-MAX_HISTORY:]

        # 7. Confidence tracking
        predicted = decision.get("predicted_power")
        conf = self.confidence.update(predicted, power) if predicted is not None else self.confidence.get_report().get("confidence", 0)
        decision["confidence"] = conf

        # Confidence-based auto-disable
        if (
            self.mode_manager.mode == "ACTIVE"
            and predicted is not None
            and not self.confidence.should_use_ai()
        ):
            self.mode_manager.enter_fallback("Low confidence")

        # Recovery cooldown
        if self.mode_manager.mode == "FALLBACK":
            self._recovery_cooldown += 1
            if self._recovery_cooldown >= 10:  # try every 10 ticks
                self._recovery_cooldown = 0
                if self.confidence.should_use_ai():
                    self.mode_manager.attempt_recovery()

        self.last_decision = decision

        if self.mode_manager.ai_enabled:
            self.ai_readings.append(power)
        else:
            self.baseline_readings.append(power)

        # 8. History
        entry = {
            "tick": self.tick_count,
            "timestamp": metrics.get("timestamp", time.time()),
            "temperature": metrics.get("temperature"),
            "pressure": metrics.get("pressure"),
            "flow_rate": metrics.get("flow_rate"),
            "valve_position": float(current_valve) if current_valve is not None else 0,
            "ai_valve": float(final_valve),
            "power_output": float(power) if power else 0,
            "turbine_rpm": metrics.get("turbine_rpm", 0),
            "efficiency_pct": metrics.get("efficiency_pct", 75.0),
            "mode": decision.get("mode", "idle"),
            "predicted_power": float(predicted) if predicted is not None else None,
            "confidence": float(conf) if conf is not None else 0,
            "safety_level": safety_report.get("level", "NORMAL"),
            "safety_overridden": safety_report.get("overridden", False),
            # ── NEW: Business metrics in history ──
            "revenue_usd": business_metrics.total_hourly_revenue_usd,
            "savings_usd": business_metrics.grid_cost_avoided_usd,
            "co2_avoided_tons": business_metrics.co2_avoided_tons,
            "monthly_savings_projection_usd": business_metrics.monthly_savings_usd,
        }
        self.history.append(entry)
        if len(self.history) > MAX_HISTORY:
            self.history = self.history[-MAX_HISTORY:]

        # 9. Log
        log_tick(self.tick_count, metrics, decision, safety_report)

        # ── NEW: Broadcast telemetry to WebSocket clients ──
        import asyncio
        # Schedule broadcast without blocking the tick
        asyncio.create_task(
            ws_manager.broadcast_telemetry_payload(
                metrics=self.last_metrics,
                business=self.last_business_metrics,
                ai_decision=self.last_decision,
                safety=self.last_safety,
                ai_mode=self.mode_manager.ai_enabled,
                confidence=self.confidence.get_report(),
                tick_count=self.tick_count,
            )
        )

    # ── Backend communication ────────────────

    async def _fetch_metrics(self) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(SIM_METRICS_URL)
                resp.raise_for_status()
                self.error_count = 0
                return resp.json()
        except Exception as e:
            self.error_count += 1
            if self.error_count > MAX_CONSECUTIVE_ERRORS:
                if self.mode_manager.mode == "ACTIVE":
                    self.mode_manager.enter_fallback(
                        f"Backend unreachable ({self.error_count} errors)"
                    )
            log.warning("Backend fetch error (%d): %s", self.error_count, e)
            return None

    async def _send_control(self, valve: float) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(
                    SIM_CONTROL_URL,
                    json={"valve_position": valve},
                )
                resp.raise_for_status()
                return True
        except Exception as e:
            log.warning("Control send error: %s", e)
            return False

    # ── AI decision ──────────────────────────

    async def _decide(self, metrics: dict) -> dict:
        """Get valve decision based on current mode."""
        if not self.mode_manager.ai_enabled:
            return {
                "valve": metrics.get("valve_position", 50),
                "mode": "idle",
                "predicted_power": None,
                "confidence": 0,
            }

        if self.mode_manager.mode == "FALLBACK":
            return {
                "valve": SAFE_VALVE_POSITION,
                "mode": "fallback",
                "predicted_power": None,
                "confidence": 0,
            }

        # ACTIVE — use AI bridge
        try:
            decision = get_ai_decision(metrics)
            return decision
        except Exception as e:
            log.error("AI decision error: %s", e)
            self.mode_manager.enter_fallback(f"AI error: {e}")
            return {
                "valve": SAFE_VALVE_POSITION,
                "mode": "fallback",
                "predicted_power": None,
                "confidence": 0,
            }

    # ── Comparison data ──────────────────────

    def get_comparison(self) -> dict:
        baseline_avg = (
            sum(self.baseline_readings) / len(self.baseline_readings)
            if self.baseline_readings else 0
        )
        ai_avg = (
            sum(self.ai_readings) / len(self.ai_readings)
            if self.ai_readings else 0
        )
        improvement = (
            (ai_avg - baseline_avg) / max(baseline_avg, 1) * 100
            if baseline_avg > 0 else 0
        )
        return {
            "baseline_avg_power": round(baseline_avg, 1),
            "ai_avg_power": round(ai_avg, 1),
            "improvement_pct": round(improvement, 1),
            "baseline_samples": len(self.baseline_readings),
            "ai_samples": len(self.ai_readings),
        }


# ═══════════════════════════════════════════════
#  Singleton
# ═══════════════════════════════════════════════
orchestrator = Orchestrator()


# ═══════════════════════════════════════════════
#  FastAPI Application
# ═══════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start orchestrator loop on server boot."""
    log.info("🚀 Orchestrator API starting on :%d", ORCHESTRATOR_PORT)
    task = asyncio.create_task(orchestrator.run())
    yield
    log.info("🛑 Shutting down orchestrator …")
    orchestrator.stop()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Entropy Engine — Orchestrator",
    description=(
        "Control orchestration layer. "
        "Bridges simulation ↔ AI ↔ frontend."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ───────────────────────────

class AIToggleRequest(BaseModel):
    enable: bool


# ── Endpoints ────────────────────────────────

@app.get("/api/state", summary="Full dashboard state", tags=["Dashboard"])
async def get_full_state():
    """
    Everything the frontend needs in a single call.
    Poll this every 1 second.
    """
    return {
        "metrics": orchestrator.last_metrics,
        "business": orchestrator.last_business_metrics,  # ── NEW: business metrics ──
        "ai_decision": orchestrator.last_decision,
        "ai_mode": orchestrator.mode_manager.ai_enabled,
        "ai_state": orchestrator.mode_manager.mode,
        "safety_level": orchestrator.last_safety.get("level", "NORMAL"),
        "safety_color": orchestrator.safety.get_safety_status(
            orchestrator.last_metrics
        ).get("color", "green") if orchestrator.last_metrics else "green",
        "confidence": orchestrator.confidence.get_report(),
        "uptime": round(time.time() - orchestrator.start_time, 1),
        "tick_count": orchestrator.tick_count,
    }


# ── Business / SaaS demo endpoints (NOW DERIVED FROM PHYSICS) ──


class FactorySummary(BaseModel):
    id: int
    name: str
    location: str
    efficiency_improvement_pct: float
    monthly_savings_usd: float
    monthly_revenue_usd: float
    total_savings_usd: float
    total_revenue_usd: float
    co2_avoided_tons: float
    roi_pct: float
    kwh_generated: float


class BusinessOverview(BaseModel):
    total_revenue_usd: float
    mrr_usd: float
    total_factories: int
    global_co2_tons: float
    total_energy_kwh: float


@app.get("/api/factories", summary="List factories", tags=["Business"])
async def list_factories(q: Optional[str] = None, status: Optional[str] = None):
    """Return list of factories with DERIVED business metrics."""
    items = orchestrator.factory_aggregator.get_factories_list()
    if q:
        items = [f for f in items if q.lower() in f["name"].lower() or q.lower() in f["location"].lower()]
    return items


@app.get("/api/factory/{factory_id}", summary="Factory detail", tags=["Business"])
async def get_factory(factory_id: int):
    """Return detailed factory metrics with DERIVED business impact."""
    factory = orchestrator.factory_aggregator.get_factory(factory_id)
    if not factory:
        return {"error": "factory not found"}

    # Get current operational metrics for this factory
    metrics = orchestrator.last_metrics
    if not metrics:
        metrics = {
            "power_output": 0,
            "efficiency_pct": 75.0,
            "temperature": 500,
            "pressure": 6.0,
        }

    baseline_power = orchestrator.get_comparison().get("baseline_avg_power", metrics.get("power_output", 0))
    optimized_power = metrics.get("power_output", baseline_power)
    energy_saved_kwh = max(0, (optimized_power - baseline_power) * 24 * 30)
    monthly_savings = factory["monthly_savings_usd"]
    monthly_revenue = factory["monthly_revenue_usd"]

    ai_insights = []
    if orchestrator.mode_manager.ai_enabled:
        ai_insights.append(f"Observed uplift vs baseline: {max(0.0, (optimized_power - baseline_power)):.1f} kW")
        ai_insights.append(f"Projected monthly savings (P50): ${orchestrator.last_business_metrics.get('forecast_p50_monthly_savings_usd', 0):.0f}")
        ai_insights.append(f"Forecast band P10-P90: ${orchestrator.last_business_metrics.get('forecast_p10_monthly_savings_usd', 0):.0f} to ${orchestrator.last_business_metrics.get('forecast_p90_monthly_savings_usd', 0):.0f}")
    else:
        ai_insights.append("Manual baseline mode active: realized AI savings are zero.")
        ai_insights.append(f"Potential monthly savings if AI enabled: ${orchestrator.last_business_metrics.get('potential_monthly_savings_usd', 0):.0f}")

    return {
        **factory,
        "baseline_power_kw": round(baseline_power, 1),
        "optimized_power_kw": round(optimized_power, 1),
        "energy_saved_kwh": int(energy_saved_kwh),
        "monthly_savings_usd": monthly_savings,
        "monthly_revenue_usd": monthly_revenue,
        "roi_pct": factory["roi_pct"],
        "current_efficiency_pct": metrics.get("efficiency_pct", 75.0),
        "current_temperature_c": metrics.get("temperature", 500),
        "current_pressure_bar": metrics.get("pressure", 6.0),
        "ai_insights": ai_insights,
    }


@app.get("/api/business/overview", summary="Business overview", tags=["Business"])
async def business_overview():
    """Return DERIVED aggregate revenue + sustainability metrics."""
    summary = orchestrator.factory_aggregator.get_summary()

    revenue_trend = []
    savings_trend = []
    monthly_buckets = {}
    for entry in orchestrator.history:
        ts = entry.get("timestamp", time.time())
        month_key = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m")
        bucket = monthly_buckets.setdefault(month_key, {"revenue": 0.0, "savings": 0.0, "samples": 0})
        bucket["revenue"] += entry.get("revenue_usd", 0.0)
        bucket["savings"] += entry.get("savings_usd", 0.0)
        bucket["samples"] += 1

    sorted_months = sorted(monthly_buckets.keys())
    for month in sorted_months[-12:]:
        item = monthly_buckets[month]
        factor = (3600.0 / CONTROL_INTERVAL) * 24.0 * 30.0
        # Convert per-tick realization to monthly equivalent using observed cadence.
        monthly_revenue = (item["revenue"] / max(1, item["samples"])) * factor
        monthly_savings = (item["savings"] / max(1, item["samples"])) * factor
        revenue_trend.append({"month": month, "value": round(monthly_revenue, 2)})
        savings_trend.append({"month": month, "value": round(monthly_savings, 2)})

    if not revenue_trend:
        current_month = datetime.date.today().strftime("%Y-%m")
        revenue_trend.append({"month": current_month, "value": round(summary["saas_revenue_monthly"], 2)})
        savings_trend.append({"month": current_month, "value": round(orchestrator.last_business_metrics.get("monthly_savings_usd", 0.0), 2)})
    
    return {
        "total_revenue_usd": summary["total_revenue_usd"],
        "mrr_usd": summary["saas_revenue_monthly"] + max(0.0, orchestrator.last_business_metrics.get("monthly_savings_usd", 0.0) * 0.2),
        "revenue_split": {
            "saas": summary["saas_revenue_monthly"],
            "performance": max(0.0, orchestrator.last_business_metrics.get("monthly_savings_usd", 0.0) * 0.2),
        },
        "total_factories": summary["total_factories"],
        "global_co2_tons": summary["total_co2_avoided_tons"],
        "total_energy_kwh": summary["total_kwh_generated"],
        "monthly_revenue": summary["saas_revenue_monthly"] + max(0.0, orchestrator.last_business_metrics.get("monthly_savings_usd", 0.0) * 0.2),
        "total_energy_saved_kwh": summary["total_kwh_generated"],
        "co2_reduced_tons": summary["total_co2_avoided_tons"],
        "forecast_p10_monthly_savings_usd": orchestrator.last_business_metrics.get("forecast_p10_monthly_savings_usd", 0.0),
        "forecast_p50_monthly_savings_usd": orchestrator.last_business_metrics.get("forecast_p50_monthly_savings_usd", 0.0),
        "forecast_p90_monthly_savings_usd": orchestrator.last_business_metrics.get("forecast_p90_monthly_savings_usd", 0.0),
        "revenue_trend": revenue_trend,
        "savings_trend": savings_trend,
    }


@app.get("/api/revenue", summary="Revenue time series", tags=["Business"])
async def revenue_timeseries(months: int = Query(default=12, ge=3, le=36)):
    """Return DERIVED monthly revenue timeseries."""
    now = datetime.date.today()
    data = []

    # Build realized monthly equivalent from observed history cadence.
    avg_tick_revenue = (
        sum(entry.get("revenue_usd", 0.0) for entry in orchestrator.history) / max(1, len(orchestrator.history))
        if orchestrator.history else 0.0
    )
    monthly_realized = avg_tick_revenue * (3600.0 / CONTROL_INTERVAL) * 24.0 * 30.0
    monthly_saas = len(orchestrator.factory_aggregator.factories) * orchestrator.business_calculator.assumptions.saas_monthly_fee_usd
    monthly_base = monthly_realized + monthly_saas

    # Derive trend from measured efficiency drift instead of fixed growth constants.
    eff = orchestrator.last_metrics.get("efficiency_pct", 75.0) if orchestrator.last_metrics else 75.0
    monthly_growth = max(-0.01, min(0.02, (eff - orchestrator.business_calculator.assumptions.baseline_efficiency_pct) / 1000.0))
    for i in range(months):
        month = (now - datetime.timedelta(days=30 * (months - i - 1))).strftime("%Y-%m")
        projected = monthly_base * ((1 + monthly_growth) ** i)
        data.append({"month": month, "revenue": round(projected, 2)})
    return data


@app.post("/api/ai/toggle", summary="Toggle AI control", tags=["AI"])
async def toggle_ai(body: AIToggleRequest):
    """Enable or disable AI optimization."""
    if body.enable:
        # Snapshot baseline before enabling
        if orchestrator.last_metrics:
            orchestrator.baseline_snapshot_power = orchestrator.last_metrics.get(
                "power_output", 0
            )
        orchestrator.mode_manager.enable_ai()
    else:
        orchestrator.mode_manager.disable_ai()

    # Keep the simulation backend's own auto-controller in sync with the orchestrator state.
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(SIM_AI_MODE_URL, params={"enabled": body.enable})
    except Exception as exc:  # noqa: BLE001
        log.warning("Failed to propagate AI mode to simulation backend: %s", exc)

    return {
        "ai_mode": orchestrator.mode_manager.ai_enabled,
        "state": orchestrator.mode_manager.mode,
    }


@app.get("/api/ai/status", summary="AI status details", tags=["AI"])
async def ai_status():
    """Detailed AI operational status."""
    return {
        **orchestrator.mode_manager.get_status(),
        "confidence": orchestrator.confidence.get_report(),
        "ai_loaded": is_ai_loaded(),
        "load_error": get_load_error(),
        "total_decisions": len(orchestrator.history),
    }


@app.get("/api/history", summary="Decision history", tags=["Dashboard"])
async def get_history(limit: int = Query(default=60, ge=1, le=300)):
    """Recent decision history for chart rendering."""
    return orchestrator.history[-limit:]


@app.get("/api/comparison", summary="Baseline vs AI", tags=["Dashboard"])
async def get_comparison():
    """Performance comparison between baseline and AI operation."""
    return orchestrator.get_comparison()


@app.get("/api/safety", summary="Safety statistics", tags=["Safety"])
async def get_safety_stats():
    """Safety override statistics and current status."""
    status = (
        orchestrator.safety.get_safety_status(orchestrator.last_metrics)
        if orchestrator.last_metrics
        else {"safety_level": "NORMAL", "color": "green",
              "pressure_headroom": 0, "temp_headroom": 0}
    )
    return {
        **status,
        "stats": orchestrator.safety.get_stats(),
    }


@app.get("/api/health", summary="Health check", tags=["System"])
async def health_check():
    """Liveness probe for orchestrator."""
    return {
        "orchestrator": "ok",
        "ai_loaded": is_ai_loaded(),
        "backend_connected": orchestrator.error_count == 0,
        "backend_errors": orchestrator.error_count,
        "uptime": round(time.time() - orchestrator.start_time, 1),
        "tick_count": orchestrator.tick_count,
        "ws_clients": ws_manager.get_client_count(),  # ── NEW: WebSocket client count ──
    }


# ── WebSocket endpoint for real-time telemetry ──
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming.
    
    Clients connect here to receive live operational + business metrics,
    AI decisions, and safety status every tick (~1 Hz).
    """
    await ws_manager.handle_connection(websocket)


# ── Direct execution ────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "orchestrator:app",
        host=ORCHESTRATOR_HOST,
        port=ORCHESTRATOR_PORT,
        reload=True,
    )
