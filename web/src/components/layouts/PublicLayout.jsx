// Публичный layout — навбар, футер, для неавторизованных
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car, Wallet } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';

export default function PublicLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="main-content">
      <header className="header">
        <Link to="/" className="header-logo">
          <Car size={24} /> Smart Parking
        </Link>
        <nav className="header-nav">
          <NavLink to="/parkings">{t('navParkings')}</NavLink>
          <NavLink to="/about">{t('navAbout')}</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/my-bookings">{t('navMyBookings')}</NavLink>
              <NavLink to="/support">{t('navSupport')}</NavLink>
              <NavLink to="/profile">{t('navProfile')}</NavLink>
              {isAdmin && <NavLink to="/admin">{t('navAdmin')}</NavLink>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--secondary)', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <Wallet size={14} /> {user?.balance?.toFixed(2) || '0.00'} MDL
              </span>
            </>
          ) : (
            <>
              <NavLink to="/login">{t('navLogin')}</NavLink>
              <NavLink to="/register">{t('navRegister')}</NavLink>
            </>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          {isAuthenticated && (
            <button className="btn btn-sm btn-secondary" onClick={logout}>
              {t('navLogout')}
            </button>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
