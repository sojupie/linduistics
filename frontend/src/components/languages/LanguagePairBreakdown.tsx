import React from 'react';
import { Link } from '@tanstack/react-router';
import { REGISTER_CONFIG } from '../../constants/config';
import type { LanguageProfile } from '../../types/linguistics';
import { TaxonomyRatioBar } from './TaxonomyRatioBar';
import { MaterialSymbol } from '../common/MaterialSymbol';
import { LANGUAGE_OVERVIEW_CONFIG, lexiconSearch, type LanguageMeasure, type LanguagePair } from './languageComparison';

interface LanguagePairBreakdownProps {
  pair: LanguagePair;
  profile: LanguageProfile;
  sourceName: string;
  active: boolean;
  measure: LanguageMeasure;
}

export const LanguagePairBreakdown: React.FC<LanguagePairBreakdownProps> = ({ pair, profile, sourceName, active, measure }) => {
  return (
    <section className="relative border border-book-rule bg-page-surface p-5 sm:p-6 shadow-2xs space-y-5">
      <div className={`space-y-5 ${active ? '' : 'invisible'}`} aria-hidden={!active}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-book-rule pb-3 gap-2">
          <div>
            <h3 className="typo-headword-display text-ink-main">{profile.name}</h3>
            <p className="typo-note mt-1">{profile.pairCount.toLocaleString()} cataloged word pairs with {sourceName}</p>
          </div>
          <Link
            to="/lexicon"
            search={lexiconSearch(pair.source, pair.target, measure)}
            className="typo-sublabel text-cognate-ink underline decoration-1 hover:text-ink-main transition-colors inline-flex items-center gap-1"
          >
            <span>Explore {sourceName}–{profile.name} word pairs</span>
            <MaterialSymbol icon="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="pt-1">
          <div className="typo-sublabel mb-2">Vocabulary breakdown for {profile.name}:</div>
          <TaxonomyRatioBar ratios={profile.ratios} compact={false} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 typo-body text-ink-muted border-t border-book-rule pt-5">
          <div>
            <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-cognate-ink" /><span>True cognates</span></span>
              <span className="typo-metric-table text-cognate-ink font-semibold">{(profile.ratios.trueCognates * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
            </div>
            <p>In the cataloged dataset, approximately <strong className="text-ink-main font-medium">{(profile.ratios.trueCognates * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</strong> of words share verified common ancestry and retain equivalent definitions with {sourceName}.</p>
          </div>

          <div>
            <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-shifted-ink" /><span>Partial cognates</span></span>
              <span className="typo-metric-table text-shifted-ink font-semibold">{(profile.ratios.partialCognates * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
            </div>
            <p>About <strong className="text-ink-main font-medium">{(profile.ratios.partialCognates * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</strong> of pairs stem from common etymological origins but leave partial definition overlap due to semantic shift, broadening, or sound changes.</p>
          </div>

          <div>
            <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-falsefriend-ink" /><span>False friends</span></span>
              <span className="typo-metric-table text-falsefriend-ink font-semibold">{(profile.ratios.falseFriends * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
            </div>
            <p>Around <strong className="text-ink-main font-medium">{(profile.ratios.falseFriends * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</strong> of similar-sounding or looking words diverge in definition due to independent semantic drift or coincidental surface similarity.</p>
          </div>

          <div>
            <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-divergent-ink" /><span>Translation pairs</span></span>
              <span className="typo-metric-table text-divergent-ink font-semibold">{(profile.ratios.translationPairs * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
            </div>
            <p>Roughly <strong className="text-ink-main font-medium">{(profile.ratios.translationPairs * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</strong> of words translate each other directly despite descending from unrelated ancestral roots.</p>
          </div>

          {profile.ratios.other > LANGUAGE_OVERVIEW_CONFIG.otherRatioDisplayThreshold && (
            <div className="md:col-span-2">
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-book-rule-strong" /><span>Other &amp; unclassified</span></span>
                <span className="typo-metric-table text-ink-muted font-semibold">{(profile.ratios.other * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
              </div>
              <p>The remaining <strong className="text-ink-main font-medium">{(profile.ratios.other * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</strong> of cataloged pairs encompass specialized compounds, loan translations, or items outside the four primary cognate categories.</p>
            </div>
          )}
        </div>

        <div className="border-t border-book-rule pt-5">
          <div className="typo-sublabel mb-3">Comparative similarity metrics for {profile.name}:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 typo-body text-ink-muted">
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-ink-main" /><span>Semantic</span></span>
                <span className="typo-metric-table text-ink-main font-semibold">{(profile.semanticSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
              </div>
              <p>Average definition overlap across cataloged pairs. Higher values indicate shared meanings; lower values reflect semantic drift or specialization.</p>
            </div>
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-cognate-ink" /><span>Phonetic</span></span>
                <span className="typo-metric-table text-cognate-ink font-semibold">{(profile.phoneticSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
              </div>
              <p>Phonetic similarity based on articulatory feature alignment over IPA transcriptions. Higher values reflect mutual spoken intelligibility.</p>
            </div>
            <div>
              <div className="typo-section-header font-medium border-b border-book-rule pb-1.5 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-xs bg-divergent-ink" /><span>Spelling</span></span>
                <span className="typo-metric-table text-divergent-ink font-semibold">{(profile.spellingSimilarity * REGISTER_CONFIG.PERCENT_SCALE).toFixed(REGISTER_CONFIG.PRECISION)}%</span>
              </div>
              <p>Orthographic similarity across headword spellings. Higher values indicate immediately recognizable written cognates between {sourceName} and {profile.name}.</p>
            </div>
          </div>
        </div>
      </div>
      {!active && <div className="absolute inset-0 flex items-center justify-center typo-sublabel text-ink-muted">Select a comparison</div>}
    </section>
  );
};
