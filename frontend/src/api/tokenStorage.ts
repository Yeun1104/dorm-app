import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'soongpal.accessToken';
const REFRESH_TOKEN_KEY = 'soongpal.refreshToken';

let cachedAccess: string | null | undefined;
let cachedRefresh: string | null | undefined;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cachedAccess !== undefined) return cachedAccess;
    
    if (Platform.OS === 'web') {
      cachedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    } else {
      cachedAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }
    return cachedAccess;
  },
  
  async set(token: string): Promise<void> {
    cachedAccess = token;
    
    if (Platform.OS === 'web') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    }
  },

  async getRefresh(): Promise<string | null> {
    if (cachedRefresh !== undefined) return cachedRefresh;
    
    if (Platform.OS === 'web') {
      cachedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
      cachedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
    return cachedRefresh;
  },
  
  async setRefresh(token: string | null | undefined): Promise<void> {
    if (!token) {
      cachedRefresh = null;
      if (Platform.OS === 'web') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
      return;
    }
    
    cachedRefresh = token;
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  },

  async clear(): Promise<void> {
    cachedAccess = null;
    cachedRefresh = null;
    
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
      ]);
    }
  },
};