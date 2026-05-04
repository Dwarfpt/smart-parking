// Кнопка переключения темы (светлая ↔ тёмная)
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ThemeToggle({ sidebar }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const baseStyle = {
    padding: '6px 8px',
    lineHeight: 1,
    cursor: 'pointer',
    borderRadius: 'var(--radius)',
    display: 'inline-flex',
    alignItems: 'center',
    border: 'none',
  };

  const sidebarStyle = sidebar
    ? { ...baseStyle, background: '#334155', color: '#f1f5f9' }
    : {
        ...baseStyle,
        background: theme === 'dark' ? '#475569' : 'var(--gray-200)',
        color: theme === 'dark' ? '#fbbf24' : '#6b7280',
      };

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'light' ? t('themeDark') : t('themeLight')}
      style={sidebarStyle}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
