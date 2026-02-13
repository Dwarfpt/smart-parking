// Главный маршрутизатор — публичные, пользовательские, админские маршруты
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import PublicLayout from './components/layouts/PublicLayout';
import UserLayout from './components/layouts/UserLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Public pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ParkingsPage from './pages/ParkingsPage';
import OtpPage from './pages/auth/OtpPage';

// User pages
import ProfilePage from './pages/user/ProfilePage';
import ParkingDetailPage from './pages/user/ParkingDetailPage';
import MyBookingsPage from './pages/user/MyBookingsPage';
import SupportPage from './pages/user/SupportPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import TariffsAdminPage from './pages/admin/TariffsAdminPage';
import ParkingsAdminPage from './pages/admin/ParkingsAdminPage';
import SupportAdminPage from './pages/admin/SupportAdminPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return isAdmin ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      {/* Публичные */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/parkings" element={<ParkingsPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />

      {/* Авторизованный */}
      <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/parking/:id" element={<ParkingDetailPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      {/* Админ */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersAdminPage />} />
        <Route path="tariffs" element={<TariffsAdminPage />} />
        <Route path="parkings" element={<ParkingsAdminPage />} />
        <Route path="support" element={<SupportAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
