import { del, get, post, put } from './client';
import type {
  DormSearchField,
  DormVerifyRes,
  FoodMenuRes,
  FoodMenuWeekNav,
  InquiryCreateReq,
  InquiryCreateRes,
  InquiryDetail,
  InquiryListItem,
  InquiryUpdateReq,
  IpsaDetail,
  IpsaListItem,
  NoticeDetail,
  NoticeListItem,
  OutingCreateReq,
  OutingCreateRes,
  OutingDetail,
  OutingFormDefaults,
  OutingListItem,
  RepairCreateReq,
  RepairCreateRes,
  RepairDetail,
  RepairListItem,
  RepairUpdateReq,
  SpointRes,
  WriterDefaults,
} from './types';

// 공통 주의사항
// 1) 목록의 displayNo는 화면 표시용. 상세/수정/삭제는 반드시 no 로 호출
// 2) 삭제는 confirm=true 필수 (확인 다이얼로그 이후에만 호출)
// 3) 작성자명/이메일은 서버가 채움 → 폼에서 입력받지 않음

export interface BoardSearch {
  page?: number;
  keyword?: string;
  field?: DormSearchField;
}

const searchParams = ({ page = 0, keyword, field = 'TITLE' }: BoardSearch) => ({
  page,
  keyword: keyword?.trim() || undefined,
  field,
});

export const dormAccountApi = {
  /** POST /api/dorm/account — 등록/갱신 */
  register: (dormUsername: string, dormPassword: string) =>
    post<null>('/api/dorm/account', { dormUsername, dormPassword }),
  /** POST /api/dorm/account/verify — 계정 미등록이면 404 에러, 로그인 실패면 success=false */
  verify: () => post<DormVerifyRes>('/api/dorm/account/verify'),
};

/** 외박신청 / 장기비움신청은 경로만 다르고 구조 동일 */
export type LeaveKind = 'outing' | 'longTerm';

const leaveBase = (kind: LeaveKind) => (kind === 'outing' ? '/api/dorm/outing' : '/api/dorm/long-term-absence');

export const leaveApi = {
  list: (kind: LeaveKind, page = 0) => get<OutingListItem[]>(leaveBase(kind), { params: { page } }),
  detail: (kind: LeaveKind, no: number) => get<OutingDetail>(`${leaveBase(kind)}/${no}`),
  formDefaults: (kind: LeaveKind) => get<OutingFormDefaults>(`${leaveBase(kind)}/new`),
  create: (kind: LeaveKind, body: OutingCreateReq) => post<OutingCreateRes>(leaveBase(kind), body),
  remove: (kind: LeaveKind, no: number) => del<null>(`${leaveBase(kind)}/${no}`, { params: { confirm: true } }),
};

export const repairApi = {
  list: (s: BoardSearch = {}) => get<RepairListItem[]>('/api/dorm/repair', { params: searchParams(s) }),
  detail: (no: number) => get<RepairDetail>(`/api/dorm/repair/${no}`),
  formDefaults: () => get<WriterDefaults>('/api/dorm/repair/new'),
  create: (body: RepairCreateReq) => post<RepairCreateRes>('/api/dorm/repair', body),
  update: (no: number, body: RepairUpdateReq) => put<RepairDetail>(`/api/dorm/repair/${no}`, body),
  remove: (no: number) => del<null>(`/api/dorm/repair/${no}`, { params: { confirm: true } }),
};

export const noticeApi = {
  list: (s: BoardSearch = {}) => get<NoticeListItem[]>('/api/dorm/notice', { params: searchParams(s) }),
  detail: (no: number) => get<NoticeDetail>(`/api/dorm/notice/${no}`),
};

export const inquiryApi = {
  list: (s: BoardSearch = {}) => get<InquiryListItem[]>('/api/dorm/inquiry', { params: searchParams(s) }),
  detail: (no: number) => get<InquiryDetail>(`/api/dorm/inquiry/${no}`),
  formDefaults: () => get<WriterDefaults>('/api/dorm/inquiry/new'),
  create: (body: InquiryCreateReq) => post<InquiryCreateRes>('/api/dorm/inquiry', body),
  update: (no: number, body: InquiryUpdateReq) => put<InquiryDetail>(`/api/dorm/inquiry/${no}`, body),
  remove: (no: number) => del<null>(`/api/dorm/inquiry/${no}`, { params: { confirm: true } }),
};

export const spointApi = {
  get: () => get<SpointRes>('/api/dorm/spoint'),
};

export const ipsaApi = {
  list: () => get<IpsaListItem[]>('/api/dorm/ipsa'),
  /** ⚠️ 번호가 아니라 mozipCode로 조회 */
  detail: (mozipCode: number) => get<IpsaDetail>(`/api/dorm/ipsa/${mozipCode}`),
};

export const foodMenuApi = {
  /** 파라미터 없으면 이번 주. 이전/다음 주는 응답의 prevWeek/nextWeek를 그대로 넘김 */
  get: (week?: FoodMenuWeekNav | null) =>
    get<FoodMenuRes>('/api/dorm/food-menu', { params: week ?? undefined }),
};
