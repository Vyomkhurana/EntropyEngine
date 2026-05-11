"""
Entropy Engine — Business Metrics Engine
=========================================
Converts operational telemetry into industrial financial metrics and forecasts.

This module avoids static showcase values by:
- Using configurable assumptions (env-driven)
- Tracking rolling realized performance
- Producing projection bands from observed variability
"""

from __future__ import annotations

import math
import os
import time
from collections import deque
from dataclasses import dataclass
from statistics import mean, pstdev


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class FinancialAssumptions:
    grid_electricity_cost_per_kwh: float = _env_float("GRID_ELECTRICITY_COST_PER_KWH", 0.12)
    recovered_electricity_price_per_kwh: float = _env_float("RECOVERED_ELECTRICITY_PRICE_PER_KWH", 0.10)
    co2_per_kwh_grid: float = _env_float("CO2_PER_KWH_GRID", 0.0007)
    co2_credit_value_per_ton: float = _env_float("CO2_CREDIT_VALUE_PER_TON", 15.0)
    investment_cost_usd: float = _env_float("INVESTMENT_COST_USD", 500000.0)
    monthly_maintenance_cost_usd: float = _env_float("MONTHLY_MAINTENANCE_COST_USD", 8000.0)
    saas_monthly_fee_usd: float = _env_float("SAAS_MONTHLY_FEE_USD", 10000.0)
    revenue_share_percent: float = _env_float("REVENUE_SHARE_PERCENT", 20.0)
    baseline_efficiency_pct: float = _env_float("BASELINE_EFFICIENCY_PCT", 76.0)
    projection_horizon_days: float = _env_float("PROJECTION_HORIZON_DAYS", 30.0)


@dataclass
class OperationalMetrics:
    power_output_kw: float
    efficiency_pct: float
    temperature_c: float
    pressure_bar: float
    turbine_rpm: float
    valve_position_pct: float
    heat_recovered_kwh: float
    energy_loss_pct: float
    co2_avoided_tons: float


@dataclass
class BusinessMetrics:
    power_generated_kw: float
    energy_generated_kwh: float
    revenue_from_power_usd: float
    revenue_from_co2_usd: float
    total_hourly_revenue_usd: float
    grid_cost_avoided_usd: float
    monthly_savings_usd: float
    annual_savings_usd: float
    potential_monthly_savings_usd: float
    co2_avoided_tons: float
    co2_value_usd: float
    efficiency_pct: float
    roi_pct: float
    payback_months: float
    operational_health_pct: float
    forecast_p10_monthly_savings_usd: float
    forecast_p50_monthly_savings_usd: float
    forecast_p90_monthly_savings_usd: float


@dataclass
class FactoryBusinessState:
    id: int
    name: str
    location: str
    baseline_power_kw: float = 0.0
    optimized_power_kw: float = 0.0
    total_kwh_generated: float = 0.0
    total_savings_usd: float = 0.0
    total_revenue_usd: float = 0.0
    total_co2_avoided_tons: float = 0.0
    month_kwh: float = 0.0
    month_savings_usd: float = 0.0
    month_revenue_usd: float = 0.0
    month_co2_avoided_tons: float = 0.0

    def get_efficiency_pct(self) -> float:
        if self.baseline_power_kw <= 0:
            return 0.0
        return ((self.optimized_power_kw - self.baseline_power_kw) / self.baseline_power_kw) * 100.0

    def get_roi_pct(self, assumptions: FinancialAssumptions) -> float:
        if assumptions.investment_cost_usd <= 0:
            return 0.0
        return (self.total_savings_usd / assumptions.investment_cost_usd) * 100.0

    def get_payback_months(self, assumptions: FinancialAssumptions) -> float:
        net = self.month_savings_usd - assumptions.monthly_maintenance_cost_usd
        if net <= 0:
            return 0.0
        return assumptions.investment_cost_usd / net

    def to_dict(self, assumptions: FinancialAssumptions) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "efficiency_improvement_pct": round(self.get_efficiency_pct(), 2),
            "monthly_savings_usd": round(self.month_savings_usd, 2),
            "monthly_revenue_usd": round(self.month_revenue_usd, 2),
            "total_savings_usd": round(self.total_savings_usd, 2),
            "total_revenue_usd": round(self.total_revenue_usd, 2),
            "co2_avoided_tons": round(self.total_co2_avoided_tons, 4),
            "roi_pct": round(self.get_roi_pct(assumptions), 2),
            "payback_months": round(self.get_payback_months(assumptions), 2),
            "kwh_generated": round(self.total_kwh_generated, 2),
        }


class BusinessCalculator:
    """Converts telemetry to realized and projected financial metrics."""

    def __init__(self, assumptions: FinancialAssumptions | None = None):
        self.assumptions = assumptions or FinancialAssumptions()
        self.cumulative_kwh: float = 0.0
        self.cumulative_revenue: float = 0.0
        self.cumulative_savings: float = 0.0

        # Rolling windows for projection quality.
        self._power_window: deque[float] = deque(maxlen=3600)   # ~1h @1Hz
        self._savings_window: deque[float] = deque(maxlen=3600)
        self._efficiency_window: deque[float] = deque(maxlen=3600)
        self._last_ts: float = time.time()

    def _projection_bands(self, monthly_base: float, rel_sigma: float) -> tuple[float, float, float]:
        sigma_abs = abs(monthly_base) * rel_sigma
        p10 = max(0.0, monthly_base - 1.2816 * sigma_abs)
        p50 = max(0.0, monthly_base)
        p90 = max(0.0, monthly_base + 1.2816 * sigma_abs)
        return p10, p50, p90

    def calculate(self, metrics: OperationalMetrics, dt_hours: float = 1.0 / 3600.0) -> BusinessMetrics:
        a = self.assumptions

        power_kw = max(0.0, metrics.power_output_kw)
        eff = max(0.0, min(100.0, metrics.efficiency_pct))
        energy_kwh = power_kw * dt_hours

        revenue_from_power = energy_kwh * a.recovered_electricity_price_per_kwh
        co2_avoided_period = max(0.0, energy_kwh * a.co2_per_kwh_grid)
        revenue_from_co2 = co2_avoided_period * a.co2_credit_value_per_ton
        total_revenue_period = revenue_from_power + revenue_from_co2

        grid_cost_avoided = energy_kwh * a.grid_electricity_cost_per_kwh
        self.cumulative_kwh += energy_kwh
        self.cumulative_revenue += total_revenue_period
        self.cumulative_savings += grid_cost_avoided

        self._power_window.append(power_kw)
        self._savings_window.append(grid_cost_avoided / max(dt_hours, 1e-9))  # USD/hour equivalent
        self._efficiency_window.append(eff)

        avg_hourly_savings = mean(self._savings_window) if self._savings_window else 0.0
        horizon_hours = max(1.0, 24.0 * a.projection_horizon_days)
        monthly_savings = avg_hourly_savings * horizon_hours / (a.projection_horizon_days / 30.0)
        annual_savings = monthly_savings * 12.0

        # Potential = efficiency gap opportunity scaled by observed savings intensity.
        eff_gain_pct = max(0.0, eff - a.baseline_efficiency_pct)
        potential_gain_pct = max(0.0, 92.0 - eff)
        savings_per_eff_point = monthly_savings / max(1.0, eff_gain_pct) if eff_gain_pct > 0 else monthly_savings / 8.0
        potential_monthly_savings = max(0.0, potential_gain_pct * savings_per_eff_point)

        net_monthly = max(0.0, monthly_savings - a.monthly_maintenance_cost_usd)
        roi_pct = (annual_savings / max(1.0, a.investment_cost_usd)) * 100.0
        payback_months = (a.investment_cost_usd / net_monthly) if net_monthly > 0 else 0.0

        # Forecast uncertainty from realized savings variability.
        if len(self._savings_window) > 5:
            sigma = pstdev(self._savings_window)
            rel_sigma = min(1.0, sigma / max(1e-6, avg_hourly_savings))
        else:
            rel_sigma = 0.25
        p10, p50, p90 = self._projection_bands(monthly_savings, rel_sigma)

        pressure_score = max(0.0, 100.0 - (abs(metrics.pressure_bar - 6.0) / 2.0) * 100.0)
        temp_score = max(0.0, 100.0 - (abs(metrics.temperature_c - 510.0) / 50.0) * 100.0)
        rpm_score = max(0.0, 100.0 - (abs(metrics.turbine_rpm - 4500.0) / 1000.0) * 100.0)
        operational_health = max(0.0, min(100.0, 0.4 * eff + 0.2 * pressure_score + 0.2 * temp_score + 0.2 * rpm_score))

        return BusinessMetrics(
            power_generated_kw=power_kw,
            energy_generated_kwh=energy_kwh,
            revenue_from_power_usd=revenue_from_power,
            revenue_from_co2_usd=revenue_from_co2,
            total_hourly_revenue_usd=total_revenue_period / max(dt_hours, 1e-9),
            grid_cost_avoided_usd=grid_cost_avoided,
            monthly_savings_usd=monthly_savings,
            annual_savings_usd=annual_savings,
            potential_monthly_savings_usd=potential_monthly_savings,
            co2_avoided_tons=max(0.0, metrics.co2_avoided_tons),
            co2_value_usd=max(0.0, metrics.co2_avoided_tons) * a.co2_credit_value_per_ton,
            efficiency_pct=eff,
            roi_pct=roi_pct,
            payback_months=payback_months,
            operational_health_pct=operational_health,
            forecast_p10_monthly_savings_usd=p10,
            forecast_p50_monthly_savings_usd=p50,
            forecast_p90_monthly_savings_usd=p90,
        )

    def get_summary(self) -> dict:
        return {
            "cumulative_kwh": round(self.cumulative_kwh, 2),
            "cumulative_revenue_usd": round(self.cumulative_revenue, 2),
            "cumulative_savings_usd": round(self.cumulative_savings, 2),
            "samples": len(self._power_window),
        }


class MultiFactoryAggregator:
    """Aggregates business metrics across factories."""

    def __init__(self, num_factories: int = 5, assumptions: FinancialAssumptions | None = None):
        self.assumptions = assumptions or FinancialAssumptions()
        names = ["Pune, IN", "Chennai, IN", "Bengaluru, IN", "Mumbai, IN", "Delhi, IN"]
        self.factories = {
            i: FactoryBusinessState(
                id=i,
                name=f"Plant {i}",
                location=names[(i - 1) % len(names)],
            )
            for i in range(1, num_factories + 1)
        }

    def update_factory(self, factory_id: int, metrics: BusinessMetrics, baseline_power_kw: float | None = None) -> None:
        factory = self.factories.get(factory_id)
        if factory is None:
            return

        if baseline_power_kw is not None:
            factory.baseline_power_kw = baseline_power_kw
        factory.optimized_power_kw = metrics.power_generated_kw
        factory.total_kwh_generated += metrics.energy_generated_kwh
        factory.total_savings_usd += metrics.grid_cost_avoided_usd
        factory.total_revenue_usd += metrics.total_hourly_revenue_usd / 3600.0
        factory.total_co2_avoided_tons = max(factory.total_co2_avoided_tons, metrics.co2_avoided_tons)
        factory.month_kwh += metrics.energy_generated_kwh
        factory.month_savings_usd = metrics.monthly_savings_usd
        factory.month_revenue_usd = (metrics.total_hourly_revenue_usd * 24.0 * 30.0)
        factory.month_co2_avoided_tons = metrics.co2_avoided_tons

    def get_summary(self) -> dict:
        f_list = list(self.factories.values())
        total_kwh = sum(f.total_kwh_generated for f in f_list)
        total_savings = sum(f.total_savings_usd for f in f_list)
        total_revenue = sum(f.total_revenue_usd for f in f_list)
        total_co2 = sum(f.total_co2_avoided_tons for f in f_list)

        saas_monthly = len(f_list) * self.assumptions.saas_monthly_fee_usd
        performance_revenue = total_savings * (self.assumptions.revenue_share_percent / 100.0)
        avg_monthly_savings = mean([f.month_savings_usd for f in f_list]) if f_list else 0.0
        avg_roi = mean([f.get_roi_pct(self.assumptions) for f in f_list]) if f_list else 0.0

        return {
            "total_factories": len(f_list),
            "total_kwh_generated": round(total_kwh, 2),
            "total_savings_usd": round(total_savings, 2),
            "total_revenue_usd": round(total_revenue, 2),
            "total_co2_avoided_tons": round(total_co2, 4),
            "saas_revenue_monthly": round(saas_monthly, 2),
            "performance_revenue_usd": round(performance_revenue, 2),
            "our_cut_usd": round(performance_revenue, 2),
            "avg_monthly_savings_per_factory": round(avg_monthly_savings, 2),
            "avg_roi_pct": round(avg_roi, 2),
        }

    def get_factories_list(self) -> list[dict]:
        return [f.to_dict(self.assumptions) for f in self.factories.values()]

    def get_factory(self, factory_id: int) -> dict | None:
        factory = self.factories.get(factory_id)
        if factory is None:
            return None
        return factory.to_dict(self.assumptions)
