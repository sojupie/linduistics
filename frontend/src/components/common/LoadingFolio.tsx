import React from 'react';

export const LoadingFolio: React.FC = () => (
  <div className="flex h-96 w-full items-center justify-center font-serif text-sm text-ink-muted">
    <div className="flex flex-col items-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-specimen-moss border-t-transparent animate-spin" />
      <span className="italic">Opening folio registry...</span>
    </div>
  </div>
);
