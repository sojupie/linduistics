import React from 'react';
import type { SpecimenPair } from '../../types/linguistics';
import { getLanguageName } from '../../data/languages';
import { useClusterByRootQuery } from '../../services/queries';
import { Phonetic } from '../common/Phonetic';

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
        return 'COGNATE PAIR';
      case 'minefield':
        return specimen.falseFriendType === 'etymological_shift'
          ? 'FALSE FRIEND · TIER A (ETYMOLOGICAL DRIFT)'
          : 'FALSE FRIEND · TIER B (SURFACE COLLISION)';
      case 'cousin':
        return 'SOUND-SHIFTED COUSIN (PARTIAL COGNATE)';
      case 'schism':
        return 'TRANSLATION PAIR (SEMANTIC OVERLAP)';
      default:
        return 'LEXICAL PAIR';
    }
  };

  return (
    <div className="font-serif text-ink-main select-text space-y-6">
      {/* Folio Cataloging Header */}
      <div className="border-b border-book-rule pb-5">
        <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold mb-2">
          {sourceLang.toUpperCase()} · {targetLang.toUpperCase()} — {getTaxonomyTitle()}
        </div>

        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl font-bold font-serif text-ink-main tracking-tight">
            {specimen.wordA}
          </span>
          {specimen.ipaA && <Phonetic ipa={specimen.ipaA} className="text-lg" />}
          {specimen.posA && (
            <span className="text-xs text-ink-muted">[{specimen.posA}]</span>
          )}

          <span className="text-ink-muted font-serif px-1">·</span>

          <span className={`text-2xl sm:text-3xl font-bold font-serif tracking-tight ${
            specimen.category === 'minefield'
              ? 'text-falsefriend-ink'
              : specimen.category === 'cognate'
              ? 'text-cognate-ink'
              : 'text-ink-main'
          }`}>
            {specimen.wordB}
          </span>
          {specimen.ipaB && <Phonetic ipa={specimen.ipaB} className="text-lg" />}
          {specimen.posB && (
            <span className="text-xs text-ink-muted">[{specimen.posB}]</span>
          )}
        </div>

        {specimen.category === 'minefield' && (
          <p className="mt-3 text-sm text-falsefriend-ink leading-relaxed italic border-l-2 border-falsefriend-border pl-3">
            {specimen.falseFriendType === 'etymological_shift'
              ? 'Academic False Friend: Headwords share a verified common ancestral etymon (Proto-Germanic or Latin), but their modern definitions have diverged.'
              : 'Casual False Friend: Accidental orthographic or phonetic convergence between unrelated roots or independent foreign borrowings.'}
          </p>
        )}
      </div>

      {/* Disciplined Similarity Scale (Scalar Coefficients) */}
      <div className="border-b border-book-rule pb-5">
        <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold mb-2.5">
          Similarity Coefficients
        </div>
        <div className="grid grid-cols-3 gap-3 text-center font-serif">
          <div className="border-r border-book-rule/60 pr-2">
            <span className="text-ink-muted block text-xs uppercase tracking-wider mb-0.5 font-semibold">
              Orthographic
            </span>
            <span className="font-mono text-base font-semibold text-ink-main">
              Δₒ = {specimen.orthographicSim.toFixed(2)}
            </span>
          </div>
          <div className="border-r border-book-rule/60 px-2">
            <span className="text-ink-muted block text-xs uppercase tracking-wider mb-0.5 font-semibold">
              Phonetic (Articulatory)
            </span>
            <span className="font-mono text-base font-semibold text-ink-main">
              Δₚ = {specimen.phoneticSim.toFixed(2)}
            </span>
          </div>
          <div className="pl-2">
            <span className="text-ink-muted block text-xs uppercase tracking-wider mb-0.5 font-semibold">
              Semantic (Aligned)
            </span>
            <span className="font-mono text-base font-semibold text-ink-main">
              Δₛ = {specimen.semanticSim.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Etymological Lineage & Ancestral Root */}
      {(specimen.etymRoot || specimen.etymTextA || specimen.etymTextB || cognateCluster) && (
        <div className="border-b border-book-rule pb-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold">
            Etymological Lineage & Ancestral Root
          </div>

          {specimen.etymRoot && (
            <div className="text-sm font-serif">
              <span className="text-ink-muted text-xs uppercase tracking-wider font-semibold mr-2">
                Reconstructed Root:
              </span>
              <span className="font-serif font-bold text-base text-ink-main italic">
                {specimen.etymRoot}
              </span>
            </div>
          )}

          {specimen.etymTextA && (
            <div className="text-sm text-ink-main leading-relaxed pl-3 border-l border-book-rule-strong">
              <span className="font-serif font-semibold text-ink-muted block mb-0.5 text-xs uppercase tracking-wider">
                {sourceName} Ancestry:
              </span>
              <p className="font-serif">{specimen.etymTextA}</p>
            </div>
          )}

          {specimen.etymTextB && (
            <div className="text-sm text-ink-main leading-relaxed pl-3 border-l border-book-rule-strong">
              <span className="font-serif font-semibold text-ink-muted block mb-0.5 text-xs uppercase tracking-wider">
                {targetName} Ancestry:
              </span>
              <p className="font-serif">{specimen.etymTextB}</p>
            </div>
          )}

          {/* Pan-Germanic Sister Cognates */}
          {cognateCluster && cognateCluster.members && cognateCluster.members.length > 0 && (
            <div className="pt-3 border-t border-book-rule/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-muted uppercase tracking-wider font-serif font-semibold">
                <span>Pan-Germanic Sister Cognates ({cognateCluster.language_count} Languages)</span>
                <span className="italic font-serif normal-case font-normal">{cognateCluster.proto_language}</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {cognateCluster.members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline justify-between text-sm py-1 border-b border-book-rule/30"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono font-bold text-ink-muted uppercase w-7">
                        {m.lang}
                      </span>
                      <span className="font-serif font-bold text-ink-main text-base">
                        {m.word}
                      </span>
                      {m.ipa && <Phonetic ipa={m.ipa} />}
                      {m.pos && (
                        <span className="text-xs text-ink-muted">[{m.pos}]</span>
                      )}
                    </div>
                    {m.gloss && (
                      <span className="text-sm text-ink-muted italic max-w-[240px] truncate text-right">
                        “{m.gloss}”
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Polysemous Sense Inventory */}
      <div className="space-y-5 pb-6">
        <div className="text-xs uppercase tracking-widest text-ink-muted font-serif font-semibold">
          Polysemous Sense Inventory
        </div>

        {/* Source Language Senses */}
        <div>
          <div className="text-sm uppercase tracking-wider font-semibold text-ink-main border-b border-book-rule/60 pb-1 mb-2.5">
            {sourceName} Senses ({specimen.sensesA.length})
          </div>
          {specimen.sensesA.length === 0 ? (
            <p className="text-sm text-ink-muted italic pl-2">No secondary senses recorded in source entry.</p>
          ) : (
            <div className="space-y-2.5 pl-2">
              {specimen.sensesA.map((s) => (
                <div key={s.sense_id} className="text-sm font-serif leading-relaxed flex items-start gap-2.5">
                  <span className="font-mono text-xs text-ink-muted shrink-0 pt-0.5">
                    {s.sense_id}.
                  </span>
                  <div>
                    {s.pos && <span className="italic text-ink-muted text-xs mr-1.5">[{s.pos}]</span>}
                    <span className={s.is_active_match ? 'font-bold text-ink-main' : 'text-ink-muted'}>
                      {s.gloss}
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2.5 text-xs uppercase tracking-wider text-cognate-ink font-semibold">
                        [active match · S_sem = {s.similarity_to_counterpart.toFixed(2)}]
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2.5 text-xs uppercase tracking-wider text-ink-muted italic">
                        [archaic / obsolete]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target Language Senses */}
        <div>
          <div className="text-sm uppercase tracking-wider font-semibold text-ink-main border-b border-book-rule/60 pb-1 mb-2.5">
            {targetName} Senses ({specimen.sensesB.length})
          </div>
          {specimen.sensesB.length === 0 ? (
            <p className="text-sm text-ink-muted italic pl-2">No secondary senses recorded in target entry.</p>
          ) : (
            <div className="space-y-2.5 pl-2">
              {specimen.sensesB.map((s) => (
                <div key={s.sense_id} className="text-sm font-serif leading-relaxed flex items-start gap-2.5">
                  <span className="font-mono text-xs text-ink-muted shrink-0 pt-0.5">
                    {s.sense_id}.
                  </span>
                  <div>
                    {s.pos && <span className="italic text-ink-muted text-xs mr-1.5">[{s.pos}]</span>}
                    <span className={s.is_active_match ? 'font-bold text-ink-main' : 'text-ink-muted'}>
                      {s.gloss}
                    </span>
                    {s.is_active_match && (
                      <span className="ml-2.5 text-xs uppercase tracking-wider text-cognate-ink font-semibold">
                        [active match · S_sem = {s.similarity_to_counterpart.toFixed(2)}]
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2.5 text-xs uppercase tracking-wider text-ink-muted italic">
                        [archaic / obsolete]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
