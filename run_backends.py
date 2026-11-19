"""Run the Go API (:8080) and Python NLP sidecar (:5001) on Windows or Linux."""

from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
PIPELINE_DIR = ROOT_DIR / "pipeline"
VENV_PYTHON = PIPELINE_DIR / ".venv" / (
    "Scripts/python.exe" if sys.platform == "win32" else "bin/python"
)
PYTHON_EXEC = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


def stream_output(pipe, prefix: str, color_code: str) -> None:
    try:
        for line in iter(pipe.readline, ""):
            print(f"{color_code}[{prefix}]\033[0m {line.rstrip()}", flush=True)
    finally:
        pipe.close()


def check_port(port: int) -> None:
    """Fail without terminating unrelated services occupying our ports."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(f"Port {port} is in use. Stop its service before starting the backends.")


def kill_proc(proc: subprocess.Popen) -> None:
    if sys.platform == "win32":
        if proc.poll() is None:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            proc.wait()
        return

    # go run spawns a compiled server. Stop the whole session, even if the
    # go wrapper has already exited, so its child cannot keep the port open.
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        pass
    finally:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()


def main() -> int:
    processes: list[subprocess.Popen] = []

    def interrupted(signum, frame):
        raise KeyboardInterrupt

    signals = [signal.SIGINT, signal.SIGTERM]
    if hasattr(signal, "SIGBREAK"):
        signals.append(signal.SIGBREAK)
    previous_handlers = {sig: signal.signal(sig, interrupted) for sig in signals}
    try:
        if shutil.which("go") is None:
            raise RuntimeError("Go is not on PATH. Install Go (see backend/go.mod) before starting.")
        check_port(8080)
        check_port(5001)

        env_python = os.environ.copy()
        paths = [str(PIPELINE_DIR / "src"), str(PIPELINE_DIR), str(ROOT_DIR)]
        if env_python.get("PYTHONPATH"):
            paths.append(env_python["PYTHONPATH"])
        env_python["PYTHONPATH"] = os.pathsep.join(paths)
        env_python["PYTHONUNBUFFERED"] = "1"

        print(f"[Runner] Starting services from {ROOT_DIR}", flush=True)
        print(f"[Runner] Python: {PYTHON_EXEC} (http://127.0.0.1:5001)", flush=True)
        print("[Runner] Go API: http://127.0.0.1:8080", flush=True)
        print("[Runner] Press Ctrl+C to stop both services.", flush=True)

        services = [
            ([PYTHON_EXEC, "-m", "uvicorn", "nlp_service:app", "--host", "127.0.0.1",
              "--port", "5001", "--app-dir", str(PIPELINE_DIR / "src")],
             ROOT_DIR, env_python, "Python:5001", "\033[35m"),
            (["go", "run", "./cmd/server"], BACKEND_DIR, None, "Go:8080", "\033[32m"),
        ]
        for command, cwd, env, name, color in services:
            proc = subprocess.Popen(
                command, cwd=cwd, env=env, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, text=True, bufsize=1,
                start_new_session=sys.platform != "win32",
            )
            processes.append(proc)
            threading.Thread(target=stream_output, args=(proc.stdout, name, color), daemon=True).start()

        while True:
            for proc, service in zip(processes, services):
                code = proc.poll()
                if code is not None:
                    print(f"[Runner] {service[3]} exited with code {code}.", flush=True)
                    return code if code > 0 else 1
            time.sleep(0.2)
    except KeyboardInterrupt:
        return 0
    except (OSError, RuntimeError) as exc:
        print(f"[Runner] {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        # Ignore repeated interrupts while cleaning up; cleanup runs only once.
        for sig in signals:
            signal.signal(sig, signal.SIG_IGN)
        if processes:
            print("[Runner] Stopping services...", flush=True)
        try:
            for proc in reversed(processes):
                kill_proc(proc)
        finally:
            for sig, handler in previous_handlers.items():
                signal.signal(sig, handler)


if __name__ == "__main__":
    sys.exit(main())
