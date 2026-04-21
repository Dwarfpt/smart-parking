// Главная страница — приветствие, ссылки, статистика
import { Link } from 'react-router-dom';
import { Car, MapPin, CreditCard, Shield, Activity, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  const features = [
    { icon: MapPin,     color: 'indigo', titleKey: 'homeMapTitle',      descKey: 'homeMapDesc'      },
    { icon: Clock,      color: 'green',  titleKey: 'featBooking',       descKey: 'homeBookDesc'     },
    { icon: CreditCard, color: 'amber',  titleKey: 'homePayTitle',      descKey: 'homePayDesc'      },
    { icon: Activity,   color: 'rose',   titleKey: 'homeRealtimeTitle', descKey: 'homeRealtimeDesc' },
    { icon: Shield,     color: 'violet', titleKey: 'homeSecurityTitle', descKey: 'homeSecurityDesc' },
    { icon: Car,        color: 'slate',  titleKey: 'homeForAll',        descKey: 'homeForAllDesc'   },
  ];

  const tariffs = [
    { key: 'Hourly',  nameKey: 'homeTariffHourly',  priceKey: 'homeTariffHourlyPrice',  descKey: 'homeTariffHourlyDesc'  },
    { key: 'Weekly',  nameKey: 'homeTariffWeekly',  priceKey: 'homeTariffWeeklyPrice',  descKey: 'homeTariffWeeklyDesc'  },
    { key: 'Monthly', nameKey: 'homeTariffMonthly', priceKey: 'homeTariffMonthlyPrice', descKey: 'homeTariffMonthlyDesc' },
  ];

  return (
    <>
      <section className="hero">
        {/* Floating aurora orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <h1>
          <img src="/logo.svg" alt="" style={{ height: 56, verticalAlign: 'middle', marginRight: 14, filter: 'drop-shadow(0 4px 12px rgba(99,102,241,0.4))' }} />
          Smart Parking
        </h1>
        <p>{t('homeSubtitle')}</p>
        <div className="hero-buttons">
          <Link to="/parkings" className="btn btn-primary">
            {t('heroBtn')}
          </Link>
          <Link to="/register" className="btn btn-outline">
            {t('navRegister')}
          </Link>
        </div>
      </section>

      <section className="features-grid">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.titleKey} className="feature-card card">
              <div className={`feature-icon ${item.color}`}>
                <Icon size={28} />
              </div>
              <h3>{t(item.titleKey)}</h3>
              <p>{t(item.descKey)}</p>
            </div>
          );
        })}
      </section>

      <section className="tariffs-section">
        <h2 style={{ marginBottom: 14, fontSize: '2.2rem', letterSpacing: '-0.03em' }}>{t('homeTariffs')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 44, fontSize: '1.05rem', maxWidth: 500, margin: '0 auto 44px' }}>
          {t('homeTariffsSub')}
        </p>
        <div className="tariffs-grid">
          {tariffs.map((item, i) => (
            <div key={item.key} className="card tariff-card" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
              <h3>{t(item.nameKey)}</h3>
              <div className="tariff-price">{t(item.priceKey)}</div>
              <p className="tariff-desc">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        {t('copyright')}
      </footer>
    </>
  );
}
