export const won = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('ko-KR')}원`;

/** 서버 LocalDateTime(타임존 없음, Asia/Seoul) → Date */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  if (!d) return '';
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 60) return '방금 전';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return formatDate(iso);
}

export function formatDate(iso: string | null | undefined, sep = '.'): string {
  const d = parseServerDate(iso);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate())].join(sep);
}

/** 채팅 목록용: 오늘이면 "오후 3:20", 어제면 "어제", 그 외엔 "09.21" */
export function chatListTime(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  if (!d) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return clockTime(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function clockTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

/** Date → "yyyy-MM-dd" (LocalDate 직렬화 형식) */
export function toLocalDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-09-24" / "2026.09.24" / "20260924" 모두 허용 */
export function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const d = new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a: Date, b: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 86400000);
}
