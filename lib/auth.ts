import { api } from './api-client';

const ACCESS_KEY = 'chopnow.access';
const REFRESH_KEY = 'chopnow.refresh';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const auth = {
  saveTokens(tokens: AuthTokens) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  // --- API calls ---
  async requestOtp(phone: string) {
    return api.post<{ ok: true; expiresInSeconds: number }>('/auth/request-otp', { phone });
  },
  async verifyOtp(phone: string, code: string) {
    const tokens = await api.post<AuthTokens>('/auth/verify-otp', { phone, code });
    this.saveTokens(tokens);
    return tokens;
  },
};
