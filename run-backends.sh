#!/usr/bin/env bash
# Run the Go API and Python NLP sidecar from any working directory.
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python_exe="$script_dir/pipeline/.venv/bin/python"

if [[ ! -x "$python_exe" ]]; then
    python_exe="python3"
fi

exec "$python_exe" "$script_dir/run_backends.py" "$@"
