// О проекте — описание Smart Parking, возможности, технологии
import { Car, MapPin, Users, Shield, Zap, Mail, Phone, Github } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: 'white', padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>🅿️ О проекте Smart Parking</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: 650, margin: '0 auto' }}>
          Интеллектуальная система управления парковочными пространствами города Кишинёва
          с использованием IoT-технологий и мобильных приложений
        </p>
      </section>

      {/* Mission */}
      <section style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Наша миссия</h2>
        <div className="card" style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 16 }}>
            <strong>Smart Parking</strong> — это дипломный проект, разработанный для решения проблемы
            парковки в Кишинёве. Мы объединяем современные веб-технологии, мобильную разработку
            и Интернет вещей (IoT) для создания удобной, прозрачной и безопасной системы парковки.
          </p>
          <p>
            Система позволяет водителям в реальном времени находить свободные парковочные места,
            бронировать их заранее, оплачивать онлайн и получать QR-коды для быстрого доступа.
            Администраторы получают полный контроль над парковками, тарифами и пользователями.
          </p>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '48px 24px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Технологии</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { icon: <Zap size={36} color="var(--primary)" />, title: 'Backend', desc: 'Node.js, Express 5, MongoDB, Mongoose, JWT, Socket.IO, MQTT' },
            { icon: <Car size={36} color="var(--secondary)" />, title: 'Web Frontend', desc: 'React 19, Vite 7, React Router, Axios, Leaflet, Recharts' },
            { icon: <Phone size={36} color="var(--warning)" />, title: 'Мобильное приложение', desc: 'Flutter 3.29, Dart 3.7, Provider, Dio, Go Router, Flutter Map' },
            { icon: <Shield size={36} color="var(--danger)" />, title: 'IoT & Безопасность', desc: 'ESP32-CAM, QR-сканер, MQTT, 2FA по email, Google OAuth' },
          ].map(t => (
            <div key={t.title} className="card" style={{ textAlign: 'center', padding: 28 }}>
              {t.icon}
              <h3 style={{ margin: '12px 0 8px' }}>{t.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '48px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Возможности системы</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: <MapPin size={20} />, text: 'Интерактивная карта парковок с данными в реальном времени' },
            { icon: <Car size={20} />, text: 'Бронирование мест на часы, дни или по абонементу' },
            { icon: <Shield size={20} />, text: 'QR-коды для каждого бронирования с автоматической валидацией' },
            { icon: <Users size={20} />, text: 'Панель администратора с аналитикой и управлением' },
            { icon: <Zap size={20} />, text: 'IoT-датчики и ESP32-CAM для автоматического контроля' },
            { icon: <Mail size={20} />, text: 'Двухфакторная аутентификация по email и вход через Google' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12 }}>
              <div style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <span style={{ fontSize: '0.95rem' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Author */}
      <section style={{ padding: '48px 24px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Автор</h2>
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, margin: '0 auto 16px' }}>
            ДЭ
          </div>
          <h3 style={{ marginBottom: 4 }}>Димитриу Эдуард</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Группа TI-227 • Дипломный проект 2026</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Техническийм Университет Молдовы<br />
            Факультет вычислительной техники, информатики и микроэлектроники
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        © 2026 Smart Parking — Димитриу Эдуард, TI-227. Все права защищены.
      </footer>
    </>
  );
}
