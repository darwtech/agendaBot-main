import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function ThemeSync() {
  const theme = useAppStore((s) => s.settings.theme);
  const accentColor = useAppStore((s) => s.settings.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', accentColor || 'emerald');

    const applyTheme = () => {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        theme === 'dark' || (theme === 'system' && prefersDark);
      root.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();

    if (theme === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme, accentColor]);

  return null;
}
