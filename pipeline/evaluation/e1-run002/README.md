# E1-002: incorrect frozen-row selection

The corrected translation eligibility exactly reconstructed all 1,201 rows selected by the runner. However, these were not always the rows selected by E0. The runner used the first row for a case-normalized undirected key. E0's canonical-direction audit retained the last row for that key.

The review summarizer required the saved 630/995 control count and failed. Inspection found 44 control-side display differences, including German capitalization collisions. E1-002 yielded 633 acceptable control cases instead of 630, so its changes cannot judge the intended experiment.

Decision: preserve this failed run and all 35 completed concept judgments. E1-003 selects the recorded E0 display pair and asserts exact control agreement before scoring. Reuse reviews only for an identical concept, language, word, and gloss. Parameters stay fixed. No baseline or published data changed.
