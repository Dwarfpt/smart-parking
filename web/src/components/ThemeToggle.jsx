// Кнопка переключения темы (светлая ↔ тёмная)
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ThemeToggle({ sidebar }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const sidebarStyle = sidebar
    ? { background: '#334155', color: '#f1f5f9', border: 'none' }
    : {};

  return (
    <button
      onClick={toggleTheme}
      className={sidebar ? '' : 'btn btn-sm btn-secondary theme-toggle'}
      title={theme === 'light' ? t('themeDark') : t('themeLight')}
      style={{ padding: '6px 8px', lineHeight: 1, cursor: 'pointer', borderRadius: 'var(--radius)', ...sidebarStyle }}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
