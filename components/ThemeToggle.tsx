'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.dataset.theme !== 'light'); }, []);
  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('gayiclub:theme', next ? 'dark' : 'light'); } catch {}
    setDark(next);
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? 'LIGHT' : 'DARK'}</button>;
}
