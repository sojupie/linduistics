import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { useClusterByRootQuery } from '../../services/queries';
import { Phonetic } from '../common/Phonetic';
import { formatPos } from '../../utils/formatters';

interface SpecimenDossierProps {
  specimen: SpecimenPair | null;
  sourceLang: string;
  targetLang: string;
}

export const SpecimenDossier: React.FC<SpecimenDossierProps> = ({
  specimen,
  sourceLang,
  targetLang,
}) => {
  const { data: cognateCluster } = useClusterByRootQuery(specimen?.etymRoot);

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  if (!specimen) {
    return (
      <div className="py-24 text-center text-ink-muted font-serif">
        <p className="text-base italic leading-relaxed">
          Select any specimen from the register ledger to inspect comparative etymology and polysemous sense divergence.
        </p>
      </div>
    );
  }

  const getTaxonomyTitle = () => {
    switch (specimen.category) {
      case 'cognate':
        return 'Cognate Pair';
      case 'minefield':
        return specimen.falseFriendType === 'etymological_shift'
          ? 'False Friend · Tier A (Drift)'
          : 'False Friend · Tier B (Clash)';
      case 'cousin':
        return 'Sound-Shifted Cousin';
      case 'schism':
        return 'Translation Counterpart';
      default:
        return 'Lexical Pair';
    }
  };

  const posAbbrA = formatPos(specimen.posA);
  const posAbbrB = formatPos(specimen.posB);

  // Synthesize complete sense lists so the dossier never renders an empty graveyard
  const sensesListA = (() => {
    if (specimen.sensesA && specimen.sensesA.length > 0) {
      return specimen.sensesA;
    }
    if (specimen.defA && specimen.defA.trim()) {
      return [
        {
          sense_id: 1,
          gloss: specimen.defA.trim(),
          pos: specimen.posA,
          is_active_match: true,
          is_active: true,
          similarity_to_counterpart: specimen.semanticSim,
        },
      ];
    }
    return [
      {
        sense_id: 1,
        gloss: `Primary lexical sense of ${specimen.wordA}.`,
        pos: specimen.posA,
        is_active_match: true,
        is_active: true,
        similarity_to_counterpart: specimen.semanticSim,
      },
    ];
  })();

  const sensesListB = (() => {
    if (specimen.sensesB && specimen.sensesB.length > 0) {
      return specimen.sensesB;
    }
    if (specimen.defB && specimen.defB.trim()) {
      return [
        {
          sense_id: 1,
          gloss: specimen.defB.trim(),
          pos: specimen.posB,
          is_active_match: true,
          is_active: true,
          similarity_to_counterpart: specimen.semanticSim,
        },
      ];
    }
    return [
      {
        sense_id: 1,
        gloss: `Primary lexical sense of ${specimen.wordB}.`,
        pos: specimen.posB,
        is_active_match: true,
        is_active: true,
        similarity_to_counterpart: specimen.semanticSim,
      },
    ];
  })();

  return (
    <div className="font-serif text-ink-main select-text space-y-6">
      {/* 1. Folio Title Plate (Unboxed, Direct on Substrate) */}
      <div className="pb-5 border-b border-book-rule space-y-4">
        {/* Running Header */}
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-ink-muted font-deck font-normal border-b border-book-rule/60 pb-2.5">
          <span>{sourceName} ↔ {targetName}</span>
          <span className={`text-xs font-normal tracking-wider px-2 py-0.5 border ${
            specimen.category === 'minefield'
              ? 'text-falsefriend-ink bg-falsefriend-bg border-falsefriend-border'
              : specimen.category === 'cognate'
              ? 'text-cognate-ink bg-cognate-bg border-cognate-border'
              : 'text-ink-main bg-page-muted border-book-rule'
          }`}>
            {getTaxonomyTitle()}
          </span>
        </div>

        {/* Specimen Headwords in Warbler Header (default normal style) */}
        <div className="space-y-3.5 pt-1">
          {/* Source Entry */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xs uppercase tracking-widest font-mono font-medium text-ink-muted bg-page-muted px-2 py-0.5 border border-book-rule shrink-0">
              {sourceLang.toUpperCase()}
            </span>
            <h2 className="font-deck text-2xl font-normal text-ink-main tracking-tight leading-tight">
              {specimen.wordA}{posAbbrA ? ',' : ''}
            </h2>
            {posAbbrA && (
              <span className="table-pos text-lg italic font-serif text-ink-muted">
                {posAbbrA}
              </span>
            )}
            {specimen.ipaA && (
              <Phonetic ipa={specimen.ipaA} className="text-base text-stone-800 font-normal" />
            )}
          </div>

          {/* Symmetrical Lexical Axis Divider */}
          <div className="flex items-center gap-3 text-ink-muted/40 py-0.5">
            <div className="flex-1 border-t border-book-rule"></div>
            <span className="font-serif italic text-xs tracking-wider text-ink-muted font-normal">
              corresponds in {targetName} to
            </span>
            <div className="flex-1 border-t border-book-rule"></div>
          </div>

          {/* Target Entry */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-ink-muted bg-page-muted px-2 py-0.5 border border-book-rule shrink-0">
              {targetLang.toUpperCase()}
            </span>
            <h2 className={`font-deck text-2xl font-normal tracking-tight leading-tight ${
              specimen.category === 'minefield'
                ? 'text-falsefriend-ink'
                : specimen.category === 'cognate'
                ? 'text-cognate-ink'
                : 'text-ink-main'
            }`}>
              {specimen.wordB}{posAbbrB ? ',' : ''}
            </h2>
            {posAbbrB && (
              <span className="table-pos text-lg italic font-serif text-ink-muted">
                {posAbbrB}
              </span>
            )}
            {specimen.ipaB && (
              <Phonetic ipa={specimen.ipaB} className="text-base text-stone-800 font-normal" />
            )}
          </div>
        </div>

        {/* False Friend Distinction Advisory */}
        {specimen.category === 'minefield' && (
          <div className="pt-3 border-t border-book-rule/80 text-sm text-falsefriend-ink leading-relaxed italic bg-falsefriend-bg/40 p-3 border-l-2 border-falsefriend-border">
            {specimen.falseFriendType === 'etymological_shift'
              ? 'Academic False Friend (Semantic Drift): Both headwords share a verified common etymon (Proto-Germanic or Latinate ancestor), but independent semantic drift has rendered their modern denotations divergent or mutually deceptive.'
              : 'Casual False Friend (Surface Collision): Headwords represent historically unrelated roots that have accidentally converged through phonetic erosion or foreign borrowing.'}
          </div>
        )}
      </div>

      {/* 2. Similarity Coefficients (Two Rows: Title on top, Delta columns below) */}
      <div className="border-y border-book-rule py-3 px-2 space-y-2 bg-page-muted/30">
        <div className="font-deck text-base text-ink-main font-normal">
          Similarity Coefficients
        </div>
        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-book-rule">
          <div className="px-2">
            <span className="text-xs uppercase tracking-wider text-ink-muted font-normal block mb-1 font-deck">
              Orthographic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-serif font-normal text-ink-main text-sm">
                Δ<sub className="font-serif text-2xs font-normal not-italic">o</sub>
              </span>
              <span className="font-mono font-medium text-base text-ink-main tabular-nums">
                {specimen.orthographicSim.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase tracking-wider text-ink-muted font-normal block mb-1 font-deck">
              Phonetic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-serif font-normal text-ink-main text-sm">
                Δ<sub className="font-serif text-2xs font-normal not-italic">p</sub>
              </span>
              <span className="font-mono font-medium text-base text-ink-main tabular-nums">
                {specimen.phoneticSim.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase tracking-wider text-ink-muted font-normal block mb-1 font-deck">
              Semantic
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-serif font-normal text-ink-main text-sm">
                Δ<sub className="font-serif text-2xs font-normal not-italic">s</sub>
              </span>
              <span className="font-mono font-medium text-base text-ink-main tabular-nums">
                {specimen.semanticSim.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Etymological Descent & Lineage */}
      <div className="space-y-4 pt-1 border-b border-book-rule pb-5">
        <div className="font-deck text-base text-ink-main font-normal border-b border-book-rule pb-1.5">
          Etymological Descent & Lineage
        </div>

        {specimen.etymRoot ? (
          <div className="bg-page-muted/30 border border-book-rule p-4 space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block">
              Reconstructed Ancestral Root
            </span>
            <div className="text-xl font-bold font-serif text-ink-main italic">
              *{specimen.etymRoot}
              {cognateCluster?.proto_language && (
                <span className="ml-2.5 text-xs font-normal font-sans text-ink-muted uppercase tracking-wider not-italic">
                  ({cognateCluster.proto_language})
                </span>
              )}
            </div>

            {/* Directional Transitional Descent Chain */}
            <div className="pt-2 border-t border-book-rule/60 text-sm text-ink-main font-serif flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-ink-muted">Descent:</span>
              <span className="font-serif text-ink-main">
                <span className="font-bold">{specimen.wordA}</span> <span className="text-xs italic text-ink-muted">({sourceName})</span>
              </span>
              <span className="text-ink-muted">←</span>
              <span className="font-serif text-ink-main">
                <span className="font-bold">{specimen.wordB}</span> <span className="text-xs italic text-ink-muted">({targetName})</span>
              </span>
              <span className="text-ink-muted">←</span>
              <span className="font-serif italic font-bold text-cognate-ink">
                *{specimen.etymRoot}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-page-muted/20 border border-book-rule/60 p-3.5 text-sm text-ink-muted italic">
            Direct reconstructed proto-etymon currently undergoing comparative triangulation across sister dialects.
          </div>
        )}

        {specimen.etymTextA && (
          <div className="text-base text-ink-main leading-relaxed pl-3.5 border-l-2 border-book-rule-strong space-y-1">
            <span className="font-deck font-normal text-ink-muted block text-xs uppercase tracking-wider">
              {sourceName} Historical Descent:
            </span>
            <p className="font-serif text-base leading-relaxed text-ink-main">{specimen.etymTextA}</p>
          </div>
        )}

        {specimen.etymTextB && (
          <div className="text-base text-ink-main leading-relaxed pl-3.5 border-l-2 border-book-rule-strong space-y-1">
            <span className="font-deck font-normal text-ink-muted block text-xs uppercase tracking-wider">
              {targetName} Historical Descent:
            </span>
            <p className="font-serif text-base leading-relaxed text-ink-main">{specimen.etymTextB}</p>
          </div>
        )}

        {/* Pan-Germanic Sister Cognates Ledger */}
        {cognateCluster && cognateCluster.members && cognateCluster.members.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-ink-main uppercase tracking-wider font-deck font-normal border-b border-book-rule/60 pb-1.5">
              <span>Pan-Germanic Sister Cognates ({cognateCluster.language_count} Languages)</span>
              <span className="italic font-serif normal-case font-normal text-xs text-ink-muted">
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
                      <span className="text-xs font-mono font-medium text-ink-muted uppercase w-8 shrink-0">
                        {m.lang}
                      </span>
                      <span className="font-serif font-normal text-ink-main text-base">
                        {m.word}{sisterPos ? ',' : ''}
                      </span>
                      {sisterPos && (
                        <span className="table-pos text-xs italic font-serif text-ink-muted">
                          {sisterPos}
                        </span>
                      )}
                      {m.ipa && <Phonetic ipa={m.ipa} className="text-xs text-stone-800" />}
                    </div>
                    {m.gloss && (
                      <span className="text-sm text-ink-muted italic max-w-[220px] truncate text-right shrink-0">
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

      {/* 4. Polysemous Sense Inventory (Hanging Indent Dictionary Entries) */}
      <div className="space-y-5 pb-6">
        <div className="font-deck text-base text-ink-main font-normal border-b border-book-rule pb-1.5">
          Polysemous Sense Inventory
        </div>

        {/* Source Language Senses */}
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider font-normal font-deck text-ink-muted border-b border-book-rule/60 pb-1">
            <span>{sourceName} Senses ({sensesListA.length})</span>
          </div>
          <div className="space-y-3 pt-1">
            {sensesListA.map((s, idx) => {
              const sensePos = formatPos(s.pos) || posAbbrA;
              return (
                <div key={s.sense_id || idx} className="flex items-start gap-2.5 text-base font-serif leading-relaxed">
                  <span className="font-bold text-ink-main text-base shrink-0 w-5 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink-main">
                      {sensePos && (
                        <span className="table-pos text-sm italic font-serif text-ink-muted mr-1.5 font-normal">
                          {sensePos}
                        </span>
                      )}
                      <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-main'}>
                        {s.gloss}
                      </span>
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 inline-flex items-center text-2xs uppercase tracking-wider text-cognate-ink font-sans font-semibold bg-cognate-bg border border-cognate-border px-1.5 py-0.5 whitespace-nowrap">
                        Aligned Sense · Δ<sub className="font-serif not-italic text-2xs">s</sub> {s.similarity_to_counterpart.toFixed(2)}
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 inline-block text-2xs uppercase tracking-wider text-ink-muted italic font-serif">
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
          <div className="text-xs uppercase tracking-wider font-normal font-deck text-ink-muted border-b border-book-rule/60 pb-1">
            <span>{targetName} Senses ({sensesListB.length})</span>
          </div>
          <div className="space-y-3 pt-1">
            {sensesListB.map((s, idx) => {
              const sensePos = formatPos(s.pos) || posAbbrB;
              return (
                <div key={s.sense_id || idx} className="flex items-start gap-2.5 text-base font-serif leading-relaxed">
                  <span className="font-bold text-ink-main text-base shrink-0 w-5 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink-main">
                      {sensePos && (
                        <span className="table-pos text-sm italic font-serif text-ink-muted mr-1.5 font-normal">
                          {sensePos}
                        </span>
                      )}
                      <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-main'}>
                        {s.gloss}
                      </span>
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 inline-flex items-center text-2xs uppercase tracking-wider text-cognate-ink font-sans font-semibold bg-cognate-bg border border-cognate-border px-1.5 py-0.5 whitespace-nowrap">
                        Aligned Sense · Δ<sub className="font-serif not-italic text-2xs">s</sub> {s.similarity_to_counterpart.toFixed(2)}
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 inline-block text-2xs uppercase tracking-wider text-ink-muted italic font-serif">
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
