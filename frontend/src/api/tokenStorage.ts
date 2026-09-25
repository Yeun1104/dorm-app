import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'soongpal.accessToken';
const REFRESH_TOKEN_KEY = 'soongpal.refreshToken';

// SecureStore는 비동기라 매 요청마다 읽지 않도록 메모리에 캐시해둠.
let cachedAccess: string | null | undefined;
let cachedRefresh: string | null | undefined;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cachedAccess !== undefined) return cachedAccess;
    cachedAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return cachedAccess;
  },
  async set(token: string): Promise<void> {
    cachedAccess = token;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  /**
   * 모바일은 httpOnly 쿠키를 못 쓰므로 refreshToken을 직접 보관해서
   * /api/auth/refresh 호출 시 body로 보냄 (백엔드는 body 우선, 없으면 쿠키)
   */
  async getRefresh(): Promise<string | null> {
    if (cachedRefresh !== undefined) return cachedRefresh;
    cachedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return cachedRefresh;
  },
  async setRefresh(token: string | null | undefined): Promise<void> {
    if (!token) return;
    cachedRefresh = token;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async clear(): Promise<void> {
    cachedAccess = null;
    cachedRefresh = null;
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  },
};
