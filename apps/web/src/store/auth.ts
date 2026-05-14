import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = res.data.data;
          set({ user, accessToken, refreshToken });
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
          document.cookie = `fitsaas-role=${user.role};path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;
          document.cookie = `fitsaas-auth=1;path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: any) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', data);
          const { user, accessToken, refreshToken } = res.data.data;
          set({ user, accessToken, refreshToken });
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
          document.cookie = `fitsaas-role=${user.role};path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;
          document.cookie = `fitsaas-auth=1;path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken, user } = get();
        try {
          await api.post('/auth/logout', { userId: user?.id, refreshToken });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null });
          delete api.defaults.headers.Authorization;
          document.cookie = 'fitsaas-role=;path=/;max-age=0';
          document.cookie = 'fitsaas-auth=;path=/;max-age=0';
        }
      },

      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
    }),
    {
      name: 'fitsaas-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
