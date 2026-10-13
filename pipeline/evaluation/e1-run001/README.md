# E1-001: invalid control reconstruction

The run scored 1,202 development cases but omitted saved ambiguous-source candidate identities from translation eligibility. Reconstructed control displays differed from the baseline for 32 of 1,201 undirected comparisons. Inspection traced large differences to incorrectly excluded same-gloss parent senses, rather than a new display preference.

Decision: do not use this run to judge A or B. Preserve its protocol, outputs, and review packet. E1-002 corrects eligibility to honor `source_identity_candidates`, then reruns the same fixed parameters and cases. No database or baseline data changed.
