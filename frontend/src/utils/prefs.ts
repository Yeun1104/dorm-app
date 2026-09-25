import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 기기에만 저장하는 앱 설정 (알림 설정 등). 웹은 localStorage, 앱은 SecureStore
const PREFIX = 'nanuda.pref.';

export const prefs = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = Platform.OS === 'web' ? localStorage.getItem(PREFIX + key) : await SecureStore.getItemAsync(PREFIX + key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') localStorage.setItem(PREFIX + key, raw);
    else await SecureStore.setItemAsync(PREFIX + key, raw);
  },
};
