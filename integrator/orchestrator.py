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
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import random
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
        self.history: list[dict] = []

        self.baseline_readings: list[float] = []
        self.ai_readings: list[float] = []
        self.baseline_snapshot_power: float | None = None

        self.tick_count: int = 0
        self.error_count: int = 0
        self.start_time: float = time.time()

        self._running: bool = False
        self._recovery_cooldown: int = 0

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
        conf = self.confidence.update(predicted, power)
        decision["confidence"] = conf

        # Confidence-based auto-disable
        if (
            self.mode_manager.mode == "ACTIVE"
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
            "mode": decision.get("mode", "idle"),
            "predicted_power": float(predicted) if predicted is not None else None,
            "confidence": float(conf) if conf is not None else 0,
            "safety_level": safety_report.get("level", "NORMAL"),
            "safety_overridden": safety_report.get("overridden", False),
        }
        self.history.append(entry)
        if len(self.history) > MAX_HISTORY:
            self.history = self.history[-MAX_HISTORY:]

        # 9. Log
        log_tick(self.tick_count, metrics, decision, safety_report)

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


    # ── Business / SaaS demo endpoints (mock data for multi-factory) ──


    class FactorySummary(BaseModel):
        id: int
        name: str
        location: str
        status: str
        efficiency_pct: float
        co2_tons: float
        monthly_savings: float
        our_revenue: float


    class BusinessOverview(BaseModel):
        total_revenue: float
        mrr: float
        revenue_split: Dict[str, float]
        total_factories: int
        global_co2_tons: float
        total_energy_kwh: float


def _generate_mock_factories(n: int = 4):
    factories = []
    for i in range(1, n + 1):
        energy_saved = random.randint(8000, 60000)  # kWh/month
        cost_per_kwh = random.choice([6.0, 7.5, 8.5, 9.0])  # ₹/kWh
        savings = energy_saved * cost_per_kwh
        our_cut = round(0.2 * savings, 2)
        co2_tons = round(energy_saved * 0.0007, 2)  # ~0.7 kg CO2 per kWh
        efficiency = round(random.uniform(72.0, 95.0), 1)
        status = random.choice(["Active", "Warning", "Optimized"])
        factories.append(
            {
                "id": i,
                "name": f"Plant {i}",
                "location": random.choice(["Pune, IN", "Chennai, IN", "Bengaluru, IN", "Mumbai, IN"]),
                "status": status,
                "efficiency_pct": efficiency,
                "co2_tons": co2_tons,
                "monthly_savings": round(savings, 2),
                "our_revenue": our_cut,
            }
        )
    return factories


@app.get("/api/factories", summary="List factories", tags=["Business"])
async def list_factories(q: Optional[str] = None, status: Optional[str] = None):
    """Return a paginated list / search of mock factories for demo purposes."""
    items = _generate_mock_factories(5)
    if q:
        items = [f for f in items if q.lower() in f["name"].lower() or q.lower() in f["location"].lower()]
    if status:
        items = [f for f in items if f["status"].lower() == status.lower()]
    return items


@app.get("/api/factory/{factory_id}", summary="Factory detail", tags=["Business"])
async def get_factory(factory_id: int):
    """Return detailed mock info for a single factory (sustainability + revenue + AI insights)."""
    items = _generate_mock_factories(5)
    match = next((f for f in items if f["id"] == factory_id), None)
    if not match:
        return {"error": "factory not found"}

    # Mock ROI & AI insights
    baseline_power = random.uniform(220.0, 320.0)  # kW baseline
    optimized_power = baseline_power * (1 + random.uniform(0.05, 0.22))
    energy_saved_kwh = max(0, (optimized_power - baseline_power) * 24 * 30)  # monthly
    savings = match["monthly_savings"]
    our_cut = match["our_revenue"]
    roi = round((savings - 20000) / 20000 * 100, 1)  # mock: compare vs a notional investment

    insights = [
        "Valve optimization increased output by 12–20% over baseline",
        "Pressure occasionally nears threshold; safety override applied 3 times this month",
    ]

    return {
        **match,
        "baseline_power_kW": round(baseline_power, 1),
        "optimized_power_kW": round(optimized_power, 1),
        "energy_saved_kwh": int(energy_saved_kwh),
        "savings": savings,
        "our_cut": our_cut,
        "roi_pct": roi,
        "co2_reduction_tons": match["co2_tons"],
        "ai_insights": insights,
    }


@app.get("/api/business/overview", summary="Business overview", tags=["Business"])
async def business_overview():
    """Return aggregate revenue + sustainability metrics for the demo SaaS platform."""
    items = _generate_mock_factories(5)
    total_factories = len(items)
    total_energy = sum(f["monthly_savings"] / random.choice([6.0, 7.5, 8.5]) for f in items)
    total_co2 = sum(f["co2_tons"] for f in items)
    performance_rev = sum(f["our_revenue"] for f in items)
    saas_rev = total_factories * 10000  # mock fixed subscription ₹10k/month
    enterprise_rev = sum(random.choice([0, 50000, 150000]) for _ in items)
    total_revenue = round(performance_rev + saas_rev + enterprise_rev, 2)
    mrr = round(performance_rev + saas_rev, 2)

    revenue_trend = []
    savings_trend = []
    base_revenue = total_revenue * 0.72
    base_savings = total_energy * 0.8
    for i in range(12):
        month = (datetime.date.today() - datetime.timedelta(days=30 * (11 - i))).strftime("%Y-%m")
        base_revenue *= 1 + random.uniform(0.01, 0.08)
        base_savings *= 1 + random.uniform(0.00, 0.06)
        revenue_trend.append({"month": month, "value": round(base_revenue, 2)})
        savings_trend.append({"month": month, "value": round(base_savings, 2)})

    return {
        "total_revenue": total_revenue,
        "mrr": mrr,
        "revenue_split": {
            "performance_based": round(performance_rev, 2),
            "saaS": round(saas_rev, 2),
            "enterprise": round(enterprise_rev, 2),
        },
        "total_factories": total_factories,
        "global_co2_tons": round(total_co2, 2),
        "total_energy_kwh": int(total_energy),
        "monthly_revenue": round(mrr, 2),
        "total_energy_saved_kwh": int(total_energy),
        "co2_reduced_tons": round(total_co2, 2),
        "revenue_trend": revenue_trend,
        "savings_trend": savings_trend,
    }


@app.get("/api/revenue", summary="Revenue time series", tags=["Business"])
async def revenue_timeseries(months: int = Query(default=12, ge=3, le=36)):
    """Return mock monthly revenue timeseries for charting."""
    now = datetime.date.today()
    data = []
    base = 300000
    for i in range(months):
        month = (now - datetime.timedelta(days=30 * (months - i - 1))).strftime("%Y-%m")
        growth = base * (1 + random.uniform(-0.05, 0.12))
        base = growth
        data.append({"month": month, "revenue": round(growth, 2)})
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
    }


# ── Direct execution ────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "orchestrator:app",
        host=ORCHESTRATOR_HOST,
        port=ORCHESTRATOR_PORT,
        reload=True,
    )
