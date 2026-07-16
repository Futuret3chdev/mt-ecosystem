'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { sendTrack } from '@/lib/mt-tracker';

export default function MtTracker() {
  const pathname = usePathname();

  useEffect(() => {
    sendTrack(pathname);
  }, [pathname]);

  return null;
}