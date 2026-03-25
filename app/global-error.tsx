'use client';

import React, { useEffect } from 'react';
import { AppErrorState } from '@/components/AppErrorState';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <AppErrorState
          description="A fatal application error occurred. Retry to reload the app shell."
          resetLabel="Reload App"
          onReset={reset}
        />
      </body>
    </html>
  );
}
