// Публичный layout — навбар, футер, для неавторизованных
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export default function PublicLayout() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="main-content">
      <header className="header">
        <Link to="/" className="header-logo">
          <Car size={24} /> Smart Parking
        </Link>
        <nav className="header-nav">
          <NavLink to="/parkings">Парковки</NavLink>
          <NavLink to="/about">О нас</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/my-bookings">Мои бронирования</NavLink>
              <NavLink to="/support">Поддержка</NavLink>
              <NavLink to="/profile">Профиль</NavLink>
              {isAdmin && <NavLink to="/admin">Админ</NavLink>}
            </>
          ) : (
            <>
              <NavLink to="/login">Вход</NavLink>
              <NavLink to="/register">Регистрация</NavLink>
            </>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
