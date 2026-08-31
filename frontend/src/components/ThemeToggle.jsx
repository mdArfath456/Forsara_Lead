import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../store/themeStore';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--panel-border)] hover:bg-white/[0.06] transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun size={16} className="text-[var(--icon-muted)]" /> : <Moon size={16} className="text-[var(--icon-muted)]" />}
    </button>
  );
}
