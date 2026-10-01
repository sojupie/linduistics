"""Concurrent runner for Linduistics backend services (Go API on :8080 and Python NLP sidecar on :5001)."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
PIPELINE_DIR = ROOT_DIR / "pipeline"

# Resolve python interpreter (prefer pipeline venv)
if sys.platform == "win32":
    VENV_PYTHON = PIPELINE_DIR / ".venv" / "Scripts" / "python.exe"
else:
    VENV_PYTHON = PIPELINE_DIR / ".venv" / "bin" / "python"

PYTHON_EXEC = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


def stream_output(pipe, prefix: str, color_code: str) -> None:
    reset_code = "\033[0m"
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            print(f"{color_code}[{prefix}]{reset_code} {line.rstrip()}", flush=True)
    except Exception:
        pass
    finally:
        pipe.close()


def free_port(port: int) -> None:
    """Detect and terminate any stale process listening on the specified port."""
    import socket

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return  # Port is free
    except Exception:
        return

    print(f"\033[1;33m[Runner]\033[0m Port {port} is currently in use. Terminating stale process...")
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                f"netstat -ano -p tcp | findstr :{port}",
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL,
            )
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and f":{port}" in parts[1] and parts[3].upper() == "LISTENING":
                    pid = parts[-1]
                    if pid and pid != "0":
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", pid],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                        print(f"\033[1;32m[Runner]\033[0m Terminated stale PID {pid} on port {port}.")
        except Exception as e:
            print(f"\033[1;31m[Runner]\033[0m Could not kill process on port {port}: {e}")
    else:
        try:
            subprocess.run(["fuser", "-k", f"{port}/tcp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    time.sleep(0.5)


def kill_proc(proc: subprocess.Popen, name: str) -> None:
    if proc.poll() is not None:
        return
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass
    else:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            proc.kill()


def main() -> int:
    print(f"\033[1;36m[Runner]\033[0m Starting Linduistics services from {ROOT_DIR}...")
    print(f"\033[1;36m[Runner]\033[0m Python: {PYTHON_EXEC} (NLP sidecar on http://127.0.0.1:5001)")
    print(f"\033[1;36m[Runner]\033[0m Go: go run ./cmd/server (API on http://127.0.0.1:8080)")
    print("\033[1;33m[Runner]\033[0m Press Ctrl+C to gracefully shut down both services.\n")

    # Ensure ports are clean before starting
    free_port(8080)
    free_port(5001)

    env_python = os.environ.copy()
    py_path = f"{PIPELINE_DIR / 'src'}{os.pathsep}{PIPELINE_DIR}{os.pathsep}{ROOT_DIR}"
    if "PYTHONPATH" in env_python:
        env_python["PYTHONPATH"] = f"{py_path}{os.pathsep}{env_python['PYTHONPATH']}"
    else:
        env_python["PYTHONPATH"] = py_path

    env_python["PYTHONUNBUFFERED"] = "1"

    # Start Python NLP Service on port 5001
    py_proc = subprocess.Popen(
        [
            PYTHON_EXEC,
            "-m",
            "uvicorn",
            "nlp_service:app",
            "--host",
            "127.0.0.1",
            "--port",
            "5001",
            "--app-dir",
            str(PIPELINE_DIR / "src"),
        ],
        cwd=str(ROOT_DIR),
        env=env_python,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Start Go Backend on port 8080
    go_proc = subprocess.Popen(
        ["go", "run", "./cmd/server"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    t_py = threading.Thread(
        target=stream_output,
        args=(py_proc.stdout, "Python:5001", "\033[35m"),
        daemon=True,
    )
    t_go = threading.Thread(
        target=stream_output,
        args=(go_proc.stdout, "Go:8080", "\033[32m"),
        daemon=True,
    )

    t_py.start()
    t_go.start()

    def shutdown(signum=None, frame=None):
        print("\n\033[1;31m[Runner]\033[0m Stopping services...", flush=True)
        kill_proc(go_proc, "Go")
        kill_proc(py_proc, "Python")
        time.sleep(0.3)
        free_port(8080)
        free_port(5001)
        print("\033[1;32m[Runner]\033[0m All backend services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            py_code = py_proc.poll()
            go_code = go_proc.poll()
            if py_code is not None:
                print(f"\033[1;31m[Runner]\033[0m Python NLP service exited with code {py_code}")
                shutdown()
            if go_code is not None:
                print(f"\033[1;31m[Runner]\033[0m Go backend service exited with code {go_code}")
                shutdown()
            time.sleep(0.5)
    except (KeyboardInterrupt, SystemExit):
        shutdown()

    return 0


if __name__ == "__main__":
    sys.exit(main())
