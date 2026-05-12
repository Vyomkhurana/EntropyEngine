"""
Entropy Engine — AI Bridge
============================
Connects the orchestrator to Person 2's trained PINN + MPC controller.
Provides a clean interface that the orchestrator calls without
needing to know AI internals.

Also provides a heuristic fallback when MPC is unavailable.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

from config import AI_MODEL_PATH, MAX_VALVE_CHANGE_PER_TICK, MIN_VALVE, MAX_VALVE
from logger import log_ai


def _to_python(val):
    """Convert numpy scalars to native Python types for JSON serialisation."""
    if isinstance(val, (np.floating, np.integer)):
        return float(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    return val


def _sanitize(d: dict) -> dict:
    """Recursively convert numpy types inside a dict."""
    return {k: _to_python(v) for k, v in d.items()}

# ── Path to AI module — added lazily to avoid import collisions ──
AI_DIR = Path(__file__).resolve().parent.parent / "ai"

_mpc = None
_mpc_load_error: str | None = None


def _load_mpc():
    """Lazy-load the MPC controller from Person 2's checkpoint."""
    global _mpc, _mpc_load_error
    if _mpc is not None:
        return _mpc
    try:
        # Add AI dir to path so Python can find mpc_controller, model, etc.
        ai_dir_str = str(AI_DIR)
        if ai_dir_str not in sys.path:
            sys.path.insert(0, ai_dir_str)

        from mpc_controller import ModelPredictiveController

        model_path = AI_MODEL_PATH
        _mpc = ModelPredictiveController.from_checkpoint(model_path)
        log_ai.info("✅ MPC loaded from %s", model_path)
        return _mpc
    except Exception as e:
        _mpc_load_error = str(e)
        log_ai.error("❌ Failed to load MPC: %s", e)
        return None


def get_ai_decision(metrics: dict) -> dict:
    """
    Get AI's optimal valve decision for the current plant state.

    Returns:
        {
            "valve":            float,  # recommended valve position
            "predicted_power":  float | None,
            "confidence":       float,
            "mode":             str,    # "mpc" | "heuristic"
            "fallback":         bool,
        }
    """
    mpc = _load_mpc()

    if mpc is None:
        # MPC unavailable — use heuristic
        valve = _heuristic_fallback(metrics)
        current_power = metrics.get("power_output", 0.0)
        predicted_power = max(0.0, current_power + (valve - metrics.get("valve_position", 50)) * 1.5)
        return _sanitize({
            "valve": valve,
            "predicted_power": predicted_power,
            "confidence": 0.55,
            "mode": "heuristic",
            "fallback": True,
        })

    try:
        result = mpc.find_optimal_valve(metrics)

        if result.get("fallback", False):
            # MPC low confidence — use heuristic
            valve = _heuristic_fallback(metrics)
            current_power = metrics.get("power_output", 0.0)
            predicted_power = max(0.0, current_power + (valve - metrics.get("valve_position", 50)) * 1.5)
            return _sanitize({
                "valve": valve,
                "predicted_power": predicted_power,
                "confidence": max(result.get("confidence", 0), 0.55),
                "mode": "hybrid→heuristic",
                "fallback": True,
            })

        return _sanitize({
            "valve": result["optimal_valve"],
            "predicted_power": result.get("predicted_power"),
            "confidence": result.get("confidence", 0),
            "mode": "mpc",
            "fallback": False,
        })

    except Exception as e:
        log_ai.error("MPC error during decision: %s", e)
        valve = _heuristic_fallback(metrics)
        current_power = metrics.get("power_output", 0.0)
        predicted_power = max(0.0, current_power + (valve - metrics.get("valve_position", 50)) * 1.5)
        return _sanitize({
            "valve": valve,
            "predicted_power": predicted_power,
            "confidence": 0.55,
            "mode": "heuristic",
            "fallback": True,
        })


def is_ai_loaded() -> bool:
    """Check whether the MPC model is loaded."""
    return _mpc is not None


def get_load_error() -> str | None:
    """Return the last MPC load error, if any."""
    return _mpc_load_error


def _heuristic_fallback(metrics: dict) -> float:
    """
    Enhanced rule-based valve controller with predictive optimization.
    Uses physics-based heuristics to maximize power output and efficiency.
    """
    temp = metrics.get("temperature", 500)
    pressure = metrics.get("pressure", 5)
    current_valve = metrics.get("valve_position", 50)
    efficiency = metrics.get("efficiency_pct", 75)
    rpm = metrics.get("turbine_rpm", 3000)
    flow_rate = metrics.get("flow_rate", 3.0)
    
    # ─────────────────────────────────────────────────────────────
    # STEP 1: Safety constraints (hard limits)
    # ─────────────────────────────────────────────────────────────
    valve = current_valve
    
    # Pressure safety: max 8.5 bar
    if pressure > 8.3:
        valve -= 8.0  # Emergency: close valve
    elif pressure > 8.0:
        valve -= 5.0
    elif pressure > 7.5:
        valve -= 2.0
    
    # Temperature safety: max 590°C
    elif temp > 585:
        valve -= 8.0  # Emergency close
    elif temp > 570:
        valve -= 4.0
    elif temp > 550:
        valve -= 1.0
    
    # RPM safety: max 5200 RPM
    elif rpm > 5100:
        valve -= 3.0
    
    # ─────────────────────────────────────────────────────────────
    # STEP 2: Efficiency optimization (away from safety limits)
    # ─────────────────────────────────────────────────────────────
    # Optimal operating point is around 75% valve opening
    # (creates balance between flow and pressure)
    
    optimal_valve = 75.0
    valve_deviation = abs(current_valve - optimal_valve)
    
    if valve_deviation > 10.0:
        # We're far from optimal: move toward optimal
        if current_valve < optimal_valve:
            valve += 2.0  # Open valve to increase flow and efficiency
        else:
            valve -= 2.0  # Close valve to increase pressure and efficiency
    
    # ─────────────────────────────────────────────────────────────
    # STEP 3: Temperature-based fine-tuning
    # ─────────────────────────────────────────────────────────────
    # Target temperature: 510-520°C (sweet spot for efficiency)
    
    if temp < 480:
        valve += 3.0  # Open valve to increase temperature
    elif temp < 500:
        valve += 1.5
    elif temp > 540:
        valve -= 1.5
    elif temp > 560:
        valve -= 3.0
    
    # ─────────────────────────────────────────────────────────────
    # STEP 4: Pressure-based optimization
    # ─────────────────────────────────────────────────────────────
    # Target pressure: 6.0-6.5 bar (sweet spot for power generation)
    
    if pressure < 5.5:
        valve += 2.0  # Open to increase pressure
    elif pressure < 6.0:
        valve += 1.0
    elif pressure > 7.0:
        valve -= 1.0
    elif pressure > 7.5:
        valve -= 2.0
    
    # ─────────────────────────────────────────────────────────────
    # STEP 5: Flow rate optimization
    # ─────────────────────────────────────────────────────────────
    # Higher flow = more power (up to a limit)
    # Optimal flow: 3.5-4.0 kg/s
    
    if flow_rate < 3.0:
        valve += 1.5  # Increase flow
    elif flow_rate < 3.5:
        valve += 0.5
    elif flow_rate > 4.5:
        valve -= 1.5  # Decrease flow (getting too high)
    
    # ─────────────────────────────────────────────────────────────
    # STEP 6: Anti-oscillation and clamping
    # ─────────────────────────────────────────────────────────────
    delta = valve - current_valve
    delta = max(-MAX_VALVE_CHANGE_PER_TICK, min(MAX_VALVE_CHANGE_PER_TICK, delta))
    valve = current_valve + delta
    valve = max(MIN_VALVE, min(MAX_VALVE, round(valve, 2)))

    return valve
