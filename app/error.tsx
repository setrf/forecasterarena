'use client';

import React, { useEffect } from 'react';
import { AppErrorState } from '@/components/AppErrorState';

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorState
      description="A page segment failed to render. Retry the page to continue."
      resetLabel="Try Again"
      onReset={reset}
    />
  );
}
