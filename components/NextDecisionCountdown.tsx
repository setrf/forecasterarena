'use client';

import { useEffect, useState } from 'react';

export default function NextDecisionCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calculateTimeLeft() {
      const now = new Date();

      // Find next Sunday at midnight UTC
      const nextSunday = new Date(now);
      nextSunday.setUTCDate(now.getUTCDate() + ((7 - now.getUTCDay()) % 7 || 7));
      nextSunday.setUTCHours(0, 0, 0, 0);

      const diff = nextSunday.getTime() - now.getTime();

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    }

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-sm text-gray-600">
      Next AI decisions in: <span className="font-bold text-black">{timeLeft || 'Loading...'}</span>
    </div>
  );
}
