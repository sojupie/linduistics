"""Attach saved manual source notes to the frozen E5 historical cases."""
import argparse
import json
from pathlib import Path

from e0 import OUTPUT, digest, save_json


def record(destination):
    source = OUTPUT / 'e5-history001'
    cases = json.loads((source / 'source_review_candidates.json').read_text(encoding='utf-8'))
    notes_path = source / 'source_review_notes.json'
    notes = json.loads(notes_path.read_text(encoding='utf-8'))
    assert digest(source / 'source_review_candidates.json') == notes['source_packet_sha256']
    groups = {
        'open_notes_in_packet_order': [c for c in cases if c['panel'] == 'open'],
        'different_expert_set_notes_in_packet_order': [c for c in cases
                                                    if c.get('history_reference') == 'different_expert_sets'],
    }
    judgments = []
    for name, members in groups.items():
        assert len(members) == len(notes[name]), (name, len(members), len(notes[name]))
        for case, note in zip(members, notes[name], strict=True):
            assert note.strip()
            judgments.append(dict(pair=case['pair'], case_id=case['case_id'], panel=case['panel'],
                word_a=case['row']['word_a'], word_b=case['row']['word_b'],
                display_decision=case.get('display_decision'),
                history_reference=case.get('history_reference'),
                selected_entry_scope=case['source_scopes']['selected_entries'],
                source_note=note))
    identities = {(j['pair'], j['case_id']) for j in judgments}
    assert len(identities) == len(judgments) == 124
    assert len(cases) == 631
    destination.mkdir(exist_ok=False)
    save_json(destination / 'judgments.json', dict(reviewer=notes['reviewer'], scope=notes['scope'],
        source_review_complete=False, supported_cases=len(cases), reviewed_cases=len(judgments),
        pending_cases=len(cases) - len(judgments), judgments=judgments))
    save_json(destination / 'protocol.json', dict(
        code_sha256=digest(Path(__file__)),
        input_sha256={name: digest(source / name) for name in
                      ['source_review_candidates.json', 'source_review_notes.json', 'protocol.json', 'metrics.json']},
        review_basis='Recorded source prose, selected definitions, and recovered path targets read together.',
        independence='Agent source review, not independent human historical truth.',
        production_changes=False, reserved_cases_used=False))
    text = ['# E5 historical source review: first completed groups', '', notes['scope'], '',
            '124/631 supported cases reviewed; 507 remain. This is not a completed historical validation.', '',
            '## Case notes', '']
    for j in judgments:
        text += [f"### {j['pair']} — {j['word_a']} / {j['word_b']}", '',
                 f"Case: `{j['case_id']}`. Panel: {j['panel']}.", '', j['source_note'], '']
    (destination / 'CASES.md').write_text('\n'.join(text), encoding='utf-8')
    print(f'Recorded {len(judgments)} source reviews; {len(cases) - len(judgments)} supported cases pending.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-history-review001')
    record(parser.parse_args().output)
