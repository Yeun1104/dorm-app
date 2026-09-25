import { api, del, get, patch, post } from './client';
import { Platform } from 'react-native';
import type { Board, BoardCreateReq, BoardPage, BoardStatus, CommonRes, LikeRes } from './types';

export interface LocalImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

/** @RequestPart로 받는 JSON 파트 — Content-Type이 반드시 application/json이어야 함 */
function jsonPart(value: unknown): Blob {
  const json = JSON.stringify(value);
  // 웹: 브라우저 표준 Blob / 앱: React Native FormData 꼼수
  return Platform.OS === 'web'
    ? new Blob([json], { type: 'application/json' })
    : ({ string: json, type: 'application/json' } as unknown as Blob);
}

/**
 * 이미지 파일 파트 추가.
 * 웹에서는 { uri, name, type } 객체가 파일로 인식되지 않아서(문자열 "[object Object]"로 전송됨) blob으로 변환해서 붙임.
 * 서버(S3Uploader)가 파일명에서 확장자를 잘라 쓰므로 확장자가 없으면 mimeType으로 붙여줌.
 */
async function appendImage(form: FormData, field: string, img: LocalImage, index: number) {
  const type = img.mimeType ?? 'image/jpeg';
  let name = img.fileName ?? `image_${index}`;
  if (!/\.\w+$/.test(name)) name += `.${type.split('/')[1] ?? 'jpg'}`;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(img.uri)).blob();
    form.append(field, blob, name);
  } else {
    form.append(field, { uri: img.uri, name, type } as unknown as Blob);
  }
}

async function sendMultipart(method: 'post' | 'put', url: string, form: FormData): Promise<Board> {
  const res = await api.request<CommonRes<Board>>({
    method,
    url,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (d) => d,
  });
  return res.data.result;
}

export const boardApi = {
  /** GET /api/board?page=&keyword=&status= */
  list: (params: { page?: number; keyword?: string; status?: BoardStatus } = {}) =>
    get<BoardPage>('/api/board', { params: { page: params.page ?? 0, keyword: params.keyword || undefined, status: params.status } }),

  /** GET /api/board/{id} */
  detail: (id: number) => get<Board>(`/api/board/${id}`),

  /**
   * POST /api/board (multipart)
   * - "board" 파트: JSON
   * - "images" 파트: 파일 여러 개 (최대 5장은 프론트에서 제한)
   */
  async create(body: BoardCreateReq, images: LocalImage[]): Promise<Board> {
    const form = new FormData();
    form.append('board', jsonPart(body));
    for (const [i, img] of images.entries()) await appendImage(form, 'images', img, i);
    return sendMultipart('post', '/api/board', form);
  },

  /**
   * PUT /api/board/{id} (multipart)
   * - "board" 파트: JSON (생성과 같은 필드)
   * - "newImages" 파트: 새로 추가할 파일들
   * - "deleteImageIds" 파트: 지울 기존 이미지 id 배열 (JSON)
   */
  async update(id: number, body: BoardCreateReq, newImages: LocalImage[], deleteImageIds: number[]): Promise<Board> {
    const form = new FormData();
    form.append('board', jsonPart(body));
    for (const [i, img] of newImages.entries()) await appendImage(form, 'newImages', img, i);
    if (deleteImageIds.length) form.append('deleteImageIds', jsonPart(deleteImageIds));
    return sendMultipart('put', `/api/board/${id}`, form);
  },

  /** PATCH /api/board/{id}/status — 모집중/모집완료 전환 */
  updateStatus: (id: number, status: BoardStatus) => patch<Board>(`/api/board/${id}/status`, { status }),

  /** DELETE /api/board/{id} */
  remove: (id: number) => del<null>(`/api/board/${id}`),

  like: (id: number) => post<LikeRes>(`/api/board/${id}/like`),
  unlike: (id: number) => del<LikeRes>(`/api/board/${id}/like`),
};
