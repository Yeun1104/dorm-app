import { prefs } from './prefs';

// 서버에 '내가 이 거래를 평가했는지' 조회 API가 없어서, 보낸 매너 평가는 기기에 기록해두고 안내 배너를 숨김
const KEY = 'reviewedReservations';

export const isReviewed = async (reservationId: number) => (await prefs.get<number[]>(KEY, [])).includes(reservationId);

export async function markReviewed(reservationId: number) {
  const list = await prefs.get<number[]>(KEY, []);
  if (!list.includes(reservationId)) await prefs.set(KEY, [...list, reservationId].slice(-200));
}
