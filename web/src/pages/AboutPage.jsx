// О проекте — описание Smart Parking, возможности, технологии
import { Car, MapPin, Users, Shield, Zap, Mail, Phone, Github } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <>
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: 'white', padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>🅿️ {t('aboutTitle')}</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: 650, margin: '0 auto' }}>
          {t('aboutHeroDesc')}
        </p>
      </section>

      <section style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{t('aboutMission')}</h2>
        <div className="card" style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 16 }}>{t('aboutMissionP1')}</p>
          <p>{t('aboutMissionP2')}</p>
        </div>
      </section>

      <section style={{ padding: '48px 24px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>{t('techStack')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { icon: <Zap size={36} color="var(--primary)" />, title: t('aboutBackend'), desc: 'Node.js, Express 5, MongoDB, Mongoose, JWT, Socket.IO, MQTT' },
            { icon: <Car size={36} color="var(--secondary)" />, title: t('aboutFrontend'), desc: 'React 19, Vite 7, React Router, Axios, Leaflet, Recharts' },
            { icon: <Phone size={36} color="var(--warning)" />, title: t('aboutMobileApp'), desc: 'Flutter 3.29, Dart 3.7, Provider, Dio, Go Router, Flutter Map' },
            { icon: <Shield size={36} color="var(--danger)" />, title: t('aboutIoTSecurity'), desc: 'ESP32-CAM, QR, MQTT, 2FA, Google OAuth' },
          ].map(item => (
            <div key={item.title} className="card" style={{ textAlign: 'center', padding: 28 }}>
              {item.icon}
              <h3 style={{ margin: '12px 0 8px' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '48px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>{t('aboutSysFeatures')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: <MapPin size={20} />, text: t('aboutFeatMap') },
            { icon: <Car size={20} />, text: t('aboutFeatBooking') },
            { icon: <Shield size={20} />, text: t('aboutFeatQR') },
            { icon: <Users size={20} />, text: t('aboutFeatAdmin') },
            { icon: <Zap size={20} />, text: t('aboutFeatIoT') },
            { icon: <Mail size={20} />, text: t('aboutFeatAuth') },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12 }}>
              <div style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <span style={{ fontSize: '0.95rem' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '48px 24px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{t('aboutAuthor')}</h2>
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, margin: '0 auto 16px' }}>
            ДЭ
          </div>
          <h3 style={{ marginBottom: 4 }}>{t('aboutAuthorName')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('aboutAuthorGroup')}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
            {t('aboutAuthorUniv')}
          </p>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {t('copyright')}
      </footer>
    </>
  );
}
