import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import RegisterPage from '../pages/RegisterPage';
import { AuthContext } from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWithAuth(ui, authValue = {}) {
  const defaultAuth = {
    register: vi.fn(),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    renderWithAuth(<RegisterPage />);
    expect(screen.getByText(/Создайте новый аккаунт/i)).toBeInTheDocument();
  });

  it('renders all required fields', () => {
    renderWithAuth(<RegisterPage />);
    expect(screen.getByPlaceholderText('Ваше имя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+373 ...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Минимум 6 символов')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithAuth(<RegisterPage />);
    const button = screen.getByRole('button', { name: /зарегистрироваться/i });
    expect(button).toBeInTheDocument();
  });

  it('renders link to login', () => {
    renderWithAuth(<RegisterPage />);
    expect(screen.getByText(/Уже есть аккаунт/i)).toBeInTheDocument();
  });

  it('calls register on valid submit', async () => {
    const mockRegister = vi.fn().mockResolvedValue({});
    renderWithAuth(<RegisterPage />, { register: mockRegister });

    fireEvent.change(screen.getByPlaceholderText('Ваше имя'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('+373 ...'), { target: { value: '+37360000000' } });
    fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
  });

  it('shows error on registration failure', async () => {
    const mockRegister = vi.fn().mockRejectedValue({
      response: { data: { message: 'Email already exists' } },
    });
    renderWithAuth(<RegisterPage />, { register: mockRegister });

    fireEvent.change(screen.getByPlaceholderText('Ваше имя'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'exist@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('+373 ...'), { target: { value: '+37360000000' } });
    fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
    });
  });
});
