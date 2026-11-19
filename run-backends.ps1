<#
.SYNOPSIS
    Runs both the Go API (:8080) and Python NLP sidecar (:5001) concurrently.
.EXAMPLE
    .\run-backends.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$OnWindows = $env:OS -eq "Windows_NT"
$VenvPath = if ($OnWindows) { "pipeline/.venv/Scripts/python.exe" } else { "pipeline/.venv/bin/python" }
$PythonExe = Join-Path $ScriptDir $VenvPath

if (-not (Test-Path $PythonExe)) {
    $PythonExe = if ($OnWindows) { "python" } else { "python3" }
}

& $PythonExe (Join-Path $ScriptDir "run_backends.py") @args
exit $LASTEXITCODE
