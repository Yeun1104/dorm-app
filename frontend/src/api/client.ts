import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';
import { tokenStorage } from './tokenStorage';
import type { CommonError, CommonRes } from './types';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // refreshToken이 httpOnly 쿠키로 오기 때문에 쿠키를 같이 보내야 /api/auth/refresh가 동작함
  withCredentials: true,
});

/** 서버의 { errorMessage } 를 꺼내서 화면에 바로 띄울 수 있게 만든 에러 */
export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(e: unknown, fallback = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

// ───────── 요청 인터셉터: Bearer 토큰 자동 첨부 ─────────

api.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization) {
    const token = await tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ───────── 응답 인터셉터: 401/403 → 토큰 재발급 1회 시도 후 재요청 ─────────

let onAuthExpired: (() => void) | null = null;
/** 재발급까지 실패했을 때 로그아웃 처리하도록 AuthProvider가 등록 */
export function setAuthExpiredHandler(handler: (() => void) | null) {
  onAuthExpired = handler;
}

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 하도록 공유
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    // 백엔드 AuthController: body의 refreshToken 우선, 없으면 쿠키. 응답은 CommonResDto로 감싸지 않은 { accessToken }
    const refreshToken = await tokenStorage.getRefresh();
    const res = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/api/auth/refresh`,
      refreshToken ? { refreshToken } : {}, // null 대신 빈 객체 전달
      { 
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' } // 명시적으로 JSON 타입 선언
      },
    );
    const token = res.data?.accessToken;
    if (token) {
      await tokenStorage.set(token);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<CommonError>) => {
    const status = error.response?.status;
    const original = error.config as RetriableConfig | undefined;
    const hadToken = !!original?.headers?.Authorization;

    if ((status === 401 || status === 403) && original && !original._retried && hadToken) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      await tokenStorage.clear();
      onAuthExpired?.();
    }

    const serverMessage = error.response?.data?.errorMessage;
    if (serverMessage) return Promise.reject(new ApiError(serverMessage, status));
    if (!error.response) return Promise.reject(new ApiError('서버에 연결할 수 없어요. 네트워크를 확인해주세요.'));
    return Promise.reject(new ApiError(`요청에 실패했어요 (${status})`, status));
  },
);

// ───────── { statusMessage, result } 언래핑 헬퍼 ─────────

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<CommonRes<T>>(url, config);
  return res.data.result;
}

export async function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<CommonRes<T>>(url, body, config);
  return res.data.result;
}

export async function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<CommonRes<T>>(url, body, config);
  return res.data.result;
}

export async function patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<CommonRes<T>>(url, body, config);
  return res.data.result;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<CommonRes<T>>(url, config);
  return res.data.result;
}
