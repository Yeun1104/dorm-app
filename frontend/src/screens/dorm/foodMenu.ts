import type { FoodMenuDay } from '../../api/types';
import { parseLocalDate } from '../../utils/format';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 이 시각(시)부터는 저녁 메뉴를 미리보기로 보여줌 */
export const DINNER_PREVIEW_FROM_HOUR = 14;

/** 식단 응답의 date 포맷이 사이트에 따라 달라서 날짜 → 요일 순으로 오늘을 찾음 */
export function findToday(days: FoodMenuDay[]): FoodMenuDay | undefined {
  const today = new Date();
  return (
    days.find((d) => parseLocalDate(d.date)?.toDateString() === today.toDateString()) ??
    days.find((d) => d.dayOfWeek?.startsWith(WEEKDAYS[today.getDay()]))
  );
}

// "식당운영을 하지 않습니다", "미운영", "휴무" 같은 운영 중단 안내 문구
const CLOSED_PATTERN = /운영\s*(을|를)?\s*(하지|안\s*함|않)|미운영|휴무|휴관|휴업|운영\s*중단/;

export const isClosedText = (items: string[] | undefined) => !!items?.some((t) => CLOSED_PATTERN.test(t));

/** 칸에서 운영 안내 문구를 뺀 실제 메뉴만 */
export const menuItems = (items: string[] | undefined) => (items ?? []).filter((t) => !CLOSED_PATTERN.test(t));

/**
 * 하루 전체가 미운영인지.
 * 조식은 운영하지 않아서 식당이 조식 칸에 '조식 운영하지 않습니다' 같은 공지를 거의 매일 적어둠 → 조식 칸은 판단에 쓰지 않고,
 * 중식/석식/일품 중 실제 메뉴가 하나도 없을 때만 미운영으로 봄. notice는 화면에 같이 보여줄 원문 안내.
 */
export function dayClosure(day: FoodMenuDay | undefined): { closed: boolean; notice: string | null } {
  if (!day) return { closed: false, notice: null };
  const served = [day.lunch, day.dinner, day.combinedMeal].some((m) => menuItems(m).length > 0);
  if (served) return { closed: false, notice: null };
  const noticeSource = [day.lunch, day.dinner, day.combinedMeal, day.breakfast].find(isClosedText);
  return { closed: true, notice: noticeSource ? noticeSource.join(' ') : null };
}

export type MealPreview =
  | { kind: 'menu'; label: '점심' | '저녁'; items: string[] }
  | { kind: 'closed'; label: '점심' | '저녁' | '오늘'; notice: string | null }
  | { kind: 'none' };

/** 기숙사 홈 상단 미리보기: 14시 전이면 점심(없으면 일품), 이후면 저녁 */
export function mealPreview(day: FoodMenuDay | undefined, now = new Date()): MealPreview {
  if (!day) return { kind: 'none' };
  const closure = dayClosure(day);
  if (closure.closed) return { kind: 'closed', label: '오늘', notice: closure.notice };

  const dinnerTime = now.getHours() >= DINNER_PREVIEW_FROM_HOUR;
  const label = dinnerTime ? '저녁' : '점심';
  const raw = dinnerTime ? day.dinner : menuItems(day.lunch).length ? day.lunch : day.combinedMeal;
  const items = menuItems(raw);
  if (!items.length) return { kind: 'closed', label, notice: isClosedText(raw) ? raw.join(' ') : null };
  return { kind: 'menu', label, items };
}
