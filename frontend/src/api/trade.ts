import { del, get, patch, post } from './client';
import type {
  ChatMessage,
  ChatPage,
  ChatRoom,
  MannerKeywordType,
  MannerReviewRes,
  Profile,
  ReportCreateReq,
  Reservation,
  ReservationStatus,
} from './types';

export const reservationApi = {
  /** POST /api/board/{boardId}/reservations — 참여 요청 (PENDING) */
  create: (boardId: number, quantity: number) =>
    post<Reservation>(`/api/board/${boardId}/reservations`, { quantity }),

  /** DELETE /api/reservations/{id} — 구매자 본인의 PENDING 요청 철회 */
  withdraw: (reservationId: number) => del<null>(`/api/reservations/${reservationId}`),

  /**
   * PATCH /api/reservations/{id}/status
   * PENDING → ACCEPTED | REJECTED (방장), ACCEPTED → COMPLETED | CANCELLED
   */
  updateStatus: (reservationId: number, status: Exclude<ReservationStatus, 'PENDING'>) =>
    patch<Reservation>(`/api/reservations/${reservationId}/status`, { status }),

  /** GET /api/board/{boardId}/reservations — 방장 전용, 신청자 거래횟수/노쇼 이력 포함 */
  listByBoard: (boardId: number) => get<Reservation[]>(`/api/board/${boardId}/reservations`),

  /** GET /api/reservations/mine — 내가 보낸 참여 요청 전체 */
  mine: () => get<Reservation[]>('/api/reservations/mine'),
};

export const chatApi = {
  /** GET /api/chat/rooms */
  rooms: () => get<ChatRoom[]>('/api/chat/rooms'),
  /** GET /api/chat/rooms/{roomId} */
  room: (roomId: number) => get<ChatRoom>(`/api/chat/rooms/${roomId}`),
  /** GET /api/chat/messages?roomId=&page= — 최신순(내림차순) 15개씩 */
  messages: (roomId: number, page = 0) =>
    get<ChatPage<ChatMessage>>('/api/chat/messages', { params: { roomId, page } }),
  /** DELETE /api/chat/rooms/{roomId}/leave — 채팅방 나가기(목록에서 삭제) */
  leave: (roomId: number) => del<ChatRoom>(`/api/chat/rooms/${roomId}/leave`),
};

export const mannerApi = {
  /** GET /api/manner-keywords — enum 이름 배열로 내려옴 (라벨은 프론트 MANNER_KEYWORDS 참고) */
  keywords: () => get<MannerKeywordType[]>('/api/manner-keywords'),
  /** POST /api/reservations/{id}/manner-review — 1~3개 */
  review: (reservationId: number, keywords: MannerKeywordType[]) =>
    post<MannerReviewRes>(`/api/reservations/${reservationId}/manner-review`, { keywords }),
};

export const reportApi = {
  /** POST /api/reports */
  create: (body: ReportCreateReq) => post<unknown>('/api/reports', body),
};

export const profileApi = {
  /** GET /api/users/{userId}/profile */
  get: (userId: number) => get<Profile>(`/api/users/${userId}/profile`),
};
