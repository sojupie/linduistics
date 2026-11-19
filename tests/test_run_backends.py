"""Exercise the Linux launcher lifecycle without Go, NLP packages, or a database."""

import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipIf(sys.platform == "win32", "Linux process-group integration tests")
class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="linduistics startup ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "backend").mkdir()
        (self.root / "pipeline/src").mkdir(parents=True)
        (self.root / "tools").mkdir()
        for name in ("run_backends.py", "run-backends.sh"):
            shutil.copy2(ROOT / name, self.root / name)
        # Both stand-ins spawn a child that holds a TCP port, just as go run
        # spawns the compiled server. Cleanup must reach those grandchildren.
        self.fake = '''import os, subprocess, sys, time
port = int(sys.argv[1]) if len(sys.argv) == 2 else 5001
if os.environ.get("FAIL_NLP") and port == 5001:
    sys.exit(7)
child = subprocess.Popen([sys.executable, "-c", "import socket,time; s=socket.socket(); s.bind(('127.0.0.1'," + str(port) + ")); s.listen(); time.sleep(60)"])
print("READY", port, flush=True)
time.sleep(60)
'''
        (self.root / "pipeline/src/uvicorn.py").write_text(self.fake)
        go = self.root / "tools/go"
        go.write_text(f"#!{sys.executable}\n" + self.fake.replace('port = int(sys.argv[1]) if len(sys.argv) == 2 else 5001', 'port = 8080'))
        go.chmod(0o755)
        self.env = os.environ.copy()
        self.env["PATH"] = str(self.root / "tools") + os.pathsep + self.env["PATH"]
        self.env.pop("FAIL_NLP", None)

    def start(self):
        proc = subprocess.Popen(
            [str(self.root / "run-backends.sh")], cwd="/tmp", env=self.env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        self.addCleanup(self.stop, proc)
        return proc

    @staticmethod
    def stop(proc):
        if proc.poll() is None:
            proc.terminate()
        proc.communicate(timeout=15)

    @staticmethod
    def listening(port):
        with socket.socket() as sock:
            sock.settimeout(0.1)
            return sock.connect_ex(("127.0.0.1", port)) == 0

    def wait_for_services(self, proc):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if all(self.listening(port) for port in (5001, 8080)):
                return
            if proc.poll() is not None:
                self.fail(proc.communicate()[0])
            time.sleep(0.05)
        self.fail("Stand-in services did not start")

    def test_signal_stops_entire_process_trees(self):
        for sig in (signal.SIGTERM, signal.SIGINT):
            with self.subTest(signal=sig):
                proc = self.start()
                self.wait_for_services(proc)
                proc.send_signal(sig)
                output, _ = proc.communicate(timeout=15)
                self.assertEqual(proc.returncode, 0, output)
                self.assertEqual(output.count("Stopping services"), 1, output)
                for port in (5001, 8080):
                    self.assertFalse(self.listening(port), output)

    def test_failed_service_stops_other_service_and_returns_failure(self):
        self.env["FAIL_NLP"] = "1"
        proc = self.start()
        output, _ = proc.communicate(timeout=15)
        self.assertEqual(proc.returncode, 7, output)
        self.assertFalse(self.listening(8080), output)

    def test_occupied_port_is_preserved(self):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 8080))
            sock.listen()
            proc = self.start()
            output, _ = proc.communicate(timeout=10)
            self.assertEqual(proc.returncode, 1, output)
            self.assertIn("Port 8080 is in use", output)
            self.assertTrue(self.listening(8080))
            self.assertFalse(self.listening(5001))

    def test_missing_go_reports_actionable_error(self):
        (self.root / "tools/go").unlink()
        python = self.root / "tools/python3"
        python.symlink_to(sys.executable)
        (self.root / "tools/bash").symlink_to(shutil.which("bash"))
        (self.root / "tools/dirname").symlink_to(shutil.which("dirname"))
        self.env["PATH"] = str(self.root / "tools")
        proc = self.start()
        output, _ = proc.communicate(timeout=10)
        self.assertEqual(proc.returncode, 1, output)
        self.assertIn("Go is not on PATH", output)

    def test_launcher_prefers_linux_virtual_environment(self):
        venv_bin = self.root / "pipeline/.venv/bin"
        venv_bin.mkdir(parents=True)
        python = venv_bin / "python"
        python.write_text('#!/bin/sh\nprintf "VENV selected\\n"\n')
        python.chmod(0o755)
        proc = self.start()
        output, _ = proc.communicate(timeout=10)
        self.assertEqual(proc.returncode, 0, output)
        self.assertEqual(output, "VENV selected\n")


if __name__ == "__main__":
    unittest.main()
