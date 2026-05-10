"""
Entropy Engine — Pydantic Data Models
======================================
Request / response schemas shared between the API and simulation engine.
"""

from pydantic import BaseModel, Field


class PlantMetrics(BaseModel):
    """Snapshot of every sensor in the plant — returned by GET /metrics."""

    temperature: float = Field(
        ..., ge=400, le=600, description="Exhaust gas temperature (°C)"
    )
    pressure: float = Field(
        ..., ge=0, le=10, description="Steam drum pressure (bar)"
    )
    flow_rate: float = Field(
        ..., ge=0, le=10, description="Gas mass flow rate (kg/s)"
    )
    valve_position: float = Field(
        ..., ge=0, le=100, description="Control valve opening (%)"
    )
    power_output: float = Field(
        ..., ge=0, le=500, description="Turbine electrical output (kW)"
    )
    # ── NEW: Derived operational metrics ──
    turbine_rpm: float = Field(
        default=0, ge=0, le=5500, description="Turbine speed (RPM)"
    )
    efficiency_pct: float = Field(
        default=75.0, ge=20, le=95, description="Operating efficiency (%)"
    )
    heat_recovered_kwh: float = Field(
        default=0, description="Cumulative heat recovered (kWh)"
    )
    energy_loss_pct: float = Field(
        default=25.0, ge=5, le=80, description="Energy loss (%)"
    )
    co2_avoided_tons: float = Field(
        default=0, description="Cumulative CO2 avoided (metric tons)"
    )
    timestamp: float = Field(
        ..., description="Unix epoch timestamp of this reading"
    )


class ControlInput(BaseModel):
    """Control command — received by POST /control."""

    valve_position: float = Field(
        ..., ge=0, le=100, description="Target valve opening (%)"
    )


class SystemStatus(BaseModel):
    """Operational health info — returned by GET /status."""

    status: str = Field(..., description="running | stopped | error")
    uptime_seconds: float = Field(..., description="Seconds since engine start")
    tick_count: int = Field(..., description="Number of physics ticks completed")
    ai_mode: bool = Field(..., description="Whether auto-control AI is active")
