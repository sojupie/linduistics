import React from 'react';

export const LoadingIndicator: React.FC = () => (
  <div className="flex h-96 w-full items-center justify-center typo-gloss">
    <div className="flex flex-col items-center gap-3">
      <span className="h-5 w-5 rounded-full border-2 border-cognate-ink border-t-transparent animate-spin" />
      <span className="italic">Loading page...</span>
    </div>
  </div>
);

