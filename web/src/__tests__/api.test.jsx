import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { authAPI, userAPI, parkingAPI, bookingAPI, tariffAPI, supportAPI, adminAPI } from '../services/api';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios };
});

describe('API Service', () => {
  describe('authAPI', () => {
    it('has login method', () => {
      expect(typeof authAPI.login).toBe('function');
    });

    it('has register method', () => {
      expect(typeof authAPI.register).toBe('function');
    });

    it('has getMe method', () => {
      expect(typeof authAPI.getMe).toBe('function');
    });
  });

  describe('userAPI', () => {
    it('has getProfile method', () => {
      expect(typeof userAPI.getProfile).toBe('function');
    });

    it('has updateProfile method', () => {
      expect(typeof userAPI.updateProfile).toBe('function');
    });

    it('has topUp method', () => {
      expect(typeof userAPI.topUp).toBe('function');
    });

    it('has getTransactions method', () => {
      expect(typeof userAPI.getTransactions).toBe('function');
    });

    it('has changePassword method', () => {
      expect(typeof userAPI.changePassword).toBe('function');
    });
  });

  describe('parkingAPI', () => {
    it('has getAll method', () => {
      expect(typeof parkingAPI.getAll).toBe('function');
    });

    it('has getOne method', () => {
      expect(typeof parkingAPI.getOne).toBe('function');
    });

    it('has getSpots method', () => {
      expect(typeof parkingAPI.getSpots).toBe('function');
    });
  });

  describe('bookingAPI', () => {
    it('has create method', () => {
      expect(typeof bookingAPI.create).toBe('function');
    });

    it('has getMy method', () => {
      expect(typeof bookingAPI.getMy).toBe('function');
    });

    it('has cancel method', () => {
      expect(typeof bookingAPI.cancel).toBe('function');
    });
  });

  describe('tariffAPI', () => {
    it('has getAll method', () => {
      expect(typeof tariffAPI.getAll).toBe('function');
    });

    it('has create method', () => {
      expect(typeof tariffAPI.create).toBe('function');
    });

    it('has update method', () => {
      expect(typeof tariffAPI.update).toBe('function');
    });
  });

  describe('supportAPI', () => {
    it('has getMyTickets method', () => {
      expect(typeof supportAPI.getMyTickets).toBe('function');
    });

    it('has createTicket method', () => {
      expect(typeof supportAPI.createTicket).toBe('function');
    });

    it('has addMessage method', () => {
      expect(typeof supportAPI.addMessage).toBe('function');
    });

    it('has closeTicket method', () => {
      expect(typeof supportAPI.closeTicket).toBe('function');
    });
  });

  describe('adminAPI', () => {
    it('has getStats method', () => {
      expect(typeof adminAPI.getStats).toBe('function');
    });

    it('has getUsers method', () => {
      expect(typeof adminAPI.getUsers).toBe('function');
    });

    it('has createParking method', () => {
      expect(typeof adminAPI.createParking).toBe('function');
    });
  });
});
