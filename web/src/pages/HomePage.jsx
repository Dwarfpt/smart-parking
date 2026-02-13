// Главная страница — приветствие, ссылки, статистика
import { Link } from 'react-router-dom';
import { Car, MapPin, CreditCard, Shield, Activity, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>🅿️ Smart Parking</h1>
        <p>
          Умная система управления парковкой в Кишинёве. Находите свободные места,
          бронируйте и оплачивайте — всё онлайн и в реальном времени.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/parkings" className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 28px' }}>
            Найти парковку
          </Link>
          <Link to="/register" className="btn btn-outline" style={{ fontSize: '1rem', padding: '14px 28px', borderColor: 'white', color: 'white' }}>
            Регистрация
          </Link>
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card card">
          <MapPin size={40} color="var(--primary)" />
          <h3>Карта парковок</h3>
          <p>Смотрите все доступные парковки на интерактивной карте города с данными в реальном времени</p>
        </div>
        <div className="feature-card card">
          <Clock size={40} color="var(--secondary)" />
          <h3>Бронирование</h3>
          <p>Бронируйте место заранее на часы или дни. Оформляйте абонемент на неделю, месяц или год</p>
        </div>
        <div className="feature-card card">
          <CreditCard size={40} color="var(--warning)" />
          <h3>Онлайн-оплата</h3>
          <p>Пополняйте баланс и оплачивайте парковку прямо из приложения. Прозрачная история транзакций</p>
        </div>
        <div className="feature-card card">
          <Activity size={40} color="var(--danger)" />
          <h3>Реальное время</h3>
          <p>Датчики на парковке мгновенно обновляют информацию о свободных местах через IoT</p>
        </div>
        <div className="feature-card card">
          <Shield size={40} color="#8b5cf6" />
          <h3>Безопасность</h3>
          <p>Шлагбаум с автоматическим контролем доступа. Защита данных и безопасные платежи</p>
        </div>
        <div className="feature-card card">
          <Car size={40} color="var(--gray-600)" />
          <h3>Для всех</h3>
          <p>Удобно для водителей и администраторов. Веб-приложение и мобильное приложение</p>
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--gray-100)' }}>
        <h2 style={{ marginBottom: 12 }}>Тарифы</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>Гибкие цены для любых потребностей</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Почасовая', price: 'от 15 MDL/ч', desc: 'Идеально для коротких визитов' },
            { name: 'Абонемент неделя', price: 'от 400 MDL', desc: 'Закреплённое место на 7 дней' },
            { name: 'Абонемент месяц', price: 'от 1300 MDL', desc: 'Самый популярный вариант' },
          ].map((t) => (
            <div key={t.name} className="card" style={{ width: 280, textAlign: 'center' }}>
              <h3>{t.name}</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', margin: '12px 0' }}>
                {t.price}
              </div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
        © 2026 Smart Parking — Димитриу Эдуард, TI-227. Все права защищены.
      </footer>
    </>
  );
}
