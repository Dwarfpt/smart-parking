// Дропдаун выбора языка — RU / RO / EN
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { lang, changeLang, LANGS, LABELS } = useLanguage();

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Globe size={14} style={{ marginRight: 4, color: 'var(--text-secondary)' }} />
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
        }}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>{LABELS[l]}</option>
        ))}
      </select>
    </div>
  );
}
