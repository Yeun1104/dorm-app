// 한글 초성/조합 중 글자까지 고려한 실시간 검색 (예: 'ㄱ' → 글로벌브레인홀, 'ㅎㄱ' → 한경직기념관, '한경지' → 한경직기념관)

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const BASE = 0xac00;
const LAST = 0xd7a3;

const syllable = (ch: string) => {
  const code = ch.charCodeAt(0);
  if (code < BASE || code > LAST) return null;
  const n = code - BASE;
  return { cho: Math.floor(n / 588), jung: Math.floor((n % 588) / 28), jong: n % 28 };
};

/** 입력 글자 q가 대상 글자 t에 맞는지. 마지막 글자는 아직 조합 중일 수 있어서 받침 없는 상태도 허용 */
function charMatches(q: string, t: string, isLast: boolean): boolean {
  if (q === t) return true;
  const ts = syllable(t);
  const choIndex = CHO.indexOf(q);
  if (choIndex >= 0) return !!ts && ts.cho === choIndex;
  const qs = syllable(q);
  if (isLast && qs && ts && qs.jong === 0) return qs.cho === ts.cho && qs.jung === ts.jung;
  return q.toLowerCase() === t.toLowerCase();
}

/**
 * target 안에서 query가 처음 맞는 위치 (없으면 -1).
 * 기본은 앞에서부터만 비교하고, 완성된 글자가 섞인 2글자 이상 검색어일 때만 중간 일치도 허용
 * ('ㄱ'은 ㄱ으로 시작하는 것만, '도서'는 중앙도서관도)
 */
export function hangulIndexOf(target: string, query: string): number {
  const q = query.replace(/\s/g, '');
  if (!q) return 0;
  const t = target.replace(/\s/g, '');
  const allowMiddle = q.length >= 2 && [...q].some((c) => !CHO.includes(c));
  for (let i = 0; i + q.length <= t.length && (i === 0 || allowMiddle); i++) {
    let ok = true;
    for (let j = 0; j < q.length && ok; j++) ok = charMatches(q[j], t[i + j], j === q.length - 1);
    if (ok) return i;
  }
  return -1;
}

/** query로 걸러서 앞에서부터 맞는 것 우선 정렬 */
export function hangulFilter<T extends string>(items: readonly T[], query: string): T[] {
  return items
    .map((item, order) => ({ item, order, at: hangulIndexOf(item, query) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at || a.order - b.order)
    .map((x) => x.item);
}
