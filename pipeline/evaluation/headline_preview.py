"""Export the fixed H1 sample and one labeled development diagnostic for a local UI."""
import json
from pathlib import Path
import pyarrow.parquet as pq
from e0 import DATASET, ROOT, digest, save_json
from verification import read

RUN = ROOT / 'pipeline/evaluation/headline-confirmation002'
OUT = ROOT / 'frontend/src/routes/preview/headline-data.json'


def export():
    rows = {r['row_index']: r for r in read(RUN / 'rows.json')}
    predictions = read(RUN / 'predictions.json')
    items = []
    for case in read(RUN / 'sample.json')['cases']:
        if case['row_index'] is None:
            r = case['reference']
            items.append({'key': case['id'], 'panel': case['panel'], 'label': f"{r['lang_a']} {r['word_a']} → {r['lang_b']} {r['word_b']}", 'missing': True})
            continue
        row = rows[case['row_index']]
        items.append(make_item(case['id'], case['panel'], row, predictions[str(case['row_index'])]))
    diagnostic = next(r for r in read(ROOT / 'pipeline/evaluation/e1-headline007/cases.json')
                      if r['word_a'] == 'Wasser' and r['word_b'] == 'water')
    source = pq.read_table(DATASET, filters=[('lang_a', '=', 'de'), ('word_a', '=', 'Wasser'), ('lang_b', '=', 'en'), ('word_b', '=', 'water')]).to_pylist()
    source = next(r for r in source if [r['def_a'], r['def_b']] == diagnostic['displays']['control'])
    items.insert(0, make_item('diagnostic:water', 'development diagnostic', source,
                             {'indices': diagnostic['headline_indices'], 'display': diagnostic['displays']['F']}))
    assert len(items) == 201 and len({r['key'] for r in items}) == 201
    OUT.parent.mkdir(exist_ok=True)
    save_json(OUT, items)
    save_json(RUN / 'preview_manifest.json', {'output': str(OUT.relative_to(ROOT)), 'sha256': digest(OUT),
        'cases': len(items), 'found': sum(not r.get('missing') for r in items),
        'source': 'frozen baseline and H1 sample; water is a previously exposed development diagnostic',
        'database_ids': False, 'meaning_labels_unchanged': True})


def make_item(key, panel, row, prediction):
    pair = {'id': 0, 'catalogId': key, 'category': row['category'], 'rawCategory': row['category'],
            'etymologicalRelation': row['etymological_relation'], 'sensesA': [], 'sensesB': []}
    for side in 'ab':
        for original, field in [('lang', 'lang'), ('word', 'word'), ('ipa', 'ipa'), ('pos', 'pos'), ('def', 'def')]:
            pair[field + side.upper()] = row[original + '_' + side]
    for original, field in [('orthographic_sim', 'orthographicSim'), ('phonetic_sim', 'phoneticSim'), ('semantic_sim', 'semanticSim')]:
        pair[field] = row[original]
    proposed = dict(pair, defA=prediction['display'][0], defB=prediction['display'][1])
    indices = prediction['indices']
    if indices:
        for side, index in zip('ab', indices):
            sense = json.loads(row['senses_' + side])[index]
            proposed['pos' + side.upper()] = sense.get('pos', row['pos_' + side])
    return {'key': key, 'panel': panel, 'label': f"{row['lang_a']} {row['word_a']} → {row['lang_b']} {row['word_b']}",
            'original': pair, 'proposed': proposed, 'changed': prediction['display'] != [row['def_a'], row['def_b']]}


if __name__ == '__main__':
    export()
