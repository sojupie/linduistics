"""H1: reserved and broad fixed-F verification, offline and without DB writes."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import random
import subprocess
import sys

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from e0 import BASELINE, DATASET, EXPECTED_HASH, OUTPUT, ROOT, digest, key, normalized, read_csv, save_json
from e1_entry import read
from e2 import translation_sources
from e2_scope import source_senses
from meaning_profile import source_association_key
from semantic_matcher import SemanticMatcher, DEFAULT_MODEL_REVISION
from sense_display import select_headline
from translation_support import describe_meaning_evidence

PLAN = OUTPUT / 'HEADLINE_CONFIRMATION_PLAN.md'
SEED = 20261025


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=False)
    assert digest(DATASET) == EXPECTED_HASH
    frozen = subprocess.check_output(['git','show','816ad8d:pipeline/src/sense_display.py'])
    import hashlib
    assert hashlib.sha256(frozen).hexdigest() == digest(ROOT/'pipeline/src/sense_display.py')
    registry = read(OUTPUT/'e0_families_v2.json')
    reserved_ids = {r['case_id'] for r in registry['cases'] if r['panel']=='concept' and r['role']=='test'}
    reserved = [r for r in read_csv(OUTPUT/'e0_concept_results.csv') if r['case_id'] in reserved_ids]
    assert len(reserved)==544
    strata = defaultdict(list)
    for r in reserved:strata[r['lang_a']+'-'+r['lang_b']].append(r)
    rng=random.Random(SEED); selected=[]; design={}
    for pair,rows in sorted(strata.items()):
        selected += rng.sample(sorted(rows,key=lambda r:r['case_id']),10)
        design[pair]={'N':len(rows),'n':10}
    wanted=defaultdict(list)
    for r in reserved:
        if r['coverage_status']=='found':wanted[key(r['lang_a'],r['word_a'],r['lang_b'],r['word_b'])].append(r)
    found={}; broad=defaultdict(list); totals=Counter(); rngs={}
    columns=['lang_a','word_a','lang_b','word_b','def_a','def_b']
    offset=0
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=65536,columns=columns):
        for i,row in enumerate(batch.to_pylist(),offset):
            if row['lang_a']>=row['lang_b']:continue
            pair=row['lang_a']+'-'+row['lang_b'];totals[pair]+=1;n=totals[pair]
            rngs.setdefault(pair,random.Random(f'headline-confirmation-{SEED}:{pair}'))
            slot=n-1 if n<=10 else rngs[pair].randrange(n)
            if slot<10:
                item={'row_index':i,**row}
                if n<=10:broad[pair].append(item)
                else:broad[pair][slot]=item
            for c in wanted.get(key(row['lang_a'],row['word_a'],row['lang_b'],row['word_b']),[]):
                if [row['def_a'],row['def_b']]==[c['display_a'],c['display_b']]:
                    exact=row['word_a']==c['word_a'] and row['word_b']==c['word_b']
                    if c['case_id'] not in found or exact:found[c['case_id']]={'row_index':i,**row,'reference_match':'exact' if exact else 'case_mapped'}
        offset+=len(batch)
    assert len(found)==sum(r['coverage_status']=='found' for r in reserved)
    cases=[]
    for r in selected:
        cases.append({'id':r['case_id'],'panel':'reserved','stratum':r['lang_a']+'-'+r['lang_b'],'reference':r,
                      'row_index':found[r['case_id']]['row_index'] if r['case_id'] in found else None})
    nodes={token:(g,group['role']) for g,group in registry['groups'].items() for token in group['members']}
    for pair,items in sorted(broad.items()):
        for row in sorted(items,key=lambda r:r['row_index']):
            groups=[nodes.get(f"lex:{row['lang_'+s]}:{normalized(row['word_'+s])}") for s in 'ab']
            roles={g[1] for g in groups if g};family='unknown' if any(g is None for g in groups) else next(iter(roles)) if len(roles)==1 else 'mixed'
            cases.append({'id':'row:'+str(row['row_index']),'panel':'broad','stratum':pair,'row_index':row['row_index'],
                          'family_status':family,'family_groups':groups})
    allocated=[];r=random.Random('second-review-'+str(SEED))
    for panel in ['reserved','broad']:
        for pair in sorted(strata):allocated+=r.sample(sorted(c['id'] for c in cases if c['panel']==panel and c['stratum']==pair),2)
    save_json(directory/'sample.json',{'cases':cases,'strata':{'reserved':design,'broad':{p:{'N':n,'n':10} for p,n in sorted(totals.items())}},
        'second_review_allocation':allocated,'second_review_status':'pending_external_reviewer','seed':SEED})
    retrieval=[]
    for r in reserved:retrieval.append({'id':r['case_id'],'pair':r['lang_a']+'-'+r['lang_b'],'status':r['coverage_status'],
        'match':found.get(r['case_id'],{}).get('reference_match'),'original_equals_candidate':True})
    save_json(directory/'retrieval.json',retrieval)
    wanted_indices={c['row_index'] for c in cases if c['row_index'] is not None};rows=[];offset=0
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=4096):
        indices=sorted(i-offset for i in wanted_indices if offset<=i<offset+len(batch))
        if indices:
            rows += [dict(row,row_index=i+offset) for i,row in zip(indices,batch.take(pa.array(indices)).to_pylist())]
        offset+=len(batch)
    assert len(rows)==len(wanted_indices)
    save_json(directory/'rows.json',rows)
    files=[PLAN,DATASET,OUTPUT/'e0_families_v2.json',OUTPUT/'e0_concept_results.csv',directory/'sample.json',directory/'rows.json']
    code=[Path(__file__),ROOT/'pipeline/src/sense_display.py',ROOT/'pipeline/src/translation_support.py',ROOT/'pipeline/src/meaning_profile.py',OUTPUT/'e2.py',OUTPUT/'e2_scope.py']
    save_json(directory/'protocol.json',{'method_commit':'816ad8d','variant':'F','inputs':{p.relative_to(ROOT).as_posix():digest(p) for p in files},
        'code':{p.relative_to(ROOT).as_posix():digest(p) for p in code},'model_revision':DEFAULT_MODEL_REVISION})
    print(json.dumps({'reserved_retrieval':dict(Counter(r['status'] for r in retrieval)),'matches':dict(Counter(r['match'] for r in retrieval)),
        'sample':dict(Counter(c['panel'] for c in cases)),'sample_missing':sum(c['row_index'] is None for c in cases),
        'broad_family_status':dict(Counter(c.get('family_status') for c in cases if c['panel']=='broad'))}))


def score(directory, cache_path=None):
    protocol=read(directory/'protocol.json')
    for p,h in protocol['inputs'].items():assert digest(ROOT/p)==h,p
    rows=read(directory/'rows.json');sources,_=translation_sources(rows)
    if cache_path:
        cache={r['row_index']:r for r in read(cache_path)}
    else:
        matcher=SemanticMatcher();glosses=set()
        for row in rows:
            row['parsed']=[json.loads(row['senses_'+s]) for s in 'ab'];row['sources']=source_senses(row,sources)
            glosses.update(s['gloss'] for side in row['parsed'] for s in side);glosses.update(s['gloss'] for s in row['sources'])
        print('Encoding',len(glosses),'frozen-model glosses.',flush=True);matcher.preencode_glosses(sorted(glosses));cache={}
        for row in rows:
            a,b=row['parsed'];vectors=[matcher.encode([s['gloss'] for s in side]) for side in [a,b]]
            matrix=np.clip(vectors[0]@vectors[1].T,0,1)
            if row['word_a'].strip().lower()==row['word_b'].strip().lower():
                for i,s in enumerate(a):
                    for j,t in enumerate(b):
                        if s['gloss'].strip().lower()==row['word_b'].strip().lower() or t['gloss'].strip().lower()==row['word_a'].strip().lower():matrix[i,j]=1.0
            assoc=[{'identity_and_gloss':source_association_key(s),'scores':[(matcher.encode([s['gloss']])[0]@v.T).tolist() for v in vectors]} for s in row['sources']]
            cache[row['row_index']]={'row_index':row['row_index'],'matrix':matrix.tolist(),'associations':assoc}
    predictions={};by_index={r['row_index']:r for r in rows}
    for row in rows:
        a,b=[json.loads(row['senses_'+s]) for s in 'ab'];item=cache[row['row_index']]
        assocs={tuple(r['identity_and_gloss']):r['scores'] for r in item['associations']}
        evidence=describe_meaning_evidence(row,sources,source_associations=assocs,matrix=item['matrix'])
        chosen=select_headline(a,b,item['matrix'],row['word_a'],row['word_b'],evidence,variant='F')
        predictions[row['row_index']]={'indices':chosen,'display':[a[chosen[0]]['gloss'],b[chosen[1]]['gloss']] if chosen else [row['def_a'],row['def_b']],
            'status':'proposed' if chosen else 'original_no_substantive_proposal','meaning_label_unchanged':row['category']}
    sample=read(directory/'sample.json');packets=[];mapping={};rng=random.Random('arms-'+str(SEED))
    for case in sample['cases']:
        if case['row_index'] is None:
            packets.append({'id':case['id'],'panel':case['panel'],'missing':True,'reference':case['reference']});continue
        row=by_index[case['row_index']];arms=['control','F'];rng.shuffle(arms);mapping[case['id']]=dict(zip(['A','B'],arms))
        variants={'control':[row['def_a'],row['def_b']],'F':predictions[case['row_index']]['display']}
        fields=['gloss','pos','tags','is_active','source_entry_key','source_sense_id']
        packets.append({'id':case['id'],'panel':case['panel'],'words':[row[c] for c in ['lang_a','word_a','lang_b','word_b']],
            'reference':{k:case['reference'][k] for k in ['concept','expected_meaning']} if 'reference' in case else None,
            'senses':[[{k:s[k] for k in fields if k in s} for s in json.loads(row['senses_'+side])] for side in 'ab'],
            'arms':{a:variants[v] for a,v in mapping[case['id']].items()}})
    save_json(directory/'matrix_cache.json',list(cache.values()));save_json(directory/'predictions.json',predictions)
    save_json(directory/'packet.json',packets);save_json(directory/'private_arm_map.json',mapping)
    print('Prepared',len(packets),'anonymized review cases.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['prepare','score']);p.add_argument('--output',type=Path,required=True);p.add_argument('--cache',type=Path);a=p.parse_args()
    if a.command=='prepare':prepare(a.output)
    else:score(a.output,a.cache)
