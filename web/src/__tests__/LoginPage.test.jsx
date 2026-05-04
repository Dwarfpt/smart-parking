import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import LoginPage from '../pages/LoginPage';
import { AuthContext } from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWithAuth(ui, authValue = {}) {
  const defaultAuth = {
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    pendingOtp: null,
    isAuthenticated: false,
    loading: false,
    user: null,
    ...authValue,
  };
  return render(
    <LanguageProvider>
      <AuthContext.Provider value={defaultAuth}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </LanguageProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByText(/Войдите в свой аккаунт/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    renderWithAuth(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••');
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithAuth(<LoginPage />);
    const button = screen.getByRole('button', { name: /войти/i });
    expect(button).toBeInTheDocument();
  });

  it('renders link to register', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByText(/Зарегистрироваться/i)).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    renderWithAuth(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  it('calls login on form submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ user: { role: 'user' } });
    renderWithAuth(<LoginPage />, { login: mockLogin });

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows error on failed login', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderWithAuth(<LoginPage />, { login: mockLogin });

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
