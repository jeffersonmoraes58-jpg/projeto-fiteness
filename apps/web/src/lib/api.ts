import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const storage = localStorage.getItem('fitsaas-auth');
    if (storage) {
      const { state } = JSON.parse(storage);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storage = localStorage.getItem('fitsaas-auth');
        if (storage) {
          const { state } = JSON.parse(storage);
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { userId: state.user?.id, refreshToken: state.refreshToken },
          );

          const { accessToken } = data.data;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          const parsed = JSON.parse(storage);
          parsed.state.accessToken = accessToken;
          localStorage.setItem('fitsaas-auth', JSON.stringify(parsed));

          return api(originalRequest);
        }
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fitsaas-auth');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);
