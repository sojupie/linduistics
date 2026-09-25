import React from 'react';
import type { WordPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { useClusterByRootQuery } from '../../services/queries';
import { Phonetic } from '../common/Phonetic';
import { formatPos, parseEtymRoot } from '../../utils/formatters';
import { MaterialSymbol } from '../common/MaterialSymbol';

interface WordPairDetailsProps {
  pair: WordPair | null;
  sourceLang: string;
  targetLang: string;
}

export const WordPairDetails: React.FC<WordPairDetailsProps> = ({
  pair,
  sourceLang,
  targetLang,
}) => {
  const { data: cognateCluster } = useClusterByRootQuery(pair?.etymRoot);

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);
  const parsedRoot = parseEtymRoot(pair?.etymRoot, cognateCluster?.proto_language);

  if (!pair) {
    return (
      <div className="py-24 text-center text-ink-muted font-serif">
        <p className="typo-note leading-relaxed">
          Select a word pair from the lexicon to view comparative etymology, definitions, and phonetic transcriptions.
        </p>
      </div>
    );
  }

  const getTaxonomyTitle = () => {
    switch (pair.category) {
      case 'true_cognate':
        return 'True Cognate';
      case 'false_friend':
        return pair.falseFriendType === 'etymological_shift'
          ? 'False Friend · Shared Root'
          : pair.falseFriendType === 'surface_collision'
            ? 'False Friend · Accidental Lookalike'
            : 'False Friend';
      case 'partial_cognate':
        return 'Partial Cognate';
      case 'translation_pair':
        return 'Translation Pair';
      default:
        return 'Other';
    }
  };

  const posAbbrA = formatPos(pair.posA);
  const posAbbrB = formatPos(pair.posB);

  // Synthesize complete sense lists to ensure definitions always render
  const sensesListA = (() => {
    if (pair.sensesA && pair.sensesA.length > 0) {
      return pair.sensesA;
    }
    if (pair.defA && pair.defA.trim()) {
      return [
        {
          sense_id: 1,
          gloss: pair.defA.trim(),
          pos: pair.posA,
          is_active_match: true,
          is_active: true,
          similarity_to_counterpart: pair.semanticSim,
        },
      ];
    }
    return [
      {
        sense_id: 1,
        gloss: `Primary lexical sense of ${pair.wordA}.`,
        pos: pair.posA,
        is_active_match: true,
        is_active: true,
        similarity_to_counterpart: pair.semanticSim,
      },
    ];
  })();

  const sensesListB = (() => {
    if (pair.sensesB && pair.sensesB.length > 0) {
      return pair.sensesB;
    }
    if (pair.defB && pair.defB.trim()) {
      return [
        {
          sense_id: 1,
          gloss: pair.defB.trim(),
          pos: pair.posB,
          is_active_match: true,
          is_active: true,
          similarity_to_counterpart: pair.semanticSim,
        },
      ];
    }
    return [
      {
        sense_id: 1,
        gloss: `Primary lexical sense of ${pair.wordB}.`,
        pos: pair.posB,
        is_active_match: true,
        is_active: true,
        similarity_to_counterpart: pair.semanticSim,
      },
    ];
  })();

  return (
    <div className="font-serif text-ink-main select-text space-y-6">
      {/* 1. Word Pair Title Plate */}
      <div className="pb-5 border-b border-book-rule space-y-4">
        {/* Running Header */}
        <div className="flex items-center justify-between typo-overline border-b border-book-rule/60 pb-2.5">
          <span className="inline-flex items-center gap-1.5">
            <span>{sourceName}</span>
            <MaterialSymbol icon="sync_alt" size={14} className="text-ink-muted" />
            <span>{targetName}</span>
          </span>
          <span className={`typo-badge px-2.5 py-0.5 rounded ${pair.category === 'false_friend'
              ? 'text-falsefriend-ink bg-falsefriend-bg'
              : pair.category === 'true_cognate'
                ? 'text-cognate-ink bg-cognate-bg'
                : pair.category === 'partial_cognate'
                  ? 'text-shifted-ink bg-shifted-bg'
                  : pair.category === 'translation_pair'
                    ? 'text-divergent-ink bg-divergent-bg'
                    : 'text-ink-main bg-page-muted'
            }`}>
            {getTaxonomyTitle()}
          </span>
        </div>

        {/* Headwords */}
        <div className="space-y-3.5 pt-1">
          {/* Source Entry */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="typo-lang-code shrink-0 cursor-help" title={sourceName}>
              {sourceLang.toUpperCase()}
            </span>
            <h2 className="typo-headword-display text-ink-main">
              {pair.wordA}{posAbbrA ? ',' : ''}
            </h2>
            {posAbbrA && (
              <span className="typo-pos-display">
                {posAbbrA}
              </span>
            )}
            {pair.ipaA && (
              <Phonetic ipa={pair.ipaA} className="table-ipa" />
            )}
          </div>

          {/* Symmetrical Lexical Axis Divider */}
          <div className="flex items-center gap-3 text-ink-muted/40 py-0.5">
            <div className="flex-1 border-t border-book-rule"></div>
            <span className="typo-sublabel italic font-serif">
              corresponds in {targetName} to
            </span>
            <div className="flex-1 border-t border-book-rule"></div>
          </div>

          {/* Target Entry */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="typo-lang-code shrink-0 cursor-help" title={targetName}>
              {targetLang.toUpperCase()}
            </span>
            <h2 className={`typo-headword-display ${pair.category === 'false_friend'
                ? 'text-falsefriend-ink'
                : pair.category === 'true_cognate'
                  ? 'text-cognate-ink'
                  : 'text-ink-main'
              }`}>
              {pair.wordB}{posAbbrB ? ',' : ''}
            </h2>
            {posAbbrB && (
              <span className="typo-pos-display">
                {posAbbrB}
              </span>
            )}
            {pair.ipaB && (
              <Phonetic ipa={pair.ipaB} className="table-ipa" />
            )}
          </div>
        </div>

        {/* False Friend Distinction Advisory */}
        {pair.category === 'false_friend' && (
          <div className="pt-3 border-book-rule/80 typo-note text-falsefriend-ink leading-relaxed bg-falsefriend-bg/40 p-3 border-l-2 border-falsefriend-border">
            {pair.falseFriendType === 'etymological_shift'
              ? 'Shared Roots: Both headwords share a verified common ancestral root (Proto-Germanic or Latinate ancestor), but independent semantic drift has rendered their modern definitions divergent or mutually deceptive.'
              : 'Accidental Lookalike: Headwords represent historically unrelated roots that have coincidentally converged in spelling or pronunciation.'}
          </div>
        )}
      </div>

      {/* 2. Similarity Coefficients */}
      <div className="border-y border-book-rule py-3 px-2 space-y-2 bg-page-muted/30">
        <div className="typo-section-header">
          Similarity Coefficients
        </div>
        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-book-rule">
          <div className="px-2">
            <span className="typo-sublabel block mb-1">
              Orthographic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="typo-pos text-ink-main">
                Δ<sub className="typo-subscript">o</sub>
              </span>
              <span className="typo-metric">
                {pair.orthographicSim.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="px-2">
            <span className="typo-sublabel block mb-1">
              Phonetic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="typo-pos text-ink-main">
                Δ<sub className="typo-subscript">p</sub>
              </span>
              <span className="typo-metric">
                {pair.phoneticSim.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="px-2">
            <span className="typo-sublabel block mb-1">
              Semantic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="typo-pos text-ink-main">
                Δ<sub className="typo-subscript">s</sub>
              </span>
              <span className="typo-metric">
                {pair.semanticSim.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Etymological Lineage */}
      <div className="space-y-4 pt-1 border-b border-book-rule pb-5">
        <div className="typo-section-header border-b border-book-rule pb-1.5">
          Etymological Descent & Lineage
        </div>

        {pair.etymRoot ? (
          <div className="bg-page-muted/30 border border-book-rule p-4 space-y-2.5">
            <span className="typo-sublabel block">
              Reconstructed Ancestral Root
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="typo-headword-row text-ink-main italic">
                {parsedRoot.lemma}
              </span>
              {parsedRoot.language && (
                <span className="typo-note text-ink-muted">
                  ({parsedRoot.language})
                </span>
              )}
            </div>

            {/* Directional Descent Chain */}
            <div className="pt-2 border-t border-book-rule/60 typo-body text-ink-main flex items-center gap-2 flex-wrap">
              <span className="typo-sublabel">Descent:</span>
              <span className="font-deck font-medium italic text-cognate-ink">
                {parsedRoot.lemma}
              </span>
              <MaterialSymbol icon="arrow_forward" size={14} className="text-ink-muted" />
              <span className="font-serif text-ink-main">
                <span className="font-deck font-medium">{pair.wordA}</span>{' '}
                <span className="typo-sublabel italic font-serif">({sourceName})</span>
              </span>
              <span className="typo-sublabel font-serif">,</span>
              <span className="font-serif text-ink-main">
                <span className="font-deck font-medium">{pair.wordB}</span>{' '}
                <span className="typo-sublabel italic font-serif">({targetName})</span>
              </span>
            </div>
          </div>
        ) : pair.category === 'false_friend' && pair.falseFriendType === 'surface_collision' ? (
          <div className="bg-page-muted/20 border border-book-rule/60 p-3.5 typo-note text-ink-muted">
            No shared ancestral root: these words have historically distinct etymological origins and converged only in surface form.
          </div>
        ) : !pair.etymTextA && !pair.etymTextB ? (
          <div className="bg-page-muted/20 border border-book-rule/60 p-3.5 typo-note text-ink-muted">
            No reconstructed ancestral root recorded in source data.
          </div>
        ) : null}

        {pair.etymTextA && (
          <div className="typo-body pl-3.5 border-l-2 border-book-rule-strong space-y-1">
            <span className="typo-sublabel block">
              {sourceName} Historical Descent:
            </span>
            <p>{pair.etymTextA}</p>
          </div>
        )}

        {pair.etymTextB && (
          <div className="typo-body pl-3.5 border-l-2 border-book-rule-strong space-y-1">
            <span className="typo-sublabel block">
              {targetName} Historical Descent:
            </span>
            <p>{pair.etymTextB}</p>
          </div>
        )}

        {/* Pan-Germanic Sister Cognates */}
        {cognateCluster && cognateCluster.members && cognateCluster.members.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between typo-sublabel text-ink-main border-b border-book-rule/60 pb-1.5">
              <span>Pan-Germanic Sister Cognates ({cognateCluster.language_count} Languages)</span>
              <span className="typo-note text-ink-muted normal-case font-normal">
                {cognateCluster.proto_language}
              </span>
            </div>
            <div className="space-y-1 divide-y divide-book-rule/40">
              {cognateCluster.members.map((m, idx) => {
                const sisterPos = formatPos(m.pos);
                return (
                  <div
                    key={idx}
                    className="flex items-baseline justify-between py-2 gap-3"
                  >
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="typo-metric-table text-ink-muted uppercase w-8 shrink-0">
                        {m.lang}
                      </span>
                      <span className="typo-headword-row text-ink-main">
                        {m.word}{sisterPos ? ',' : ''}
                      </span>
                      {sisterPos && (
                        <span className="table-pos text-ink-muted">
                          {sisterPos}
                        </span>
                      )}
                      {m.ipa && <Phonetic ipa={m.ipa} className="table-ipa" />}
                    </div>
                    {m.gloss && (
                      <span className="typo-gloss max-w-[220px] truncate text-right shrink-0">
                        “{m.gloss}”
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Sense Inventory & Definitions */}
      <div className="space-y-5 pb-6">
        <div className="typo-section-header border-b border-book-rule pb-1.5">
          Sense Inventory & Definitions
        </div>

        {/* Source Language Senses */}
        <div className="space-y-3">
          <div className="typo-sublabel border-b border-book-rule/60 pb-1">
            <span>{sourceName} Senses ({sensesListA.length})</span>
          </div>
          <div className="space-y-3 pt-1">
            {sensesListA.map((s, idx) => {
              const sensePos = formatPos(s.pos) || posAbbrA;
              return (
                <div key={s.sense_id || idx} className="flex items-start gap-2.5 typo-body">
                  <span className="font-bold text-ink-main shrink-0 w-5 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink-main">
                      {sensePos && (
                        <span className="table-pos text-ink-muted mr-1.5">
                          {sensePos}
                        </span>
                      )}
                      <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-main'}>
                        {s.gloss}
                      </span>
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 inline-flex items-center typo-badge text-cognate-ink bg-cognate-bg px-1.5 py-0.5 rounded whitespace-nowrap">
                        Aligned Sense · Δ<sub className="typo-subscript">s</sub> {s.similarity_to_counterpart.toFixed(2)}
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 inline-block typo-badge text-ink-muted italic">
                        (archaic)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Language Senses */}
        <div className="space-y-3 pt-2">
          <div className="typo-sublabel border-b border-book-rule/60 pb-1">
            <span>{targetName} Senses ({sensesListB.length})</span>
          </div>
          <div className="space-y-3 pt-1">
            {sensesListB.map((s, idx) => {
              const sensePos = formatPos(s.pos) || posAbbrB;
              return (
                <div key={s.sense_id || idx} className="flex items-start gap-2.5 typo-body">
                  <span className="font-bold text-ink-main shrink-0 w-5 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink-main">
                      {sensePos && (
                        <span className="table-pos text-ink-muted mr-1.5">
                          {sensePos}
                        </span>
                      )}
                      <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-main'}>
                        {s.gloss}
                      </span>
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 inline-flex items-center typo-badge text-cognate-ink bg-cognate-bg px-1.5 py-0.5 rounded whitespace-nowrap">
                        Aligned Sense · Δ<sub className="typo-subscript">s</sub> {s.similarity_to_counterpart.toFixed(2)}
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 inline-block typo-badge text-ink-muted italic">
                        (archaic)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export type SpecimenDossierProps = {
  specimen: WordPair | null;
  sourceLang: string;
  targetLang: string;
};
export const SpecimenDossier: React.FC<SpecimenDossierProps> = ({ specimen, sourceLang, targetLang }) => (
  <WordPairDetails pair={specimen} sourceLang={sourceLang} targetLang={targetLang} />
);
