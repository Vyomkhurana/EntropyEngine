"""
Entropy Engine — Physics Simulation Core
==========================================
Continuous 1 Hz loop that models a waste heat recovery plant.

Components modelled:
    Furnace → Heat Exchanger → Steam Drum → Turbine Generator

Physics (simplified thermodynamics):
    1. Heat decay:   dT/dt = -k * (T - T_ambient)
    2. Effective flow: F_eff = flow_rate * (valve_position / 100)
    3. Pressure:     P = c1 * T * F_eff
    4. Power output: W = η  * P * F_eff
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from typing import Dict

from config import (
    AMBIENT_TEMPERATURE,
    FLOW_DRIFT_MAGNITUDE,
    FURNACE_HEAT_RATE,
    HEAT_DECAY_CONSTANT,
    HEAT_SPIKE_MAGNITUDE,
    HEAT_SPIKE_PROBABILITY,
    INERTIA_FACTOR,
    INITIAL_FLOW_RATE,
    INITIAL_POWER_OUTPUT,
    INITIAL_PRESSURE,
    INITIAL_TEMPERATURE,
    INITIAL_VALVE_POSITION,
    LOG_INTERVAL,
    MAX_FLOW_RATE,
    MAX_POWER,
    MAX_PRESSURE,
    MAX_TEMPERATURE,
    MIN_FLOW_RATE,
    MIN_POWER,
    MIN_PRESSURE,
    MIN_TEMPERATURE,
    POWER_MULTIPLIER,
    PRESSURE_COEFFICIENT,
    SENSOR_NOISE_PERCENT,
    TICK_INTERVAL,
    TURBINE_EFFICIENCY,
    VALVE_RESPONSE_RATE,
)

logger = logging.getLogger("entropy-engine")


# ──────────────────────────────────────────────
# Utility
# ──────────────────────────────────────────────

def clamp(value: float, lo: float, hi: float) -> float:
    """Restrict *value* to the closed interval [lo, hi]."""
    return max(lo, min(hi, value))


def add_noise(value: float, noise_pct: float = SENSOR_NOISE_PERCENT) -> float:
    """Return *value* with uniform sensor noise applied."""
    return value * (1.0 + random.uniform(-noise_pct, noise_pct))


# ──────────────────────────────────────────────
# Simulation Engine
# ──────────────────────────────────────────────

class SimulationEngine:
    """
    Continuous physics loop for the waste heat recovery plant.

    Usage::

        engine = SimulationEngine()
        asyncio.create_task(engine.run())   # start in background
        state  = await engine.get_metrics() # read current state
        await engine.set_valve(75.0)        # send control command
    """

    def __init__(self) -> None:
        # ── True internal state (noise-free) ──
        self._temperature: float = INITIAL_TEMPERATURE
        self._flow_rate: float = INITIAL_FLOW_RATE
        self._pressure: float = INITIAL_PRESSURE
        self._valve_position: float = INITIAL_VALVE_POSITION
        self._power_output: float = INITIAL_POWER_OUTPUT

        # ── NEW: Derived operational metrics (interconnected) ──
        self._turbine_rpm: float = 0.0  # Depends on pressure and flow
        self._efficiency_pct: float = 75.0  # Depends on operating point
        self._heat_recovered_kwh: float = 0.0  # Cumulative heat captured
        self._energy_loss_pct: float = 25.0  # Deviation from theoretical max
        self._co2_avoided_tons: float = 0.0  # Cumulative CO2 reduction

        # ── Valve target (for inertia / delay) ──
        self._target_valve_position: float = INITIAL_VALVE_POSITION

        # ── Timing ──
        self._tick_count: int = 0
        self._start_time: float = time.time()
        self._running: bool = False

        # ── Concurrency ──
        self._lock: asyncio.Lock = asyncio.Lock()

        # ── AI auto-control mode ──
        self._ai_mode: bool = False

        # ── Public snapshot (with noise — served by API) ──
        self.current_state: Dict[str, float] = self._build_snapshot()

        logger.info(
            "Engine initialised | T=%.1f°C  P=%.1fbar  V=%.0f%%",
            self._temperature,
            self._pressure,
            self._valve_position,
        )

    # ──────────────────────────────────────────
    # Properties
    # ──────────────────────────────────────────

    @property
    def uptime(self) -> float:
        return time.time() - self._start_time

    @property
    def tick_count(self) -> int:
        return self._tick_count

    @property
    def ai_mode(self) -> bool:
        return self._ai_mode

    # ──────────────────────────────────────────
    # Main loop
    # ──────────────────────────────────────────

    async def run(self) -> None:
        """Start the infinite simulation loop (1 Hz)."""
        self._running = True
        logger.info("Simulation loop STARTED  (tick interval=%.1fs)", TICK_INTERVAL)

        while self._running:
            try:
                async with self._lock:
                    self._update_physics()
                    self._tick_count += 1

                    # Periodic console log
                    if self._tick_count % LOG_INTERVAL == 0:
                        self._log_state()

                    # Simple AI auto-control (rule-based placeholder)
                    if self._ai_mode:
                        self._auto_control()

                await asyncio.sleep(TICK_INTERVAL)

            except asyncio.CancelledError:
                logger.info("Simulation loop CANCELLED")
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("Simulation tick error: %s", exc, exc_info=True)
                await asyncio.sleep(TICK_INTERVAL)

    def stop(self) -> None:
        """Signal the loop to exit gracefully."""
        self._running = False
        logger.info("Simulation loop STOPPED  (ticks=%d)", self._tick_count)

    # ──────────────────────────────────────────
    # Physics update (called every tick)
    # ──────────────────────────────────────────

    def _update_physics(self) -> None:
        """
        Advance interconnected thermodynamic plant model by one time-step.
        
        All metrics causally depend on each other:
        - Temperature affects pressure
        - Pressure affects RPM
        - Flow + Valve affect all of the above
        - RPM + Pressure affect power output
        - Power affects efficiency and revenue
        """
        dt = TICK_INTERVAL

        # ─────────────────────────────────────────────────────────────
        # STEP 1: Valve position (with inertia)
        # ─────────────────────────────────────────────────────────────
        valve_delta = VALVE_RESPONSE_RATE * (
            self._target_valve_position - self._valve_position
        )
        new_valve = self._valve_position + valve_delta
        new_valve = clamp(new_valve, 0.0, 100.0)

        # ─────────────────────────────────────────────────────────────
        # STEP 2: Temperature dynamics (DETERMINISTIC)
        # ─────────────────────────────────────────────────────────────
        # Heat input from furnace
        furnace_heat = FURNACE_HEAT_RATE
        
        # Heat loss through walls (proportional to temperature difference)
        ambient_loss = HEAT_DECAY_CONSTANT * (self._temperature - AMBIENT_TEMPERATURE)
        
        # NEW: Cooling effect from flow (higher flow → more cooling)
        # Normalized flow effect: max cooling at max flow
        flow_normalized = self._flow_rate / MAX_FLOW_RATE
        cooling_effect = 45.0 * flow_normalized  # 0-45°C cooling effect
        
        # Temperature change (differential equation)
        dT = (furnace_heat - ambient_loss - cooling_effect) * dt
        new_temperature = self._temperature + dT

        # ─────────────────────────────────────────────────────────────
        # STEP 3: Flow rate (DETERMINISTIC, no random walk)
        # ─────────────────────────────────────────────────────────────
        # Flow is stable with minor variations, no random drift
        # Use proportional flow: 2-5 kg/s based on normal operation
        base_flow = 3.5  # kg/s nominal
        new_flow = base_flow * (1.0 + 0.05 * (new_valve / 100.0 - 0.5))  # ±5% variation
        new_flow = clamp(new_flow, MIN_FLOW_RATE, MAX_FLOW_RATE)

        # ─────────────────────────────────────────────────────────────
        # STEP 4: Pressure (INTERCONNECTED with Temperature & Flow)
        # ─────────────────────────────────────────────────────────────
        # Pressure = Thermal pressure (from temperature) + Dynamic pressure (from flow)
        # P_thermal = k1 * T (higher temp → higher pressure)
        # P_dynamic = k2 * flow^2 (higher flow → more dynamic pressure)
        
        k_thermal = 0.0125  # 1 bar per ~80°C
        k_dynamic = 0.15   # Dynamic pressure coefficient
        
        thermal_pressure = k_thermal * new_temperature
        dynamic_pressure = k_dynamic * (new_flow ** 1.8)  # nonlinear flow effect
        new_pressure = thermal_pressure + dynamic_pressure

        # ─────────────────────────────────────────────────────────────
        # STEP 5: Turbine RPM (INTERCONNECTED with Pressure & Flow)
        # ─────────────────────────────────────────────────────────────
        # RPM depends on pressure drop across turbine and flow rate
        # Higher pressure → higher RPM
        # Higher flow → higher RPM (up to a limit)
        
        min_rpm = 1000.0
        max_rpm = 5000.0
        rpm_from_pressure = (new_pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE)
        rpm_from_flow = (new_flow - MIN_FLOW_RATE) / (MAX_FLOW_RATE - MIN_FLOW_RATE)
        
        # Combined effect: 60% from pressure, 40% from flow
        rpm_factor = 0.6 * rpm_from_pressure + 0.4 * rpm_from_flow
        rpm_factor = clamp(rpm_factor, 0.0, 1.0)
        new_rpm = min_rpm + rpm_factor * (max_rpm - min_rpm)

        # ─────────────────────────────────────────────────────────────
        # STEP 6: Power Output (INTERCONNECTED with RPM, Pressure, Flow)
        # ─────────────────────────────────────────────────────────────
        # Power = TURBINE_EFFICIENCY * Pressure * Flow * RPM_factor
        # More realistic turbine model
        
        rpm_normalized = new_rpm / max_rpm
        base_power = POWER_MULTIPLIER * new_pressure * new_flow
        power_efficiency_factor = TURBINE_EFFICIENCY * rpm_normalized
        new_power = base_power * power_efficiency_factor

        # ─────────────────────────────────────────────────────────────
        # STEP 7: Efficiency (INTERCONNECTED with Valve Position)
        # ─────────────────────────────────────────────────────────────
        # Optimal valve position is ~70-80% for maximum efficiency
        # Deviation from optimal → efficiency loss
        
        optimal_valve = 75.0
        valve_deviation = abs(new_valve - optimal_valve) / 50.0  # normalized to 0-1
        max_efficiency = 92.0
        efficiency_loss = 25.0 * (valve_deviation ** 1.5)  # quadratic penalty
        new_efficiency = clamp(max_efficiency - efficiency_loss, 20.0, 92.0)

        # ─────────────────────────────────────────────────────────────
        # STEP 8: Heat Recovery (INTERCONNECTED with Temperature & Flow)
        # ─────────────────────────────────────────────────────────────
        # Q_recovered = specific_heat * flow * temperature * dt
        # Cumulative metric
        
        specific_heat = 4.18  # kJ/kg·K (steam/water property)
        heat_recovered_this_tick = (specific_heat * new_flow * new_temperature * dt) / 3600.0  # kWh
        self._heat_recovered_kwh += heat_recovered_this_tick

        # ─────────────────────────────────────────────────────────────
        # STEP 9: Energy Loss Percentage
        # ─────────────────────────────────────────────────────────────
        # Energy loss = 100% - Efficiency %
        new_energy_loss = 100.0 - new_efficiency

        # ─────────────────────────────────────────────────────────────
        # STEP 10: CO2 Avoided (INTERCONNECTED with Power Output)
        # ─────────────────────────────────────────────────────────────
        # CO2 = power_output_kwh * 0.0007 tons_CO2/kWh (grid average)
        # Cumulative metric
        
        co2_coefficient = 0.0007  # tons CO2 per kWh
        power_kwh_this_tick = (new_power * dt) / 3600.0  # kWh
        co2_avoided_this_tick = power_kwh_this_tick * co2_coefficient
        self._co2_avoided_tons += co2_avoided_this_tick

        # ─────────────────────────────────────────────────────────────
        # STEP 11: Inertia smoothing (exponential moving average)
        # ─────────────────────────────────────────────────────────────
        # Apply inertia to temperature, pressure, flow, power (not valve—it has its own inertia)
        self._temperature = (
            INERTIA_FACTOR * self._temperature
            + (1 - INERTIA_FACTOR) * new_temperature
        )
        self._flow_rate = (
            INERTIA_FACTOR * self._flow_rate
            + (1 - INERTIA_FACTOR) * new_flow
        )
        self._pressure = (
            INERTIA_FACTOR * self._pressure
            + (1 - INERTIA_FACTOR) * new_pressure
        )
        self._power_output = (
            INERTIA_FACTOR * self._power_output
            + (1 - INERTIA_FACTOR) * new_power
        )
        self._valve_position = new_valve
        self._turbine_rpm = (
            INERTIA_FACTOR * self._turbine_rpm
            + (1 - INERTIA_FACTOR) * new_rpm
        )
        self._efficiency_pct = new_efficiency

        # ─────────────────────────────────────────────────────────────
        # STEP 12: Safety clamps (hard limits)
        # ─────────────────────────────────────────────────────────────
        self._temperature = clamp(self._temperature, MIN_TEMPERATURE, MAX_TEMPERATURE)
        self._flow_rate = clamp(self._flow_rate, MIN_FLOW_RATE, MAX_FLOW_RATE)
        self._pressure = clamp(self._pressure, MIN_PRESSURE, MAX_PRESSURE)
        self._power_output = clamp(self._power_output, MIN_POWER, MAX_POWER)
        self._turbine_rpm = clamp(self._turbine_rpm, 0.0, 5500.0)
        self._efficiency_pct = clamp(self._efficiency_pct, 20.0, 95.0)

        if self._pressure > MAX_PRESSURE * 0.95:
            logger.warning(
                "⚠️  Pressure high: %.2f/%.1f bar  (%.1f%% of max)",
                self._pressure,
                MAX_PRESSURE,
                (self._pressure / MAX_PRESSURE) * 100,
            )

        # ─────────────────────────────────────────────────────────────
        # STEP 13: Build noisy public snapshot (apply sensor noise)
        # ─────────────────────────────────────────────────────────────
        self.current_state = self._build_snapshot()

    # ──────────────────────────────────────────
    # Snapshot builder
    # ──────────────────────────────────────────

    def _build_snapshot(self) -> Dict[str, float]:
        """Return a sensor-reading dict with noise applied and clamped."""
        return {
            "temperature": round(
                clamp(add_noise(self._temperature), MIN_TEMPERATURE, MAX_TEMPERATURE), 2
            ),
            "pressure": round(
                clamp(add_noise(self._pressure), MIN_PRESSURE, MAX_PRESSURE), 2
            ),
            "flow_rate": round(
                clamp(add_noise(self._flow_rate), MIN_FLOW_RATE, MAX_FLOW_RATE), 2
            ),
            "valve_position": round(
                clamp(self._valve_position, 0.0, 100.0), 2
            ),
            "power_output": round(
                clamp(add_noise(self._power_output), MIN_POWER, MAX_POWER), 2
            ),
            # ── NEW: Derived operational metrics (also with noise) ──
            "turbine_rpm": round(
                clamp(add_noise(self._turbine_rpm), 0.0, 5500.0), 1
            ),
            "efficiency_pct": round(
                clamp(add_noise(self._efficiency_pct, SENSOR_NOISE_PERCENT * 0.5), 20.0, 95.0), 1
            ),
            "heat_recovered_kwh": round(self._heat_recovered_kwh, 2),
            "energy_loss_pct": round(100.0 - self._efficiency_pct, 1),
            "co2_avoided_tons": round(self._co2_avoided_tons, 4),
            "timestamp": round(time.time(), 3),
        }

    # ──────────────────────────────────────────
    # Control interface (called by API)
    # ──────────────────────────────────────────

    async def set_valve(self, position: float) -> None:
        """Set the *target* valve position.  Actual movement is gradual."""
        async with self._lock:
            old = self._target_valve_position
            self._target_valve_position = clamp(position, 0.0, 100.0)
            logger.info(
                "Valve target changed: %.1f%% → %.1f%%",
                old,
                self._target_valve_position,
            )

    async def get_metrics(self) -> Dict[str, float]:
        """Return the latest noisy sensor snapshot (thread-safe copy)."""
        async with self._lock:
            return dict(self.current_state)

    async def set_ai_mode(self, enabled: bool) -> None:
        """Toggle the built-in rule-based auto-controller."""
        async with self._lock:
            self._ai_mode = enabled
            logger.info("AI auto-control mode: %s", "ON" if enabled else "OFF")

    # ──────────────────────────────────────────
    # Rule-based AI placeholder
    # ──────────────────────────────────────────

    def _auto_control(self) -> None:
        """Rule-based optimizer — drives the plant toward a higher-yield operating band."""
        target_valve = 75.0

        # Safety-aware corrections: back off if pressure/temperature rise too much.
        if self._pressure > 7.4:
            target_valve -= min(18.0, (self._pressure - 7.4) * 14.0)
        if self._temperature > 560:
            target_valve -= min(12.0, (self._temperature - 560) * 0.10)

        # If efficiency is low, bias more aggressively toward the optimal operating band.
        if self._efficiency_pct < 82:
            target_valve += min(8.0, (82.0 - self._efficiency_pct) * 0.8)

        # If the plant is underperforming, open the valve slightly to increase throughput.
        if self._power_output < 210:
            target_valve += 4.0

        self._target_valve_position = clamp(target_valve, 20.0, 88.0)

    # ──────────────────────────────────────────
    # Logging
    # ──────────────────────────────────────────

    def _log_state(self) -> None:
        """Print a concise state summary to the console."""
        logger.info(
            "Tick %5d | T=%6.1f°C  P=%5.2fbar  F=%4.2fkg/s  V=%5.1f%%  W=%6.1fkW",
            self._tick_count,
            self._temperature,
            self._pressure,
            self._flow_rate,
            self._valve_position,
            self._power_output,
        )
