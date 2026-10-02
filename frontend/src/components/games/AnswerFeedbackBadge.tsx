import React from 'react';
import { MaterialSymbol } from '../common/MaterialSymbol';

export const AnswerFeedbackBadge: React.FC<{ selected: boolean; correct: boolean }> = ({ selected, correct }) => {
  if (!selected && !correct) return null;
  const label = selected ? correct ? 'Your answer · Correct' : 'Your answer · Incorrect' : 'Correct answer';
  const color = correct ? 'bg-cognate-ink' : 'bg-falsefriend-ink';
  return <span className={`typo-badge inline-flex items-center gap-1.5 px-2 py-0.5 text-page-surface font-medium ${color}`}>{label}<MaterialSymbol icon={correct ? 'check' : 'close'} size={16} /></span>;
};
