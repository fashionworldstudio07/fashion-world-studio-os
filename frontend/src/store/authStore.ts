/* Zustand auth store — manages login state and JWT tokens */
import { create } from 'zustand';
import api from '../services/api';
import type { User, LoginResponse } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      const { user, tokens } = res.data;
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  sendOtp: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/otp/send', { email });
      set({ isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to send OTP';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  verifyOtp: async (email: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<LoginResponse>('/auth/otp/verify', { email, otp });
      const { user, tokens } = res.data;
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired OTP';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: () => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      set({ user: JSON.parse(stored), isAuthenticated: true });
    }
  },
}));

