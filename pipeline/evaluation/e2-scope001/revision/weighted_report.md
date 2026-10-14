# Verification review results

Reviewer: Codex source-guided first review (agent).

50 sampled cases from 182 development cases.

Rates use sampling weights. Each dimension is separate. No automatic adoption decision.

| Dimension | Control supported | Variant supported | Change | Unresolved control / variant | No claim control / variant |
| --- | ---: | ---: | ---: | ---: | ---: |
| candidate | 0.0% | 0.0% | +0.0% | 0.0% / 0.0% | 100.0% / 100.0% |
| display | 49.3% | 49.3% | +0.0% | 1.2% / 1.2% | 0.0% / 0.0% |
| meaning | 84.2% | 87.0% | +2.9% | 0.0% / 0.0% | 9.6% / 9.6% |
| history | 0.0% | 0.0% | +0.0% | 0.0% / 0.0% | 100.0% / 100.0% |
| task | 0.0% | 0.0% | +0.0% | 0.0% / 0.0% | 100.0% / 100.0% |

## Paired changes and uncertainty

| Dimension | Change | Sampling standard error | Bounds if unresolved claims prove correct or wrong |
| --- | ---: | ---: | ---: |
| candidate | +0.0% | 0.0% | +0.0% to +0.0% |
| display | +0.0% | 0.0% | -1.2% to +1.2% |
| meaning | +2.9% | 2.6% | +2.9% to +2.9% |
| history | +0.0% | 0.0% | +0.0% to +0.0% |
| task | +0.0% | 0.0% | +0.0% to +0.0% |

## Strata (keep language pairs and changes visible)

| Stratum | Population | Sample | Weight |
| --- | ---: | ---: | ---: |
| da-de | 26 | 5 | 5.20 |
| da-en | 11 | 5 | 2.20 |
| da-nb | 6 | 5 | 1.20 |
| da-sv | 11 | 5 | 2.20 |
| de-en | 35 | 5 | 7.00 |
| de-nb | 27 | 5 | 5.40 |
| de-sv | 29 | 5 | 5.80 |
| en-nb | 12 | 5 | 2.40 |
| en-sv | 12 | 5 | 2.40 |
| nb-sv | 13 | 5 | 2.60 |

### da-de

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 3 / 2 / 0 / 0 | 3 / 2 / 0 / 0 |
| meaning | 2 / 1 / 0 / 2 | 3 / 0 / 0 / 2 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### da-en

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 2 / 2 / 1 / 0 | 2 / 2 / 1 / 0 |
| meaning | 5 / 0 / 0 / 0 | 5 / 0 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### da-nb

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 4 / 1 / 0 / 0 | 4 / 1 / 0 / 0 |
| meaning | 4 / 1 / 0 / 0 | 4 / 1 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### da-sv

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 4 / 1 / 0 / 0 | 4 / 1 / 0 / 0 |
| meaning | 5 / 0 / 0 / 0 | 5 / 0 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### de-en

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 2 / 3 / 0 / 0 | 2 / 3 / 0 / 0 |
| meaning | 4 / 0 / 0 / 1 | 4 / 0 / 0 / 1 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### de-nb

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 2 / 3 / 0 / 0 | 2 / 3 / 0 / 0 |
| meaning | 5 / 0 / 0 / 0 | 5 / 0 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### de-sv

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 2 / 3 / 0 / 0 | 2 / 3 / 0 / 0 |
| meaning | 5 / 0 / 0 / 0 | 5 / 0 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### en-nb

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 3 / 2 / 0 / 0 | 3 / 2 / 0 / 0 |
| meaning | 5 / 0 / 0 / 0 | 5 / 0 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### en-sv

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 2 / 3 / 0 / 0 | 2 / 3 / 0 / 0 |
| meaning | 4 / 1 / 0 / 0 | 4 / 1 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

### nb-sv

| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |
| --- | --- | --- |
| candidate | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| display | 3 / 2 / 0 / 0 | 3 / 2 / 0 / 0 |
| meaning | 4 / 1 / 0 / 0 | 4 / 1 / 0 / 0 |
| history | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |
| task | 0 / 0 / 0 / 5 | 0 / 0 / 0 / 5 |

Supported shares use the entire frozen frame as denominator, including absent claims.
A removed claim is not an incorrect claim. Inspect membership changes and eligibility separately.
The JSON records sampling standard errors and bounds for unresolved judgments.
Sampling error excludes reviewer error and is not proof of linguistic truth.

Decision: pending the independent benchmark, changed-case review and task checks in the protocol.
