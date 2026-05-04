// Дропдаун выбора языка — RU / RO / EN
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ sidebar }) {
  const { lang, changeLang, LANGS, LABELS } = useLanguage();

  const sidebarStyle = sidebar
    ? { background: '#334155', color: '#f1f5f9', border: '1px solid #475569' }
    : {};

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Globe size={14} style={{ marginRight: 4, color: sidebar ? '#94a3b8' : 'var(--text-secondary)' }} />
      <select
        value={lang}
        onChange={(e) => changeLang(e.target.value)}
        style={{
          background: 'var(--input-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius)',
          padding: '4px 8px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          fontWeight: 600,
          ...sidebarStyle,
        }}
      >
        {LANGS.map((l) => (
          <option key={l} value={l} style={sidebar ? { background: '#334155', color: '#f1f5f9' } : {}}>{LABELS[l]}</option>
        ))}
      </select>
    </div>
  );
}
