# Linduistics

## Local startup on Linux

Install Python 3.11 or newer, Go matching `backend/go.mod`, Node.js and pnpm,
and Docker with the Compose plugin. Run these commands from the repository root.

Create a Linux virtual environment (a Windows `.venv` cannot be reused):

```bash
python3 -m venv pipeline/.venv
pipeline/.venv/bin/python -m pip install -r pipeline/requirements-nlp.txt
```

This installs the NLP sidecar dependencies. For dataset builds, use the full
environment described in [pipeline/README.md](pipeline/README.md).
The sidecar uses a blank spaCy pipeline when a language model is not installed;
install the corresponding spaCy models for full dependency parsing.

Copy `.env.example` to `.env` if you don't already have a local configuration,
and start PostgreSQL:

```bash
docker compose -f db/docker-compose.yml up -d
```

A new PostgreSQL volume is empty. Restore your existing database or publish a
verified dataset using the pipeline instructions before using the application.

Start both backends:

```bash
./run-backends.sh
```

The launcher works from any directory and prefers `pipeline/.venv/bin/python`,
falling back to `python3`. You can also run `python3 run_backends.py` directly.
The Go API runs on port 8080 and the NLP sidecar on port 5001.
Ctrl+C or SIGTERM stops both services and their child processes. If either
service exits, the runner stops the other and returns a failure status.
Occupied ports produce an error; stop the existing service and retry.

In a second terminal, start the frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`.

## Windows startup

Create the environment with `python -m venv pipeline/.venv`, then install the
sidecar dependencies with
`pipeline/.venv/Scripts/python.exe -m pip install -r pipeline/requirements-nlp.txt`.
Start the database and frontend as above, and run `.\run-backends.ps1` for the
backends. PowerShell on Linux also supports `./run-backends.ps1`.
