<#
.SYNOPSIS
    Runs both the Go API (:8080) and Python NLP sidecar (:5001) concurrently.
.EXAMPLE
    .\run-backends.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PythonExe = Join-Path $ScriptDir "pipeline\.venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

& $PythonExe (Join-Path $ScriptDir "run_backends.py") @args
