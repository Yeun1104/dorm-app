import { api, get, post } from './client';
import type { BoardPage, UserInfo } from './types';

// ⚠️ /api/users/*, /api/auth/* 는 CommonResDto로 감싸지 않은 raw 응답이라 api를 직접 씀

export const userApi = {
  /** GET /api/users/me */
  me: async () => (await api.get<UserInfo>('/api/users/me')).data,
  /** PATCH /api/users/me — 닉네임 변경 */
  updateNickname: async (nickname: string) => (await api.patch<UserInfo>('/api/users/me', { nickname })).data,
  /** POST /api/users/logout */
  logout: async () => {
    await api.post('/api/users/logout');
  },
  /** DELETE /api/users/me — 탈퇴 */
  withdraw: async () => {
    await api.delete('/api/users/me');
  },

  /** GET /api/my-page/like?page= */
  likedBoards: (page = 0) => get<BoardPage>('/api/my-page/like', { params: { page } }),
  /** GET /api/my-page/posts?page= */
  myBoards: (page = 0) => get<BoardPage>('/api/my-page/posts', { params: { page } }),
};

export const authApi = {
  /** POST /api/auth/register — 카카오 첫 로그인 후 temp_token + 닉네임으로 가입 */
  register: async (tempToken: string, nickname: string) =>
    (
      await api.post<{ accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        { nickname },
        { headers: { Authorization: `Bearer ${tempToken}` } },
      )
    ).data,

  /** POST /api/dev/auth/token — ⚠️ 로컬 개발 전용 (app.feature.dev-tools.enabled=true 일 때만 존재) */
  devToken: (kakaoId: string, nickname: string) =>
    post<string>('/api/dev/auth/token', null, { params: { kakaoId, nickname } }),
};
