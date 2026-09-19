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
      <div className="py-20 text-center text-ink-muted font-serif">
        <p className="text-sm italic">
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
          ? 'False Friend · Tier A (Etymological Drift)'
          : 'False Friend · Tier B (Surface Clash)';
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

  return (
    <div className="font-serif text-ink-main select-text space-y-5">
      {/* 1. Folio Title Plate (Framed Editorial Anchor) */}
      <div className="border border-book-rule bg-page-bg p-4 space-y-3">
        {/* Running Header */}
        <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-ink-muted font-serif font-semibold border-b border-book-rule/60 pb-2">
          <span>{sourceName} ↔ {targetName}</span>
          <span className="italic font-serif normal-case text-xs text-ink-muted">
            {getTaxonomyTitle()}
          </span>
        </div>

        {/* Headword Comparison Plate */}
        <div className="space-y-2 pt-1">
          {/* Source Entry */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-mono text-ink-muted w-8 shrink-0">
              {sourceLang}
            </span>
            <span className="text-xl sm:text-2xl font-bold font-serif text-ink-main tracking-tight">
              {specimen.wordA}{posAbbrA ? ',' : ''}
            </span>
            {posAbbrA && (
              <span className="table-pos text-sm italic font-serif text-ink-muted">
                {posAbbrA}
              </span>
            )}
            {specimen.ipaA && <Phonetic ipa={specimen.ipaA} className="text-sm table-ipa" />}
          </div>

          {/* Target Entry */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-mono text-ink-muted w-8 shrink-0">
              {targetLang}
            </span>
            <span className={`text-xl sm:text-2xl font-bold font-serif tracking-tight ${
              specimen.category === 'minefield'
                ? 'text-falsefriend-ink'
                : specimen.category === 'cognate'
                ? 'text-cognate-ink'
                : 'text-ink-main'
            }`}>
              {specimen.wordB}{posAbbrB ? ',' : ''}
            </span>
            {posAbbrB && (
              <span className="table-pos text-sm italic font-serif text-ink-muted">
                {posAbbrB}
              </span>
            )}
            {specimen.ipaB && <Phonetic ipa={specimen.ipaB} className="text-sm table-ipa" />}
          </div>
        </div>

        {/* False Friend Distinction Advisory */}
        {specimen.category === 'minefield' && (
          <p className="pt-2 border-t border-book-rule/50 text-xs text-falsefriend-ink leading-relaxed italic">
            {specimen.falseFriendType === 'etymological_shift'
              ? 'Academic False Friend: Headwords share a verified ancestral root (Proto-Germanic or Latinate), but historical semantic divergence has created incompatible modern senses.'
              : 'Casual False Friend: Accidental phonetic or orthographic convergence between historically unrelated lexical roots.'}
          </p>
        )}
      </div>

      {/* 2. Compact Scalar Ledger Strip (Directly beneath Title Plate) */}
      <div className="flex items-center justify-between border-y border-book-rule py-2 px-3 text-xs font-serif bg-page-muted/30">
        <span className="text-ink-muted uppercase tracking-wider font-semibold">
          Similarity Coefficients:
        </span>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-ink-main">
          <span title="Orthographic Similarity">Δₒ <strong className="font-semibold">{specimen.orthographicSim.toFixed(2)}</strong></span>
          <span className="text-book-rule-strong">·</span>
          <span title="Phonetic Articulatory Distance">Δₚ <strong className="font-semibold">{specimen.phoneticSim.toFixed(2)}</strong></span>
          <span className="text-book-rule-strong">·</span>
          <span title="Semantic Alignment">Δₛ <strong className="font-semibold">{specimen.semanticSim.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* 3. Etymological Lineage & Ancestral Root */}
      {(specimen.etymRoot || specimen.etymTextA || specimen.etymTextB || cognateCluster) && (
        <div className="space-y-3 pt-1 border-b border-book-rule pb-5">
          <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold">
            Etymological Lineage
          </div>

          {specimen.etymRoot && (
            <div className="text-sm font-serif">
              <span className="text-ink-muted text-xs uppercase tracking-wider font-semibold mr-2">
                Reconstructed Root:
              </span>
              <span className="font-serif font-bold text-base text-ink-main italic">
                *{specimen.etymRoot}
              </span>
            </div>
          )}

          {specimen.etymTextA && (
            <div className="text-sm text-ink-main leading-relaxed pl-3 border-l border-book-rule-strong">
              <span className="font-serif font-semibold text-ink-muted block mb-0.5 text-xs uppercase tracking-wider">
                {sourceName} Descent:
              </span>
              <p className="font-serif text-sm leading-relaxed">{specimen.etymTextA}</p>
            </div>
          )}

          {specimen.etymTextB && (
            <div className="text-sm text-ink-main leading-relaxed pl-3 border-l border-book-rule-strong">
              <span className="font-serif font-semibold text-ink-muted block mb-0.5 text-xs uppercase tracking-wider">
                {targetName} Descent:
              </span>
              <p className="font-serif text-sm leading-relaxed">{specimen.etymTextB}</p>
            </div>
          )}

          {/* Pan-Germanic Sister Cognates */}
          {cognateCluster && cognateCluster.members && cognateCluster.members.length > 0 && (
            <div className="pt-3 border-t border-book-rule/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-muted uppercase tracking-wider font-serif font-semibold">
                <span>Pan-Germanic Sister Cognates ({cognateCluster.language_count})</span>
                <span className="italic font-serif normal-case font-normal text-xs">{cognateCluster.proto_language}</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {cognateCluster.members.map((m, idx) => {
                  const sisterPos = formatPos(m.pos);
                  return (
                    <div
                      key={idx}
                      className="flex items-baseline justify-between text-sm py-1 border-b border-book-rule/30 gap-2"
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-ink-muted uppercase w-7 shrink-0">
                          {m.lang}
                        </span>
                        <span className="font-serif font-bold text-ink-main text-sm">
                          {m.word}{sisterPos ? ',' : ''}
                        </span>
                        {sisterPos && (
                          <span className="table-pos text-xs italic font-serif text-ink-muted">
                            {sisterPos}
                          </span>
                        )}
                        {m.ipa && <Phonetic ipa={m.ipa} className="text-xs table-ipa" />}
                      </div>
                      {m.gloss && (
                        <span className="text-xs text-ink-muted italic max-w-[200px] truncate text-right shrink-0">
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
      )}

      {/* 4. Polysemous Sense Inventory (Hanging Indent Dictionary Entries) */}
      <div className="space-y-4 pb-4">
        <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold">
          Polysemous Sense Inventory
        </div>

        {/* Source Language Senses */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted border-b border-book-rule/60 pb-1">
            {sourceName} Senses ({specimen.sensesA.length})
          </div>
          {specimen.sensesA.length === 0 ? (
            <p className="text-xs text-ink-muted italic pl-4">No secondary senses recorded in source ledger.</p>
          ) : (
            <div className="space-y-2 pt-0.5">
              {specimen.sensesA.map((s, idx) => {
                const sensePos = formatPos(s.pos);
                return (
                  <div key={s.sense_id} className="pl-6 -indent-6 text-sm font-serif leading-relaxed">
                    <span className="font-bold text-ink-main mr-1.5">{idx + 1}.</span>
                    {sensePos && (
                      <span className="table-pos text-xs italic font-serif text-ink-muted mr-1.5">
                        {sensePos}
                      </span>
                    )}
                    <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-muted'}>
                      {s.gloss}
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 text-2xs uppercase tracking-wider text-cognate-ink font-sans font-semibold">
                        [active · Δₛ {s.similarity_to_counterpart.toFixed(2)}]
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 text-2xs uppercase tracking-wider text-ink-muted italic font-serif">
                        (archaic)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Target Language Senses */}
        <div className="space-y-2 pt-2">
          <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted border-b border-book-rule/60 pb-1">
            {targetName} Senses ({specimen.sensesB.length})
          </div>
          {specimen.sensesB.length === 0 ? (
            <p className="text-xs text-ink-muted italic pl-4">No secondary senses recorded in target ledger.</p>
          ) : (
            <div className="space-y-2 pt-0.5">
              {specimen.sensesB.map((s, idx) => {
                const sensePos = formatPos(s.pos);
                return (
                  <div key={s.sense_id} className="pl-6 -indent-6 text-sm font-serif leading-relaxed">
                    <span className="font-bold text-ink-main mr-1.5">{idx + 1}.</span>
                    {sensePos && (
                      <span className="table-pos text-xs italic font-serif text-ink-muted mr-1.5">
                        {sensePos}
                      </span>
                    )}
                    <span className={s.is_active_match ? 'font-medium text-ink-main' : 'text-ink-muted'}>
                      {s.gloss}
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2 text-2xs uppercase tracking-wider text-cognate-ink font-sans font-semibold">
                        [active · Δₛ {s.similarity_to_counterpart.toFixed(2)}]
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 text-2xs uppercase tracking-wider text-ink-muted italic font-serif">
                        (archaic)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
