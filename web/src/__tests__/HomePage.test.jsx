import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

// Wrap component with Router for Link components
function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('HomePage', () => {
  it('renders hero section with title', () => {
    renderWithRouter(<HomePage />);
    const elements = screen.getAllByText(/Smart Parking/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders features section', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText(/Карта парковок/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<HomePage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders tariff section', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText(/Тарифы/i)).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText(/Бронирование/i)).toBeInTheDocument();
    expect(screen.getByText(/Онлайн-оплата/i)).toBeInTheDocument();
  });
});
