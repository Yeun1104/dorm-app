import { del, get, patch, put } from './client';
import type { AppNotification, NotificationPreference, SpringPage } from './types';

export const notificationApi = {
  /** GET /api/notifications?page= — 최신순 */
  list: (page = 0) => get<SpringPage<AppNotification>>('/api/notifications', { params: { page } }),
  /** GET /api/notifications/unread-count */
  unreadCount: async () => (await get<{ unreadCount: number }>('/api/notifications/unread-count')).unreadCount,
  /** PATCH /api/notifications/{id}/read */
  markRead: (id: number) => patch<null>(`/api/notifications/${id}/read`),
  /** DELETE /api/notifications/{id} */
  remove: (id: number) => del<null>(`/api/notifications/${id}`),
  /** GET /api/notifications/preference — 설정한 적 없으면 전부 true */
  preference: () => get<NotificationPreference>('/api/notifications/preference'),
  /** PUT /api/notifications/preference — 4개 값을 한 번에 다 보내야 함 */
  updatePreference: (pref: NotificationPreference) => put<NotificationPreference>('/api/notifications/preference', pref),
};
