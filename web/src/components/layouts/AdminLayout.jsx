// Админский layout — боковое меню, управление системой
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle';
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

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🅿️ Admin Panel</div>
        <nav className="sidebar-nav">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} /> Дашборд
          </NavLink>
          <NavLink to="/admin/users">
            <Users size={18} /> Пользователи
          </NavLink>
          <NavLink to="/admin/tariffs">
            <DollarSign size={18} /> Тарифы
          </NavLink>
          <NavLink to="/admin/parkings">
            <ParkingCircle size={18} /> Парковки
          </NavLink>
          <NavLink to="/admin/support">
            <MessageCircle size={18} /> Поддержка
          </NavLink>
          <NavLink to="/">
            <ArrowLeft size={18} /> На сайт
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <ThemeToggle />
          <button className="btn btn-sm btn-secondary" onClick={logout} style={{ width: '100%', marginTop: '10px' }}>
            Выход
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
