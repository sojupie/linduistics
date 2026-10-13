# E2-002: add dictionary evidence to meaning coverage

Fixed after inspecting E2-001 and before implementing or scoring this variant, 2026-10-03.

## Hypothesis

Bare translated headwords and sense-scoped translation links provide useful meaning evidence that dense gloss scores miss. Keeping this evidence separate from cosine will recover ordinary overlap without calling nearby concepts equivalent or asserting shared ancestry.

Keep E2-001's model, matrix, thresholds, weighting, display, ancestry field, and frozen reference mapping unchanged. Do not calibrate against reserved test families. Preserve the dense-only run and its failures.

## New evidence

1. Validate every existing English source-sense translation reference against the frozen English lemma data. Require matching entry and sense identities, usable modern source meaning, and a compatible modern grammatical class on both endpoints. When English is an endpoint, the referenced English word must be that endpoint. Do not accept generic-name or redirect/heading references as meanings.
2. Recognize a translated gloss that explicitly names the English endpoint in its leading lexical alternatives. Also recognize a shared English lexical alternative in two translated glosses. Strip only an initial article or infinitival “to”; split comma/semicolon alternatives and retain parenthetical qualifications. Reject headings and generic names. If both sides have different parenthetical qualifications, do not infer the same sense solely from their shared headword.
3. Word-level evidence establishes a possible shared current meaning, not which exact source sense matches. Record its scope and original references. If it recovers an otherwise unsupported overlap, label partial overlap, not exhaustive equivalence. Do not alter matrix cells or create invented sense-level correspondences.
4. Concrete same-form names can use a shared explicit lexical name plus a specific entity description when the other side supplies only a bare lexical alias. Generic given-name/surname descriptions remain insufficient. Record this as inferred identity with its available context, not proof that every homograph refers to the same entity.

## Evaluation

Evaluate all 207 open cases using the unchanged 197 scorable references and the same concept-positive check. Compare against the legacy control, dense-only E2-001, and always-partial predictor. Report paired family intervals for both nontrivial and trivial controls. Read every new incompatible prediction and every newly lost case, retaining disagreements with source translation evidence as conflicts rather than overriding the reference.

Use the frozen gain/loss gates and diagnostic controls. A gain over the legacy taxonomy alone is insufficient grounds for adoption when the trivial control performs similarly. Coverage must separately report actionable meaning labels, missing-modern-data warnings, unverified-name warnings, and legacy residual labels. A specific warning is useful information but does not count as resolved lexical meaning coverage.

Source edition gaps and unrecorded synonym equivalences remain failures to measure, not cases to drop. No data is published and no per-word exceptions are added.
