import { useNavigate, useSearch } from '@tanstack/react-router';
import { WordPairCard } from '../../components/lexicon/WordPairCard';
import type { WordPair } from '../../types/linguistics';
import data from './headline-data.json';

type PreviewCase = {
  key: string;
  panel: string;
  label: string;
  missing?: boolean;
  changed?: boolean;
  original?: WordPair;
  proposed?: WordPair;
};
const cases = data as PreviewCase[];

export function HeadlinePreview() {
  const search = useSearch({ from: '/lexicon-headline-preview' });
  const navigate = useNavigate({ from: '/lexicon-headline-preview' });
  const selectedKey = search.case ?? 'diagnostic:water';
  const selected = cases.find((item) => item.key === selectedKey);

  return <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
    <h1 className="typo-page-title">Word meanings · local preview</h1>
    <p className="typo-page-deck mt-1.5">Introduce the words, then keep the original sense match.</p>
    <p className="typo-body text-ink-muted mt-3">Frozen five-language sample. Classification and stored similarity scores are unchanged. This preview does not use the live database or change search results and games.</p>
    <label className="typo-body mt-5 flex flex-col gap-2">
      Word pair
      <select className="w-full border border-book-rule bg-page-surface p-2 text-ink-main" value={selectedKey}
        onChange={(event) => void navigate({ search: { case: event.target.value } })}>
        {!selected && <option value={selectedKey}>Unknown preview case</option>}
        {cases.map((item) => <option key={item.key} value={item.key}>{item.label} · {item.panel}{item.missing ? ' · missing' : ''}</option>)}
      </select>
    </label>
    {!selected ? <p className="typo-body mt-5">This case is not in the frozen sample. Choose a listed word pair.</p>
      : <>
        <p className="typo-note mt-3">{selected.panel} · {selected.key}</p>
        {selected.missing ? <p className="typo-body mt-5">This expected comparison is missing from the dataset. A display change cannot recover it.</p>
          : selected.proposed && selected.original && <div className="mt-5 grid gap-6">
            <section>
              <h2 className="typo-section-header mb-2">Ordinary readings · proposed</h2>
              <p className="typo-body text-ink-muted mb-3">{selected.changed ? 'These readings introduce each word. They do not necessarily mean the same thing.' : 'The proposed readings are the same as the original display.'}</p>
              <WordPairCard pair={selected.proposed} meaningSimilarityLabel="Stored original-match similarity" />
            </section>
            <section>
              <h2 className="typo-section-header mb-2">Original sense match · retained</h2>
              <p className="typo-body text-ink-muted mb-3">Keep this evidence even when a secondary meaning is a poor introduction to the word. The score below belongs to this original match.</p>
              <WordPairCard pair={selected.original} meaningSimilarityLabel="Stored original-match similarity" />
            </section>
          </div>}
      </>}
  </section>;
}
