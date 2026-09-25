import { api, del, get, patch, post } from './client';
import { Platform } from 'react-native';
import type { Board, BoardCreateReq, BoardPage, BoardStatus, CommonRes, LikeRes } from './types';

export interface LocalImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export const boardApi = {
  /** GET /api/board?page=&keyword=&status= */
  list: (params: { page?: number; keyword?: string; status?: BoardStatus } = {}) =>
    get<BoardPage>('/api/board', { params: { page: params.page ?? 0, keyword: params.keyword || undefined, status: params.status } }),

  /** GET /api/board/{id} */
  detail: (id: number) => get<Board>(`/api/board/${id}`),

  /**
   * POST /api/board (multipart)
   * - "board" 파트: JSON (application/json) — @RequestPart라 Content-Type이 반드시 json이어야 함
   * - "images" 파트: 파일 여러 개 (최대 5장은 프론트에서 제한)
   */
  async create(body: BoardCreateReq, images: LocalImage[]): Promise<Board> {
    const form = new FormData();
    
    // 1. JSON DTO 파트 (Web과 App 분기)
    if (Platform.OS === 'web') {
      // 웹 환경: 브라우저 표준 Blob 객체 사용
      form.append('board', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    } else {
      // 앱 환경: React Native 꼼수 유지
      form.append('board', {
        string: JSON.stringify(body),
        type: 'application/json',
      } as unknown as Blob);
    }

    images.forEach((img, i) => {
      form.append('images', {
        uri: img.uri,
        name: img.fileName ?? `image_${i}.jpg`,
        type: img.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    });

    const res = await api.post<CommonRes<Board>>('/api/board', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (d) => d,
    });
    return res.data.result;
  },

  /** PATCH /api/board/{id}/status — 모집중/모집완료 전환 */
  updateStatus: (id: number, status: BoardStatus) => patch<Board>(`/api/board/${id}/status`, { status }),

  /** DELETE /api/board/{id} */
  remove: (id: number) => del<null>(`/api/board/${id}`),

  like: (id: number) => post<LikeRes>(`/api/board/${id}/like`),
  unlike: (id: number) => del<LikeRes>(`/api/board/${id}/like`),
};
