'use client';

import React from 'react';

interface AppErrorStateProps {
  title?: string;
  description?: string;
  resetLabel?: string;
  onReset: () => void;
}

export function AppErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while rendering this page. Please try again.',
  resetLabel = 'Reload Page',
  onReset
}: AppErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-rose-dim)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--accent-rose)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="heading-block mb-2">{title}</h2>
        <p className="text-[var(--text-secondary)] mb-6">{description}</p>
        <button onClick={onReset} className="btn btn-primary">
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
