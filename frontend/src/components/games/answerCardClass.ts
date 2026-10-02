export function answerCardClass(selected: boolean, correct: boolean, revealed: boolean, selectedClass: string) {
  if (!revealed) return selected ? selectedClass : 'border-book-rule bg-page-surface hover:border-ink-main hover:bg-page-muted';
  if (selected && correct) return 'border-cognate-border bg-cognate-bg text-cognate-ink';
  if (!selected && correct) return 'border-dashed border-cognate-border text-ink-muted bg-page-surface';
  if (selected) return 'border-falsefriend-border bg-falsefriend-bg text-falsefriend-ink';
  return 'border-book-rule text-ink-muted bg-page-surface';
}
