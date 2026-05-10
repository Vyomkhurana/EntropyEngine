"""
Entropy Engine — Business Metrics Engine
=========================================
Converts operational metrics (power, efficiency, energy) into business metrics
(revenue, savings, CO2, ROI) using deterministic formulas.

All business values are DERIVED from physics, not hardcoded.
"""

from __future__ import annotations
from dataclasses import dataclass
import logging

logger = logging.getLogger("entropy-engine")

# ═══════════════════════════════════════════════
#  Business Constants
# ═══════════════════════════════════════════════

# Grid electricity cost (USD per kWh) — realistic range 0.10-0.15
GRID_ELECTRICITY_COST_PER_KWH = 0.12

# Recovered electricity selling price (USD per kWh) — typically 80% of grid cost
RECOVERED_ELECTRICITY_PRICE_PER_KWH = 0.10

# CO2 emissions from grid electricity (metric tons per MWh = 0.0007 per kWh)
CO2_PER_KWH_GRID = 0.0007

# CO2 credit value (USD per metric ton) — typically 10-50
CO2_CREDIT_VALUE_PER_TON = 15.0

# Plant investment cost (USD) — baseline for ROI calculation
INVESTMENT_COST = 500000.0

# Monthly maintenance cost (USD) — baseline operations cost
MONTHLY_MAINTENANCE_COST = 8000.0

# SaaS subscription fee per factory (USD per month)
SAAS_MONTHLY_FEE = 10000.0

# Performance-based revenue share (% of savings) — our cut
REVENUE_SHARE_PERCENT = 20.0

# ═══════════════════════════════════════════════
#  Data Classes
# ═══════════════════════════════════════════════

@dataclass
class OperationalMetrics:
    """Snapshot of plant operational state."""
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
    """Derived business impact metrics."""
    # Energy metrics
    power_generated_kw: float
    energy_generated_kwh: float  # This hour/period
    
    # Revenue metrics
    revenue_from_power_usd: float  # Revenue from recovered electricity
    revenue_from_co2_usd: float    # Revenue from CO2 credits
    total_hourly_revenue_usd: float
    
    # Cost & savings
    grid_cost_avoided_usd: float   # What we saved by not buying from grid
    monthly_savings_usd: float     # Projected monthly
    annual_savings_usd: float      # Projected annual
    
    # CO2 metrics
    co2_avoided_tons: float
    co2_value_usd: float
    
    # Efficiency & ROI
    efficiency_pct: float
    roi_pct: float
    payback_months: float
    
    # Health metrics
    operational_health_pct: float  # 0-100 based on efficiency and safety
    

# ═══════════════════════════════════════════════
#  Business Calculations
# ═══════════════════════════════════════════════

class BusinessCalculator:
    """Converts operational metrics to business metrics."""

    def __init__(self):
        self.cumulative_kwh: float = 0.0
        self.cumulative_revenue: float = 0.0
        self.cumulative_savings: float = 0.0
        self.cumulative_co2: float = 0.0

    def calculate(self, metrics: OperationalMetrics, dt_hours: float = 1.0/3600.0) -> BusinessMetrics:
        """
        Convert operational metrics to business metrics.
        
        Args:
            metrics: Current operational state
            dt_hours: Time delta in hours (default: 1 second = 1/3600 hour)
        """
        
        # ─────────────────────────────────────────────────────────────
        # Energy Metrics
        # ─────────────────────────────────────────────────────────────
        energy_generated_kwh = metrics.power_output_kw * dt_hours
        self.cumulative_kwh += energy_generated_kwh

        # ─────────────────────────────────────────────────────────────
        # Revenue Metrics
        # ─────────────────────────────────────────────────────────────
        # Revenue from selling recovered electricity
        revenue_from_power = energy_generated_kwh * RECOVERED_ELECTRICITY_PRICE_PER_KWH
        
        # Revenue from CO2 credits (based on cumulative CO2 avoided)
        co2_avoided_this_period = metrics.co2_avoided_tons  # cumulative from engine
        revenue_from_co2 = co2_avoided_this_period * CO2_CREDIT_VALUE_PER_TON * (dt_hours / (30 * 24))  # normalize to time period
        
        total_hourly_revenue = revenue_from_power + revenue_from_co2
        self.cumulative_revenue += total_hourly_revenue

        # ─────────────────────────────────────────────────────────────
        # Cost & Savings Metrics
        # ─────────────────────────────────────────────────────────────
        # Grid cost we avoided by recovering this energy
        grid_cost_avoided = energy_generated_kwh * GRID_ELECTRICITY_COST_PER_KWH
        self.cumulative_savings += grid_cost_avoided
        
        # Project monthly and annual savings
        if self.cumulative_kwh > 0:
            avg_power = self.cumulative_kwh / max(0.001, dt_hours) / 1000.0  # kW
            monthly_savings = (avg_power * 24 * 30) * GRID_ELECTRICITY_COST_PER_KWH
            annual_savings = monthly_savings * 12
        else:
            monthly_savings = 0.0
            annual_savings = 0.0

        # ─────────────────────────────────────────────────────────────
        # CO2 Metrics
        # ─────────────────────────────────────────────────────────────
        # CO2 avoided is tracked by the engine (cumulative)
        co2_value = metrics.co2_avoided_tons * CO2_CREDIT_VALUE_PER_TON

        # ─────────────────────────────────────────────────────────────
        # Efficiency & ROI
        # ─────────────────────────────────────────────────────────────
        efficiency = metrics.efficiency_pct
        
        # ROI = (cumulative_savings / investment) * 100
        roi = 0.0
        payback_months = float('inf')
        if INVESTMENT_COST > 0:
            roi = (self.cumulative_savings / INVESTMENT_COST) * 100
            monthly_savings_net = monthly_savings - MONTHLY_MAINTENANCE_COST
            if monthly_savings_net > 0:
                payback_months = INVESTMENT_COST / monthly_savings_net

        # ─────────────────────────────────────────────────────────────
        # Operational Health Score
        # ─────────────────────────────────────────────────────────────
        # Health = Efficiency * Pressure_OK * Temperature_OK * RPM_OK
        # Penalties for being outside ideal ranges
        
        efficiency_score = efficiency  # 0-100
        
        # Pressure penalty (ideal: 5-7 bar)
        pressure_ideal = 6.0
        pressure_dev = abs(metrics.pressure_bar - pressure_ideal) / 2.0
        pressure_score = max(0, 100 - (pressure_dev * 100))
        
        # Temperature penalty (ideal: 500-520°C)
        temp_ideal = 510.0
        temp_dev = abs(metrics.temperature_c - temp_ideal) / 50.0
        temp_score = max(0, 100 - (temp_dev * 100))
        
        # RPM penalty (ideal: 4000-5000)
        rpm_ideal = 4500.0
        rpm_dev = abs(metrics.turbine_rpm - rpm_ideal) / 1000.0
        rpm_score = max(0, 100 - (rpm_dev * 100))
        
        # Combined score (weighted average)
        operational_health = (
            0.4 * efficiency_score +
            0.2 * pressure_score +
            0.2 * temp_score +
            0.2 * rpm_score
        )
        operational_health = max(0, min(100, operational_health))

        # ─────────────────────────────────────────────────────────────
        # Build and return result
        # ─────────────────────────────────────────────────────────────
        return BusinessMetrics(
            power_generated_kw=metrics.power_output_kw,
            energy_generated_kwh=energy_generated_kwh,
            revenue_from_power_usd=revenue_from_power,
            revenue_from_co2_usd=revenue_from_co2,
            total_hourly_revenue_usd=total_hourly_revenue,
            grid_cost_avoided_usd=grid_cost_avoided,
            monthly_savings_usd=monthly_savings,
            annual_savings_usd=annual_savings,
            co2_avoided_tons=metrics.co2_avoided_tons,
            co2_value_usd=co2_value,
            efficiency_pct=efficiency,
            roi_pct=roi,
            payback_months=payback_months,
            operational_health_pct=operational_health,
        )

    def get_summary(self) -> dict:
        """Return cumulative business summary."""
        return {
            "cumulative_kwh": round(self.cumulative_kwh, 2),
            "cumulative_revenue_usd": round(self.cumulative_revenue, 2),
            "cumulative_savings_usd": round(self.cumulative_savings, 2),
            "cumulative_co2_tons": round(self.cumulative_co2, 4),
        }


# ═══════════════════════════════════════════════
#  Factory Business Model
# ═══════════════════════════════════════════════

@dataclass
class FactoryBusinessState:
    """Business state for a single factory."""
    id: int
    name: str
    location: str
    
    # Baseline vs optimized tracking
    baseline_power_kw: float = 0.0
    optimized_power_kw: float = 0.0
    
    # Cumulative metrics
    total_kwh_generated: float = 0.0
    total_savings_usd: float = 0.0
    total_revenue_usd: float = 0.0
    total_co2_avoided_tons: float = 0.0
    
    # Current month tracking
    month_start_date: str = ""
    month_kwh: float = 0.0
    month_savings_usd: float = 0.0
    month_revenue_usd: float = 0.0
    month_co2_avoided_tons: float = 0.0
    
    def get_efficiency_pct(self) -> float:
        """Calculate efficiency improvement from optimization."""
        if self.baseline_power_kw <= 0:
            return 0.0
        return ((self.optimized_power_kw - self.baseline_power_kw) / self.baseline_power_kw) * 100

    def get_monthly_savings(self) -> float:
        """Project monthly savings from current rate."""
        return self.month_savings_usd

    def get_roi_pct(self) -> float:
        """Calculate ROI based on cumulative savings."""
        if INVESTMENT_COST <= 0:
            return 0.0
        return (self.total_savings_usd / INVESTMENT_COST) * 100

    def get_payback_months(self) -> float:
        """Calculate payback period in months."""
        monthly_avg = self.total_savings_usd / max(0.1, len(str(self.total_savings_usd)))  # rough estimate
        if monthly_avg <= 0:
            return float('inf')
        return INVESTMENT_COST / monthly_avg

    def to_dict(self) -> dict:
        """Convert to API response dict."""
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "efficiency_improvement_pct": round(self.get_efficiency_pct(), 1),
            "monthly_savings_usd": round(self.get_monthly_savings(), 2),
            "monthly_revenue_usd": round(self.month_revenue_usd, 2),
            "total_savings_usd": round(self.total_savings_usd, 2),
            "total_revenue_usd": round(self.total_revenue_usd, 2),
            "co2_avoided_tons": round(self.total_co2_avoided_tons, 4),
            "roi_pct": round(self.get_roi_pct(), 1),
            "kwh_generated": round(self.total_kwh_generated, 1),
        }


# ═══════════════════════════════════════════════
#  Multi-Factory Aggregator
# ═══════════════════════════════════════════════

class MultiFactoryAggregator:
    """Aggregates business metrics across multiple factories."""

    def __init__(self, num_factories: int = 5):
        self.factories = {
            i: FactoryBusinessState(
                id=i,
                name=f"Plant {i}",
                location=["Pune, IN", "Chennai, IN", "Bengaluru, IN", "Mumbai, IN", "Delhi, IN"][i % 5]
            )
            for i in range(1, num_factories + 1)
        }

    def update_factory(self, factory_id: int, metrics: BusinessMetrics) -> None:
        """Update business state for a factory."""
        if factory_id not in self.factories:
            return
        
        factory = self.factories[factory_id]
        factory.total_kwh_generated += metrics.energy_generated_kwh
        factory.total_savings_usd += metrics.grid_cost_avoided_usd
        factory.total_revenue_usd += metrics.total_hourly_revenue_usd
        factory.total_co2_avoided_tons += metrics.co2_avoided_tons
        factory.month_kwh += metrics.energy_generated_kwh
        factory.month_savings_usd += metrics.grid_cost_avoided_usd
        factory.month_revenue_usd += metrics.total_hourly_revenue_usd
        factory.month_co2_avoided_tons += metrics.co2_avoided_tons

    def get_summary(self) -> dict:
        """Return aggregated business summary across all factories."""
        total_kwh = sum(f.total_kwh_generated for f in self.factories.values())
        total_savings = sum(f.total_savings_usd for f in self.factories.values())
        total_revenue = sum(f.total_revenue_usd for f in self.factories.values())
        total_co2 = sum(f.total_co2_avoided_tons for f in self.factories.values())
        
        # Calculate aggregate metrics
        total_revenue_saas = len(self.factories) * SAAS_MONTHLY_FEE
        total_revenue_performance = sum(f.total_revenue_usd for f in self.factories.values())
        our_cut = total_savings * (REVENUE_SHARE_PERCENT / 100.0)
        
        avg_monthly_savings = total_savings / max(1, len(self.factories))
        avg_roi = (total_savings / (INVESTMENT_COST * len(self.factories))) * 100 if INVESTMENT_COST > 0 else 0

        return {
            "total_factories": len(self.factories),
            "total_kwh_generated": round(total_kwh, 2),
            "total_savings_usd": round(total_savings, 2),
            "total_revenue_usd": round(total_revenue, 2),
            "total_co2_avoided_tons": round(total_co2, 4),
            "saas_revenue_monthly": round(total_revenue_saas, 2),
            "performance_revenue_usd": round(total_revenue_performance, 2),
            "our_cut_usd": round(our_cut, 2),
            "avg_monthly_savings_per_factory": round(avg_savings_usd / len(self.factories), 2) if total_savings > 0 else 0,
            "avg_roi_pct": round(avg_roi, 1),
        }

    def get_factories_list(self) -> list:
        """Return list of all factories in API format."""
        return [f.to_dict() for f in self.factories.values()]

    def get_factory(self, factory_id: int) -> dict | None:
        """Get a single factory's state."""
        if factory_id not in self.factories:
            return None
        return self.factories[factory_id].to_dict()
