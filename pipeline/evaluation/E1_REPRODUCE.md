# Reproduce E1-003

Use the committed E1 selection and review code. The local baseline and cached pinned model must be present. These commands create a new output directory and never alter a saved run or the database.

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/src/sense_display.py
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e1.py --output pipeline/evaluation/e1-reproduction --run-id E1-reproduction
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e1_review.py prepare-open --run pipeline/evaluation/e1-reproduction

$savedRun = 'pipeline/evaluation/e1-run003'
$newRun = 'pipeline/evaluation/e1-reproduction'
foreach ($packet in @('concept_review_packet.json', 'open_review_packet.json')) {
    $oldHash = (Get-FileHash -LiteralPath (Join-Path $savedRun $packet) -Algorithm SHA256).Hash
    $newHash = (Get-FileHash -LiteralPath (Join-Path $newRun $packet) -Algorithm SHA256).Hash
    if ($oldHash -ne $newHash) { throw "Review packet differs: $packet. Do not reuse judgments by review number." }
}
Copy-Item -LiteralPath (Join-Path $savedRun 'concept_review.json') -Destination (Join-Path $newRun 'concept_review.json')
Copy-Item -LiteralPath (Join-Path $savedRun 'open_review.json') -Destination (Join-Path $newRun 'open_review.json')
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e1_review.py summarize --run pipeline/evaluation/e1-reproduction
.\pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e1_review.py summarize-open --run pipeline/evaluation/e1-reproduction
```

Expected concept counts: control 630, A 630, B 652, out of 995. B's gain is 2.211 percentage points; paired family interval 1.356–3.197. Shared open headlines: 96/207 in every arm. The scorer must reconstruct every original control display, and the summarizer must verify all 1,201 original comparison records.

Exact packet matching permits replaying the earlier judgments; it does not provide a new independent review. If packets differ, save a new blinded review and record why the output changed. Do not overwrite the saved judgments or tune parameters until this run passes.
