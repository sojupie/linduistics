# H1 adoption audit: what the result actually supports

Date: 2026-10-25. This is a post-result review by the same agent, prompted by the user. It is not an independent review or a fresh experiment. The original packets, judgments, scores and criterion remain intact.

## Decision

**Use the separation between a word’s introductory meanings and the senses that actually match. Do not install selector F unchanged as the default comparison display.** The benefit is real, but the selection rules have general defects that the headline metric failed to expose. A preview is a diagnostic, not the outcome the user needs. Waiting for the user or an external reviewer to find these defects is not the next engineering step.

I reread all 182 available original/proposed definition pairs, including unchanged rows, and traced the problematic selections through their full source inventories and the selector. All 57 changed pairs receive a concrete product assessment below. No word-specific correction or classifier change was applied.

## What was wrong with the previous assessment

The reserved concept measurement remains useful: ordinary animals, objects and physical meanings replace software, names, slang and figurative senses in many cases. This is a real improvement. The broad 76 → 87 figure measures plausible introductions considered separately. It does not establish 13 better comparisons and only two worse comparisons. For example, fire/kick and person/language passed the introductory-definition test while losing useful pair alignment. The binary reserved measure also hid remember/think and push/shoot worsening because those pairs already failed its acceptable threshold.

Source-gloss membership proves that the program selected an existing string. It does not establish that it chose the right entry, sense, frequency or relation. A build, replay or screenshot confirms implementation behavior, not linguistic quality. I should have made these judgments myself rather than presenting another review allocation as the remaining decision.

## General defects, evidence and concrete correction

| Defect | Observed consequence | Required correction |
| --- | --- | --- |
| One selection is asked to introduce both words and explain their relationship | afskedige/sparke loses fire/fire; varsel/förebud loses warning/omen; Wasser/tiss loses a valid secondary urine/pee match | Choose and retain matching sense pairs separately. Make independent word introductions supplementary; a comparison definition must still explain the comparison. |
| Earliest source sense is a hard filter before meaning is considered | English auxiliary do excludes perform/execute before similarity can compare them | Distinguish auxiliary/function uses from lexical uses. Keep multiple usable senses available to evidence-based matching; dictionary order must be a preference, not an irreversible filter. |
| Rich dictionary evidence is reduced to a grammatical-class set | `source_classes` uses the source meaning’s grammar but ignores the link’s candidate endpoint indices | Use supported endpoint candidates and their conflicts to rank matching senses. Preserve the distinction between an exact source identity and an inferred target association; do not turn either into fabricated certainty. |
| Matching broad grammatical classes outranks a meaningful cross-class relationship | Danish bowling spare wins over save when the counterpart is saver | Preserve derivational relationships with their correct labels. Noun/noun agreement is supporting evidence, not a veto on verb/person or noun/adjective relations. |
| The lexical-over-name filter acts on each endpoint in isolation | English Occitan language is discarded in a language/language comparison | Recognize entity kinds and grammatical roles jointly. Language, person and place must not become interchangeable merely because the source calls some of them names. |
| Usage tags are treated as reliable whole-definition exclusions | denken has think tagged rare together with intransitive/transitive variants, so remember wins | Preserve the reading-specific qualification. A mixed/flattened tag record should not suppress an otherwise ordinary basic meaning without examining the construction and neighboring definitions. |
| Missing identity can create an extra first-sense candidate | bag’s identity-less bodily-sac gloss survives beside the ordinary container entry and wins | Unknown source identity must not grant first-sense priority. Retain the sense, but apply a source-order fallback within its known lexical context rather than creating a preferred standalone entry. |
| Complete-looking source membership can conceal bad content | gallito still ends in or; desa/deß still shows an obsolete spelling redirect | Detect incomplete glosses and redirects as display defects. Select a complete substantive alternative when present, while retaining original source records. |
| Selected output is considered without the relation badge | A water/pee display can sit under Translation Equivalent | Attach the explanation and score to the senses that justify the claim. Do not put a word-level category over unrelated displayed definitions without showing the relevant match. |

These corrections address classes of failure. They do not require a water exception, a list of hand-picked preferred words, or dumping missing evidence into unclassified. The inherited translation evidence, lexical definitions, grammar, usage and embeddings all remain useful inputs; none should serve as an unquestionable single signal.

## Scope of this decision

External review can challenge these judgments, but it is not a prerequisite for fixing the explicit code faults above. The agent is responsible for the review and implementation. The 40-case allocation remains available; its status does not excuse stopping. Future measured claims still need fresh cases after changing the selector. That prevents claiming improvement by repeatedly tuning on H1; it does not prevent using H1 to diagnose and fix defects.

This audit changes the engineering recommendation, not H1’s historical measurements. The current database remains untouched. A production-ready improvement requires implementing these general selection corrections and checking whether its default comparison actually conveys the recorded relation.

## All changed comparisons

The assessments below judge the product consequence and retain mixed or uncertain effects. They are not a new numeric pass gate. The independent benchmark concept and a useful product default are different questions.

### Reserved

| Pair | Assessment | Reason |
| --- | --- | --- |
| da tåge → de Nebel | neutral | Mist/fog is a reasonable alternative, not a material correction. |
| da give → de geben | better | Give with transfer of ownership is clearer than present/put. |
| da hård → de hart | better | Physical hardness replaces harshness for the expected basic concept. |
| da flue → en fly | better | The insect replaces a fishing lure. |
| da hård → en hard | neutral | Both definitions adequately express physical hardness. |
| da aske → sv aska | better | Ash residue replaces the ash-removal action. |
| da leve → sv leva | better | Being alive replaces the narrower live-off construction. |
| da sten → sv sten | better | Stone replaces a personal-name homograph. |
| de tun → en do | worse | An auxiliary question marker replaces performing an action. |
| de riechen → en smell | better | Two smell actions replace an action/sense-noun mismatch. |
| de machen → en do | worse | English auxiliary do does not correspond to German making/doing. |
| de alt → en old | better | Long existence replaces former/previous. |
| de Baum → en tree | better | The woody plant replaces a storage object. |
| de Wurm → en worm | better | The animal replaces software. |
| de schwimmen → nb svømme | neutral | Removing the distance construction is harmless; both are ordinary swimming readings. |
| de Erde → nb jord | better | Soil/ground replaces the planet for the independently expected concept. |
| de denken → sv tänka | worse | Remember/remember was a valid secondary match. Remember/think loses that selected overlap and still fails the expected concept. |
| de Schlange → sv orm | better | The reptile replaces an insult. |
| de fallen → sv falla | better | Falling down replaces death in battle. |
| de sagen → sv säga | better | Direct say/utter is a clearer basic introduction than recipient-directed tell. |
| en man → nb mann | better | Adult male replaces the broader human-species definition. |
| en claw → nb klo | better | Digit claws replace arthropod pincers for the basic concept. |
| en old → sv gammal | better | Long existence replaces age measured by any specified duration. |
| en push → sv skjuta | worse | Shoot a weapon is not push. The original ejection reading was narrow but closer. The original binary suitable/unsuitable score hid this worsening. |
| en worm → sv mask | better | The animal replaces software. |
| en nail → sv nagel | neutral | The animal plate definition includes human nails. Less specific for the reference, but not a false ordinary definition; retain the more specific submeaning. |
| en play → sv leka | neutral | Both are normal recreational play readings. Child play is narrower, not automatically better. |
| en cold → sv kall | better | Low temperature replaces emotional coldness. |
| nb klo → sv klo | better | Digit claws replace pincers for the basic concept. |
| nb slange → sv orm | better | The reptile replaces an insult. |

### Broad

| Pair | Assessment | Reason |
| --- | --- | --- |
| da opfinde → de entwerfen | mixed | Sketch/draft is a valid introduction to entwerfen, but weakens the selected invent/devise overlap. The matching reading should remain primary in a comparison. |
| da robot → de roboten | not established | Historical feudal labor versus dated toil is not a demonstrated practical gain. Both need their usage context; removing a dated tag does not prove more useful current meaning. |
| da tosse → en loony | better | Simpleton fixes an actual verb/person mismatch. |
| da mandola → en manhole | better | Sewer access is a substantially better ordinary introduction than sexual slang. |
| da afskedige → nb sparke | worse | Fire/kick displaces the explicitly recorded fire/fire translation. |
| da forfine → nb forsinke | better | Delay is a better ordinary introduction than the specialized galvanize homograph. |
| da varsel → sv förebud | worse | A notice period displaces warning/omen in a harbinger comparison. |
| da spare → sv sparare | worse | The bowling noun displaces the relevant save/saver relation merely because both selected records can then be nouns. |
| da besvare → sv bespara | better | Spare someone something is a clearer ordinary reading than the source-tagged rare money reading. |
| de Provenzalisch → en occitan | worse | Language/person replaces related language readings. F removes the English language name before cross-word matching. |
| de RAM → en ram | better | Male sheep is a better introduction to lowercase ram than the battering tool; it remains a contrast with German RAM. |
| de Harz → en harm | neutral | Physical injury and its cause are both legitimate harm readings; neither matches resin. |
| de Tableau → en table | mixed | The definitions become more introductory individually, but chart/table meaning is no longer represented in front. A noun chart paired with an appropriate table noun should be considered instead of either current output. |
| de phrenisch → en phrenics | not established | The bare gloss phrenic cannot justify switching between mind and diaphragm meanings. This is not a proven correction. |
| de Information → nb opplysning | better | Information content is a clearer match than the act/state of informing. |
| de Wasser → nb tiss | mixed | Water is the ordinary German introduction, but urine/pee is the meaningful comparison. The two roles need different fields and labels; neither result alone replaces both. |
| de Baske → sv baskiska | worse | A language replaces a person reading despite an explicit source-supported person comparison. |
| en battir → nb batteri | not established | Bare battery is ambiguous. Removing the clear artillery qualification is not proof of a more helpful comparison with a village. |
| en gallito → nb gallion | still defective | The English bird gloss remains a dangling fragment. Improving the ship gloss does not make the pair ready. |
| en grogram → sv grogga | neutral | Both are substantive drink-related uses; neither matches the fabric. |
| en fill → sv filt | still defective | A carriage shaft replaces a textile sense. Both miss ordinary fill readings; a noun/noun preference is not sufficient entry selection. |
| en mard → sv mar | not established | Both sea readings are tagged rare; source order alone does not establish a practical preference. |
| en fraga → sv fradga | not established | A town replaces a surname with no evidence that the intended entity changed. Generic valid place/name definitions are not identity verification. |
| en karel → sv karl | better | Ordinary karl as a man replaces the capitalized given-name reading; no shared meaning with Karelian is asserted. |
| en milson → sv milsten | mixed | The concrete Swedish milestone is clearer, but the English village/suburb switch is not justified by entity identity or usage frequency. |
| nb fly → sv fly | better | Flee is a clearer ordinary Swedish introduction than figurative time passing; it remains distinct from Norwegian fly. |
| nb grei → sv grej | better | Generic thing is a better introduction than subjective liking; both Norwegian adjective readings remain legitimate. |

