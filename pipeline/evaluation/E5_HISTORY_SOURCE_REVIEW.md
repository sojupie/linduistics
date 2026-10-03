# E5 historical source review: scope and qualification failures

The first two review groups are complete: all 109 supported broader-sample cases
and all 15 supported concept cases whose IE-CoR expert sets differ. Each review
reads the selected definitions, recorded historical prose and recovered path
targets together. There are 507 other supported concept cases still to review.
These are source-guided agent judgments, not independent human annotations.

## What the review established

**A template on an entry is not necessarily a statement about that entry's word.**
English cloud's prose mentions Dutch wolk while discussing the displaced English
word welkin. The extractor attaches the cognate template to cloud, and the path
method reports an explicit cloud/wolk cognate statement. That edge is unsupported
by the prose. The cloud/wolk translation remains valid. This is a subject-scope
failure in the evidence layer, not a reason to discard the comparison.

Danish hin has a valid shared Old Norse hinn path with Icelandic hinn. Its prose
also compares a *phonologically distinct* Germanic pronoun jainaz. The broad
shared-source method mistakenly treats that comparison as another common source.
Rejecting that path must not erase the supported hinn path.

**Prose qualification is not fully preserved by structured claim flags.**
Dutch bird frater is described as likely onomatopoeic; Latin frater is only a
suggested alternative. The run nevertheless counts a shared Latin source with
German monk Frater as unqualified. Dutch jol is only possibly from Low German
jolle, and the deeper Indo-European derivation is also possible. Those recovered
paths need the source's qualifications. Structured `source_uncertain = false`
does not establish that the prose is certain.

Uncertainty also has a scope. English reed's further origin is uncertain, but
its shared West Germanic form with Dutch riet is supported. Rejecting all paths
from an entry merely because its deeper history is uncertain would discard
valid closer evidence. Similar distinctions occur for hop, owl, month and flesk.

**Shared sources can describe related formations rather than whole-word cognacy.**
Danish smal and Icelandic smali share the recorded small-adjective source, but
the latter developed through livestock and a shortened herdsman compound.
Icelandic hvað compared with who-type pronouns involves a neuter formation and
conflation. Norwegian være and Dutch noun wezen share a verb source, but the
Dutch noun is a substantivization. These histories support a family comparison;
they do not make the displayed words equivalent or validate every whole-word
family-game answer.

The broad component flag can also be too conservative. teugel/Zuegel,
handwerk/hantverk and gröftur/grøft have complete shared word forms as well as
suffix or component analyses. The existence of a formation claim somewhere on
an entry does not make every common ancestor component-only. Preserve each
path's own scope and the independently recorded complete-word statements.

**Different expert sets are not negative historical truth.**
The reviewed round, short, egg, root and bark comparisons include recorded
borrowings, shared loan sources, or common older forms despite different expert
sets. turn/draaien has a distant shared Indo-European root through different
formations. These findings do not change IE-CoR; they explain why its positive
concept cognacy can be used directly while its different-set cases cannot be
scored automatically as unrelated origins.

## Effect on the experiment decision

The original path counts remain unchanged. They measure recovered template
evidence, not verified historical precision. A supported path can coexist with
wrong displayed meanings, distinct entities, or a valid false-friend comparison.
For example, Ceres's goddess and neighborhood share a recorded name source but
are different entities; daufur/deaf-family comparisons share history while their
selected pallid and deaf meanings differ.

E3's evidence layer remains useful for exposing and reviewing history. This
review does **not** approve treating every unqualified recovered path as a
historical label or game answer. It also does not reject supported modern
inference merely because a structured path is missing.

Before testing an automatic historical promotion rule, record a separate plan
for claim-subject scope, prose qualification and path-specific formation scope.
Evaluate those changes across frozen samples, including valid close paths with
uncertain deep ancestry. Do not add word-specific exceptions for these examples.
Complete the remaining concept-source review and task-specific game checks as
part of E5 before its admission decision.

## Saved records and check

[All 124 case notes](e5-history-review002/CASES.md) preserve the specific source
judgment and its limits. The protocol hashes the original evidence packet and
notes, identifies every case, and records incomplete review status. Run
`pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e5_history_review.py
--output <new-directory>` to reproduce the attachment of these saved reviews.
The check verifies all 109 broader-sample and 15 different-set notes, unique
case identities and the original 631-case denominator. It verifies record
integrity, not independent linguistic truth. Run 002 adds an explicit frozen
packet-hash guard; its case notes and judgments match run 001 byte for byte.

No original meaning judgment, historical metric, practical classifier, reserved
case or live dataset changed.
