// Админский layout — боковое меню, управление системой
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ParkingCircle,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';

export default function AdminLayout() {
  const { logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🅿️ {t('adminPanel')}</div>
        <nav className="sidebar-nav">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} /> {t('adminDashboard')}
          </NavLink>
          <NavLink to="/admin/users">
            <Users size={18} /> {t('adminUsers')}
          </NavLink>
          <NavLink to="/admin/tariffs">
            <DollarSign size={18} /> {t('adminTariffs')}
          </NavLink>
          <NavLink to="/admin/parkings">
            <ParkingCircle size={18} /> {t('adminParkings')}
          </NavLink>
          <NavLink to="/admin/support">
            <MessageCircle size={18} /> {t('adminSupport')}
          </NavLink>
          <NavLink to="/">
            <ArrowLeft size={18} /> {t('adminBackToSite')}
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <button className="btn btn-sm btn-secondary" onClick={logout} style={{ width: '100%' }}>
            {t('navLogout')}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="page page-wide">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
