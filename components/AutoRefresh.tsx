'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, router]);

  return (
    <div className="fixed top-20 right-4 bg-green-100 text-green-800 px-3 py-1 rounded text-xs flex items-center gap-2 z-50">
      <span className="animate-pulse">●</span>
      LIVE
    </div>
  );
}
