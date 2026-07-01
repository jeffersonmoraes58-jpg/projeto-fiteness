import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TRAINER' | 'NUTRITIONIST' | 'ADMIN';
  avatarUrl?: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setToken: (token: string) => {
    set({ token });
    SecureStore.setItemAsync('auth_token', token).catch(() => {});
  },

  setUser: (user: User) => {
    set({ user });
    SecureStore.setItemAsync('auth_user', JSON.stringify(user)).catch(() => {});
  },

  logout: () => {
    set({ token: null, user: null });
    SecureStore.deleteItemAsync('auth_token').catch(() => {});
    SecureStore.deleteItemAsync('auth_user').catch(() => {});
  },

  loadStoredAuth: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('auth_user'),
      ]);
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
