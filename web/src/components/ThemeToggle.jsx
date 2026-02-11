// Кнопка переключения темы (светлая ↔ тёмная)
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-sm btn-secondary theme-toggle"
      title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      style={{ padding: '6px 8px', lineHeight: 1 }}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
