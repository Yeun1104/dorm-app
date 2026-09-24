import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'soongpal.accessToken';

// SecureStore는 비동기라 매 요청마다 읽지 않도록 메모리에 캐시해둠.
let cachedToken: string | null | undefined;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cachedToken !== undefined) return cachedToken;
    cachedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return cachedToken;
  },
  async set(token: string): Promise<void> {
    cachedToken = token;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    cachedToken = null;
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};
