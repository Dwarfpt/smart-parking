import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import App from '../App';

function renderApp(authValue = {}) {
  const defaultAuth = {
    isAuthenticated: false,
    isAdmin: false,
    loading: false,
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    pendingOtp: null,
    loginWithGoogle: vi.fn(),
    ...authValue,
  };
  return render(
    <ThemeProvider>
      <AuthContext.Provider value={defaultAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

// Mock leaflet to avoid DOM issues in tests
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

describe('App Routing', () => {
  it('renders home page at /', () => {
    window.history.pushState({}, '', '/');
    renderApp();
    const elements = screen.getAllByText(/Smart Parking/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders login page at /login', () => {
    window.history.pushState({}, '', '/login');
    renderApp();
    expect(screen.getByText(/Войдите в свой аккаунт/i)).toBeInTheDocument();
  });

  it('renders register page at /register', () => {
    window.history.pushState({}, '', '/register');
    renderApp();
    expect(screen.getByText(/Создайте новый аккаунт/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated user from /profile to /login', () => {
    window.history.pushState({}, '', '/profile');
    renderApp({ isAuthenticated: false });
    // Should redirect to login
    expect(screen.getByText(/Войдите в свой аккаунт/i)).toBeInTheDocument();
  });

  it('redirects non-admin from /admin to /', () => {
    window.history.pushState({}, '', '/admin');
    renderApp({ isAuthenticated: true, isAdmin: false, user: { name: 'User', role: 'user' } });
    // Should redirect to home
    const elements = screen.getAllByText(/Smart Parking/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
