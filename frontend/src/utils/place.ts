/**
 * 수령 장소 = 숭실대 건물 + 상세 위치. 서버엔 location 문자열 하나라서 "건물 상세"로 합쳐 저장하고,
 * 읽을 때는 앞부분이 아래 건물 이름과 일치하는지로 다시 나눔 (직접 입력하던 예전 글도 그대로 보임)
 * TODO: 캠퍼스 건물 목록 변경 시 갱신
 */
export const CAMPUS_BUILDINGS = [
  '레지던스홀',
  '한경직기념관',
  '베어드홀',
  '조만식기념관',
  '안익태기념관',
  '웨스트민스터홀',
  '진리관',
  '신양관',
  '문화관',
  '학생회관',
  '중앙도서관',
  '숭덕경상관',
  '형남공학관',
  '정보과학관',
  '미래관',
  '전산관',
  '연구관',
  '벤처중소기업센터',
  '글로벌브레인홀',
  '백마관',
] as const;

export function splitPlace(location: string | null | undefined): { building: string; detail: string } {
  const text = (location ?? '').trim();
  const building = [...CAMPUS_BUILDINGS]
    .sort((a, b) => b.length - a.length)
    .find((b) => text === b || text.startsWith(`${b} `));
  return building ? { building, detail: text.slice(building.length).trim() } : { building: '', detail: text };
}

export const joinPlace = (building: string, detail: string) => [building, detail.trim()].filter(Boolean).join(' ');

/** 목록 미리보기용: 건물 이름만 (건물을 못 찾은 예전 글은 원문) */
export function placeName(location: string | null | undefined): string {
  const { building, detail } = splitPlace(location);
  return building || detail;
}
