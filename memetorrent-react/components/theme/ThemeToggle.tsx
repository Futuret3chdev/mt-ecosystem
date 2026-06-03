'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const initial = saved ?? 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <span className="text-base">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="opacity-80">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
