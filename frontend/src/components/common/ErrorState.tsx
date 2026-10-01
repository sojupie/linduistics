import React from 'react';
import { MaterialSymbol } from './MaterialSymbol';

export interface ErrorStateProps {
  title?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  errorMessage,
  onRetry,
  retryLabel = 'Retry connection',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-ink-muted text-center py-12 ${className}`}>
      <MaterialSymbol icon="cloud_off" size={28} className="text-falsefriend-ink" />
      <p className="typo-body font-medium text-ink-main">{title}</p>
      <p className="typo-subscript text-ink-muted max-w-md">
        {errorMessage || 'The service is temporarily unavailable. Please check your connection or try again.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded border border-book-rule typo-sublabel text-ink-main hover:bg-page-muted transition-colors cursor-pointer"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};
