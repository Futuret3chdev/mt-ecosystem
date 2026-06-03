'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTokenStats, MTStatsRaw } from '@/lib/api';

export default function TokenStats() {
  const [stats, setStats] = useState<MTStatsRaw | null>(null);

  useEffect(() => {
    getTokenStats().then(setStats).catch(console.error);
    const i = setInterval(() => {
      getTokenStats().then(setStats).catch(console.error);
    }, 15000);

    return () => clearInterval(i);
  }, []);

  if (!stats) return null;

  return (
    <section className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-6"
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 rounded-xl p-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <Stat label="Price" value={stats.price} />
          <Stat label="Market Cap" value={stats.market_cap} />
          <Stat label="Total Supply" value={stats.total_supply} />
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}
