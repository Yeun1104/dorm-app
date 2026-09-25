// 백엔드 DTO를 1:1로 옮긴 타입. (backend/src/main/java/com/soongsil/soongpal/**/dto)
// LocalDateTime은 ISO 문자열("2026-09-24T17:33:00")로 내려옴.

/** 모든 API 공통 응답 포맷 */
export interface CommonRes<T> {
  statusMessage: string;
  result: T;
}

/** 에러 응답 포맷 (GlobalExceptionHandler) */
export interface CommonError {
  errorMessage: string;
}

// ───────── 공동구매 게시글 ─────────

export type BoardStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELETED';
export type BoardCategory = 'GROUP';

export interface BoardImage {
  id: number;
  imageUrl: string;
}

export interface Board {
  id: number;
  title: string;
  content: string;
  totalPrice: number;
  totalQuantity: number;
  minPurchaseQuantity: number | null;
  unitPrice: number;
  remainingQuantity: number;
  waitingCount: number;
  url: string | null;
  location: string | null;
  category: BoardCategory;
  status: BoardStatus;
  authorNickname: string;
  /** ⚠️ 현재 BoardResDto에 없음. 백엔드에 추가되면 작성자 프로필 이동이 자동으로 켜짐 */
  authorId?: number;
  createdAt: string;
  images: BoardImage[];
  likeCount: number;
  liked: boolean;
}

export interface BoardPage {
  boards: Board[];
  currentPage: number;
  totalPages: number;
}

export interface BoardCreateReq {
  title: string;
  content: string;
  totalPrice: number;
  totalQuantity: number;
  minPurchaseQuantity?: number;
  url?: string;
  location?: string;
  category: BoardCategory;
}

export interface LikeRes {
  boardId: number;
  count: number;
}

// ───────── 참여 요청(예약) ─────────

export type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface Reservation {
  id: number;
  boardId: number;
  buyerId: number;
  buyerNickname: string;
  /** PENDING 동안은 null */
  chatRoomId: number | null;
  quantity: number;
  subtotal: number;
  status: ReservationStatus;
  createdAt: string;
  /** GET /api/board/{id}/reservations (방장 전용)에서만 채워짐 */
  buyerTradeCount?: number | null;
  buyerNoShowReportCount?: number | null;
}

// ───────── 채팅 ─────────

export interface ChatRoomUser {
  userId: number;
  userName: string;
  profileImage: string | null;
}

export interface ChatRoom {
  id: number;
  name: string;
  productId: number;
  productTitle: string;
  type: 'PRIVATE' | 'GROUP';
  userCount: number;
  users: ChatRoomUser[];
  lastMessage: string | null;
  lastMessageTime: string | null;
}

export interface ChatMessage {
  roomId: number;
  senderId: number;
  senderName: string;
  content: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatPage<T> {
  content: T[];
  currentPage: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ───────── 매너 평가 ─────────

export type MannerKeywordType =
  | 'BUYER_FAST_PAYMENT'
  | 'BUYER_PUNCTUAL'
  | 'BUYER_GOOD_CHAT_MANNER'
  | 'ORGANIZER_CLEAN_PACKAGING'
  | 'ORGANIZER_FAST_SETTLEMENT'
  | 'ORGANIZER_FAST_REPLY';

export interface MannerReviewRes {
  id: number;
  reservationId: number;
  reviewerId: number;
  revieweeId: number;
  keywords: MannerKeywordType[];
  keywordLabels: string[];
}

export interface MannerBadge {
  label: string;
  count: number;
}

// ───────── 신고 ─────────

export type ReportCategory =
  | 'NO_SHOW'
  | 'PAYMENT_ISSUE'
  | 'ON_SITE_NEGOTIATION'
  | 'RUDE_BEHAVIOR'
  | 'FALSE_LISTING';

export interface ReportCreateReq {
  reportedUserId: number;
  relatedBoardId?: number;
  category: ReportCategory;
  reason: string;
}

// ───────── 사용자 ─────────

/** GET /api/users/me — ⚠️ CommonResDto로 감싸지 않은 raw 응답 */
export interface UserInfo {
  userId: number;
  nickname: string;
  email: string;
  kakaoId: string;
}

export interface BoardSummary {
  id: number;
  title: string;
  totalPrice: number;
  totalQuantity: number;
  unitPrice: number;
  status: BoardStatus;
  createdAt: string;
}

export interface Profile {
  userId: number;
  nickname: string;
  tradeCount: number;
  topMannerBadges: MannerBadge[];
  inProgressBoards: BoardSummary[];
  completedBoards: BoardSummary[];
}

// ───────── 기숙사 ─────────

export interface DormVerifyRes {
  success: boolean;
  message: string;
}

/** 검색 대상 필드 (RepairSearchField) — 고쳐주세요/공지/일반문의 공통 */
export type DormSearchField = 'TITLE' | 'CONTENT' | 'WRITER';

export interface OutingListItem {
  displayNo: number;
  startDate: string;
  endDate: string;
  writtenAt: string;
  status: string;
  statusRawIcon: string;
  /** 상세/삭제용 ID. displayNo와 다름 */
  no: number | null;
}

export interface OutingDetail {
  applicationNo: number;
  applicantName: string;
  room: string;
  seat: string;
  writtenAt: string;
  phone: string;
  resultStatus: string;
  startDate: string;
  endDate: string;
  memo: string;
}

export interface OutingFormDefaults {
  applicantName: string;
  room: string;
  seat: string;
  phone1: string;
  phone2: string;
  phone3: string;
  defaultStartDate: string;
  defaultEndDate: string;
  maxEndDate: string | null;
  moZipCode: string;
}

/** startDate/endDate: "yyyy-MM-dd" (LocalDate) */
export interface OutingCreateReq {
  startDate: string;
  endDate: string;
  memo: string;
}

export interface OutingCreateRes {
  confirmed: boolean;
  createdItem: OutingListItem | null;
}

export interface RepairListItem {
  displayNo: number;
  no: number;
  title: string;
  writer: string;
  viewCount: number;
  writtenDate: string;
  isNew: boolean;
}

export interface RepairDetail {
  postNo: number;
  title: string;
  writer: string;
  viewCount: number;
  writtenAt: string;
  visitAllowed: string;
  content: string;
}

export interface WriterDefaults {
  writerName: string;
  writerEmail: string;
}

export interface RepairCreateReq {
  title: string;
  content: string;
  postPassword: string;
  visitAllowed: boolean;
}

export interface RepairUpdateReq {
  title: string;
  content: string;
  visitAllowed: boolean;
}

export interface RepairCreateRes {
  confirmed: boolean;
  createdItem: RepairListItem | null;
}

export interface NoticeListItem {
  displayNo: number;
  no: number;
  title: string;
  writer: string;
  viewCount: number;
  writtenDate: string;
  isNew: boolean;
}

export interface NoticeDetail {
  postNo: number;
  title: string;
  writer: string;
  viewCount: number;
  writtenAt: string;
  content: string;
}

export interface InquiryListItem {
  displayNo: number;
  no: number;
  title: string;
  writer: string;
  viewCount: number;
  writtenDate: string;
  isNew: boolean;
  isSecret: boolean;
  replyCount: number;
}

export interface InquiryDetail {
  postNo: number;
  locked: boolean;
  title: string;
  writer: string;
  viewCount: number;
  writtenAt: string;
  content: string;
}

export interface InquiryCreateReq {
  title: string;
  content: string;
  postPassword: string;
  isSecret: boolean;
}

export interface InquiryUpdateReq {
  title: string;
  content: string;
  isSecret: boolean;
}

export interface InquiryCreateRes {
  confirmed: boolean;
  createdItem: InquiryListItem | null;
}

export interface SpointItem {
  no: number;
  date: string;
  reason: string;
  point: number;
  isBonus: boolean;
}

export interface SpointYearTotal {
  year: string;
  total: number;
}

export interface SpointRes {
  items: SpointItem[];
  yearlyTotals: SpointYearTotal[];
}

export interface IpsaListItem {
  displayNo: number;
  mozipCode: number;
  recruitType: string;
  selectionStatus: string;
  residencePeriod: string;
  roommateInfo: string;
}

export interface IpsaDetail {
  mozipCode: number;
  /** 라벨:값 맵. 건마다 키 구성이 달라질 수 있음 */
  fields: Record<string, string>;
}

export interface FoodMenuDay {
  date: string;
  dayOfWeek: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  combinedMeal: string[];
}

export interface FoodMenuWeekNav {
  gyear: string;
  gmonth: string;
  gday: string;
}

export interface FoodMenuRes {
  weekLabel: string;
  days: FoodMenuDay[];
  prevWeek: FoodMenuWeekNav | null;
  nextWeek: FoodMenuWeekNav | null;
}
