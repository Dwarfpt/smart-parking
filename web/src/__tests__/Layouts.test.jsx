import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import PublicLayout from '../components/layouts/PublicLayout';
import UserLayout from '../components/layouts/UserLayout';
import AdminLayout from '../components/layouts/AdminLayout';

function renderWithAuth(ui, authValue = {}, route = '/') {
  const defaultAuth = {
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    logout: vi.fn(),
    ...authValue,
  };
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <AuthContext.Provider value={defaultAuth}>
          <MemoryRouter initialEntries={[route]}>
            {ui}
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

describe('PublicLayout', () => {
  it('renders header with Smart Parking brand', () => {
    renderWithAuth(<PublicLayout />);
    expect(screen.getByText(/Smart Parking/i)).toBeInTheDocument();
  });

  it('shows login link when not authenticated', () => {
    renderWithAuth(<PublicLayout />, { isAuthenticated: false });
    expect(screen.getByText(/Вход/i)).toBeInTheDocument();
  });

  it('shows profile link when authenticated', () => {
    renderWithAuth(<PublicLayout />, { isAuthenticated: true, user: { name: 'Test', role: 'user' } });
    expect(screen.getByText(/Профиль/i)).toBeInTheDocument();
  });
});

describe('UserLayout', () => {
  it('renders user navigation', () => {
    renderWithAuth(<UserLayout />, {
      isAuthenticated: true,
      user: { name: 'Test User', role: 'user' },
    });
    expect(screen.getByText(/Smart Parking/i)).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderWithAuth(<UserLayout />, {
      isAuthenticated: true,
      user: { name: 'Test', role: 'user' },
    });
    expect(screen.getByText(/Выход/i)).toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  it('renders admin sidebar', () => {
    renderWithAuth(<AdminLayout />, {
      isAuthenticated: true,
      isAdmin: true,
      user: { name: 'Admin', role: 'admin' },
    });
    expect(screen.getByText(/Дашборд/i)).toBeInTheDocument();
  });

  it('renders admin navigation links', () => {
    renderWithAuth(<AdminLayout />, {
      isAuthenticated: true,
      isAdmin: true,
      user: { name: 'Admin', role: 'admin' },
    });
    expect(screen.getByText(/Пользователи/i)).toBeInTheDocument();
    expect(screen.getByText(/Тарифы/i)).toBeInTheDocument();
    expect(screen.getByText(/Парковки/i)).toBeInTheDocument();
  });
});
