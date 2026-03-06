// Главная страница — приветствие, ссылки, статистика
import { Link } from 'react-router-dom';
import { Car, MapPin, CreditCard, Shield, Activity, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <section className="hero">
        <h1><img src="/public/logo.svg" alt="" style={{ height: 48, verticalAlign: 'middle', marginRight: 8 }} />Smart Parking</h1>
        <p>{t('homeSubtitle')}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/parkings" className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 28px' }}>
            {t('heroBtn')}
          </Link>
          <Link to="/register" className="btn btn-outline" style={{ fontSize: '1rem', padding: '14px 28px', borderColor: 'white', color: 'white' }}>
            {t('navRegister')}
          </Link>
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card card">
          <MapPin size={40} color="var(--primary)" />
          <h3>{t('homeMapTitle')}</h3>
          <p>{t('homeMapDesc')}</p>
        </div>
        <div className="feature-card card">
          <Clock size={40} color="var(--secondary)" />
          <h3>{t('featBooking')}</h3>
          <p>{t('homeBookDesc')}</p>
        </div>
        <div className="feature-card card">
          <CreditCard size={40} color="var(--warning)" />
          <h3>{t('homePayTitle')}</h3>
          <p>{t('homePayDesc')}</p>
        </div>
        <div className="feature-card card">
          <Activity size={40} color="var(--danger)" />
          <h3>{t('homeRealtimeTitle')}</h3>
          <p>{t('homeRealtimeDesc')}</p>
        </div>
        <div className="feature-card card">
          <Shield size={40} color="#8b5cf6" />
          <h3>{t('homeSecurityTitle')}</h3>
          <p>{t('homeSecurityDesc')}</p>
        </div>
        <div className="feature-card card">
          <Car size={40} color="var(--gray-600)" />
          <h3>{t('homeForAll')}</h3>
          <p>{t('homeForAllDesc')}</p>
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--gray-100)' }}>
        <h2 style={{ marginBottom: 12 }}>{t('homeTariffs')}</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>{t('homeTariffsSub')}</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { key: 'Hourly', nameKey: 'homeTariffHourly', priceKey: 'homeTariffHourlyPrice', descKey: 'homeTariffHourlyDesc' },
            { key: 'Weekly', nameKey: 'homeTariffWeekly', priceKey: 'homeTariffWeeklyPrice', descKey: 'homeTariffWeeklyDesc' },
            { key: 'Monthly', nameKey: 'homeTariffMonthly', priceKey: 'homeTariffMonthlyPrice', descKey: 'homeTariffMonthlyDesc' },
          ].map((item) => (
            <div key={item.key} className="card" style={{ width: 280, textAlign: 'center' }}>
              <h3>{t(item.nameKey)}</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', margin: '12px 0' }}>
                {t(item.priceKey)}
              </div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
        {t('copyright')}
      </footer>
    </>
  );
}
