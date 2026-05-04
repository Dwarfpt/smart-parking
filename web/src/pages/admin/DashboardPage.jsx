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

  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const statCards = [
    { icon: Users,      label: t('totalUsers'),     value: stats.totalUsers || 0,                     color: 'indigo' },
    { icon: Car,         label: t('dashSpots'),      value: stats.totalSpots || 0,                     color: 'cyan'   },
    { icon: CreditCard,  label: t('dashRevenue'),    value: (stats.totalRevenue || 0).toFixed(2),      color: 'green'  },
    { icon: TrendingUp,  label: t('activeBookings'), value: stats.activeBookings || 0,                 color: 'amber'  },
  ];

  return (
    <div className="page">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div className="stat-icon indigo"><LayoutDashboard size={20} /></div>
        {t('dashboardTitle')}
      </h2>

      {/* Stats cards with colored icons */}
      <div className="stats-grid">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`stat-icon ${card.color}`}>
                <Icon size={20} />
              </div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 24 }}>
        {/* Bookings per day */}
        {stats.bookingsPerDay && stats.bookingsPerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>{t('dashBookingsPerDay')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.bookingsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Bar dataKey="count" fill="url(#gradBar)" name={t('dashCount')} radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue per day */}
        {stats.revenuePerDay && stats.revenuePerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>{t('dashRevenuePerDay')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.revenuePerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2.5} name="MDL" dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Users per day */}
        {stats.usersPerDay && stats.usersPerDay.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>{t('dashNewUsers')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.usersPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Bar dataKey="count" fill="url(#gradBarAmber)" name={t('dashCount')} radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="gradBarAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spots by status */}
        {stats.spotsByStatus && stats.spotsByStatus.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>{t('dashSpotsByStatus')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.spotsByStatus}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  label={({ _id, count }) => `${_id}: ${count}`}
                  strokeWidth={2}
                  stroke="var(--bg-card)"
                >
                  {stats.spotsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
