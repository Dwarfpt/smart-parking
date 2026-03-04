// Панель администратора — статистика, графики
import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { LayoutDashboard, Users, Car, CreditCard, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!stats) return <div className="page"><p>{t('dashUnavailable')}</p></div>;

  const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="page">
      <h2><LayoutDashboard size={22} style={{ verticalAlign: 'middle' }} /> {t('dashboardTitle')}</h2>

      {/* Stats cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label"><Users size={16} /> {t('totalUsers')}</div>
          <div className="stat-value">{stats.totalUsers || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Car size={16} /> {t('dashSpots')}</div>
          <div className="stat-value">{stats.totalSpots || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CreditCard size={16} /> {t('dashRevenue')}</div>
          <div className="stat-value">{(stats.totalRevenue || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><TrendingUp size={16} /> {t('activeBookings')}</div>
          <div className="stat-value">{stats.activeBookings || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Bookings per day */}
        {stats.bookingsPerDay && stats.bookingsPerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{t('dashBookingsPerDay')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.bookingsPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" name={t('dashCount')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue per day */}
        {stats.revenuePerDay && stats.revenuePerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{t('dashRevenuePerDay')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.revenuePerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} name="MDL" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Users per day */}
        {stats.usersPerDay && stats.usersPerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{t('dashNewUsers')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.usersPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name={t('dashCount')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spots by status */}
        {stats.spotsByStatus && stats.spotsByStatus.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{t('dashSpotsByStatus')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.spotsByStatus}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ _id, count }) => `${_id}: ${count}`}
                >
                  {stats.spotsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
