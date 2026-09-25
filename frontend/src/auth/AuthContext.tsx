import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthExpiredHandler } from '../api/client';
import { tokenStorage } from '../api/tokenStorage';
import type { UserInfo } from '../api/types';
import { authApi, userApi } from '../api/user';
import { API_BASE_URL } from '../config';

WebBrowser.maybeCompleteAuthSession();

/**
 * 카카오 로그인 후 백엔드(OAuth2AuthenticationSuccessHandler)가 돌려보내는 앱 주소.
 * 백엔드 환경변수 APP_REDIRECT_URI를 이 값으로 맞춰야 함.
 *  - 개발빌드/스토어빌드: soongpal://auth
 *  - Expo Go: exp://<PC IP>:8081/--/auth (앱 실행 로그에 출력됨)
 */
export const OAUTH_REDIRECT_URL = Linking.createURL('auth');

export type KakaoLoginResult = { type: 'signedIn' } | { type: 'needSignup'; tempToken: string } | { type: 'cancelled' };

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; me: UserInfo };

interface AuthContextValue {
  state: AuthState;
  me: UserInfo | null;
  loginWithKakao: () => Promise<KakaoLoginResult>;
  completeSignup: (tempToken: string, nickname: string) => Promise<void>;
  devLogin: (nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** 기숙사 계정 연동 여부. null = 아직 확인 안 함 (세션당 1번만 verify 호출) */
  dormLinked: boolean | null;
  setDormLinked: (v: boolean | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [dormLinked, setDormLinked] = useState<boolean | null>(null);

  const signOutLocal = useCallback(async () => {
    await tokenStorage.clear();
    setDormLinked(null);
    setState({ status: 'signedOut' });
  }, []);

  const loadMe = useCallback(async () => {
    const me = await userApi.me();
    setState({ status: 'signedIn', me });
  }, []);

  const signInWithToken = useCallback(
    async (accessToken: string, refreshToken?: string | null) => {
      await tokenStorage.set(accessToken);
      await tokenStorage.setRefresh(refreshToken);
      await loadMe();
    },
    [loadMe],
  );

  // 앱 시작 시 저장된 토큰으로 자동 로그인
  useEffect(() => {
    (async () => {
      const token = await tokenStorage.get();
      if (!token) return setState({ status: 'signedOut' });
      try {
        await loadMe();
      } catch {
        await signOutLocal();
      }
    })();
  }, [loadMe, signOutLocal]);

  // 토큰 재발급까지 실패하면 로그인 화면으로
  useEffect(() => {
    setAuthExpiredHandler(() => {
      setDormLinked(null);
      setState({ status: 'signedOut' });
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  const loginWithKakao = useCallback(async (): Promise<KakaoLoginResult> => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${API_BASE_URL}/oauth2/authorization/kakao`,
      OAUTH_REDIRECT_URL,
    );
    if (result.type !== 'success') return { type: 'cancelled' };

    const { queryParams } = Linking.parse(result.url);
    const accessToken = queryParams?.access_token;
    const refreshToken = queryParams?.refresh_token;
    const tempToken = queryParams?.temp_token;
    if (typeof accessToken === 'string') {
      await signInWithToken(accessToken, typeof refreshToken === 'string' ? refreshToken : null);
      return { type: 'signedIn' };
    }
    if (typeof tempToken === 'string') return { type: 'needSignup', tempToken };
    return { type: 'cancelled' };
  }, [signInWithToken]);

  const completeSignup = useCallback(
    async (tempToken: string, nickname: string) => {
      const { accessToken, refreshToken } = await authApi.register(tempToken, nickname);
      await signInWithToken(accessToken, refreshToken);
    },
    [signInWithToken],
  );

  const devLogin = useCallback(
    async (nickname: string) => {
      const token = await authApi.devToken(`dev-${nickname}`, nickname);
      await signInWithToken(token);
    },
    [signInWithToken],
  );

  const logout = useCallback(async () => {
    try {
      await userApi.logout();
    } finally {
      await signOutLocal();
    }
  }, [signOutLocal]);

  const withdraw = useCallback(async () => {
    await userApi.withdraw();
    await signOutLocal();
  }, [signOutLocal]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      me: state.status === 'signedIn' ? state.me : null,
      loginWithKakao,
      completeSignup,
      devLogin,
      logout,
      withdraw,
      refreshMe: loadMe,
      dormLinked,
      setDormLinked,
    }),
    [state, loginWithKakao, completeSignup, devLogin, logout, withdraw, loadMe, dormLinked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** 로그인된 화면에서만 쓰는 훅 (me가 항상 존재) */
export function useMe(): UserInfo {
  const { me } = useAuth();
  if (!me) throw new Error('useMe called while signed out');
  return me;
}
