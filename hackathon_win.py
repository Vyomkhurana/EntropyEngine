#!/usr/bin/env python3
"""One-command launcher for Entropy Engine services on Windows.

Usage:
  python hackathon_win.py
  python hackathon_win.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass
class Service:
    name: str
    cwd: Path
    command: List[str]


def resolve_python(venv_dir: Path) -> str:
    candidate = venv_dir / "Scripts" / "python.exe"
    if candidate.exists():
        return str(candidate)
    return sys.executable


def resolve_npm() -> str:
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        raise FileNotFoundError("Could not find npm. Install Node.js or add npm to PATH.")
    return npm


def build_services(root: Path) -> List[Service]:
    backend_dir = root / "backend"
    integrator_dir = root / "integrator"
    frontend_dir = root / "frontend"

    backend_py = resolve_python(backend_dir / ".venv")
    integrator_py = resolve_python(integrator_dir / ".venv")
    npm = resolve_npm()

    return [
        Service(
            name="backend",
            cwd=backend_dir,
            command=[backend_py, "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"],
        ),
        Service(
            name="orchestrator",
            cwd=integrator_dir,
            command=[integrator_py, "-m", "uvicorn", "orchestrator:app", "--host", "0.0.0.0", "--port", "8001"],
        ),
        Service(
            name="frontend",
            cwd=frontend_dir,
            command=[npm, "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"],
        ),
    ]


def start_services(services: List[Service]) -> List[subprocess.Popen]:
    processes: List[subprocess.Popen] = []
    create_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0

    for svc in services:
        print(f"[start] {svc.name}: {' '.join(svc.command)}")
        proc = subprocess.Popen(
            svc.command,
            cwd=str(svc.cwd),
            creationflags=create_flags,
        )
        processes.append(proc)
        time.sleep(0.5)

    return processes


def stop_process(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return

    try:
        if os.name == "nt":
            os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
        else:
            proc.terminate()
    except Exception:
        proc.terminate()


def shutdown(processes: List[subprocess.Popen]) -> None:
    print("\n[stop] Shutting down all services...")
    for proc in reversed(processes):
        stop_process(proc)

    deadline = time.time() + 8
    for proc in reversed(processes):
        remaining = max(0.0, deadline - time.time())
        try:
            proc.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            proc.kill()

    print("[stop] All services stopped.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Launch all Entropy Engine services.")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without starting services.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parent

    try:
        services = build_services(root)
    except FileNotFoundError as exc:
        print(f"[error] {exc}")
        return 1

    if args.dry_run:
        print("[dry-run] Commands that will be executed:")
        for svc in services:
            print(f"  - {svc.name} @ {svc.cwd}: {' '.join(svc.command)}")
        return 0

    processes = start_services(services)

    print("\n[ready] Services are running:")
    print("  - Backend:      http://localhost:8000")
    print("  - Orchestrator: http://localhost:8001")
    print("  - Frontend:     http://localhost:3000")
    print("\nPress Ctrl+C to stop all services.")

    try:
        while True:
            for proc, svc in zip(processes, services):
                if proc.poll() is not None:
                    print(f"\n[warn] {svc.name} exited with code {proc.returncode}.")
                    raise KeyboardInterrupt
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(processes)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
