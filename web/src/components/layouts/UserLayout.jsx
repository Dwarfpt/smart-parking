// Пользовательский layout — навбар с личными ссылками
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export default function UserLayout() {
  const { isAdmin, logout } = useAuth();

  return (
    <div className="main-content">
      <header className="header">
        <Link to="/" className="header-logo">
          <Car size={24} /> Smart Parking
        </Link>
        <nav className="header-nav">
          <NavLink to="/parkings">Парковки</NavLink>
          <NavLink to="/about">О нас</NavLink>
          <NavLink to="/my-bookings">Бронирования</NavLink>
          <NavLink to="/support">Поддержка</NavLink>
          <NavLink to="/profile">Профиль</NavLink>
          {isAdmin && <NavLink to="/admin">Админ</NavLink>}
          <ThemeToggle />
          <button className="btn btn-sm btn-secondary" onClick={logout}>
            Выход
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
