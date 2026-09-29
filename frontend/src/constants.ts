import type { MannerKeywordType, ReportCategory, ReservationStatus } from './api/types';

/**
 * GET /api/manner-keywords는 enum 이름만 내려주고 라벨/대상 역할은 안 내려줘서
 * 백엔드 MannerKeywordType enum을 그대로 옮겨둠. (라벨 바뀌면 여기도 같이 수정)
 */
export const MANNER_KEYWORDS: Record<MannerKeywordType, { label: string; target: 'BUYER' | 'ORGANIZER' }> = {
  BUYER_FAST_PAYMENT: { label: '입금이 빨라요 💸', target: 'BUYER' },
  BUYER_PUNCTUAL: { label: '시간 약속을 칼같이 지켜요 ⏰', target: 'BUYER' },
  BUYER_GOOD_CHAT_MANNER: { label: '채팅 매너가 좋아요 💬', target: 'BUYER' },
  BUYER_KIND: { label: '친절하고 매너가 좋아요 😊', target: 'BUYER' },
  BUYER_QUICK_REPLY: { label: '답장이 빨라요 ⚡', target: 'BUYER' },
  BUYER_ON_TIME_PICKUP: { label: '수령 장소에 제때 와요 📍', target: 'BUYER' },
  BUYER_CLEAR_COMMUNICATION: { label: '필요한 내용을 정확히 말해줘요 🗣️', target: 'BUYER' },
  BUYER_FLEXIBLE: { label: '일정 조율이 유연해요 🤝', target: 'BUYER' },
  BUYER_POLITE: { label: '말투가 공손해요 🙏', target: 'BUYER' },
  BUYER_RECOMMEND: { label: '다음에도 같이 사고 싶어요 🙌', target: 'BUYER' },
  ORGANIZER_CLEAN_PACKAGING: { label: '소분이 깔끔해요 📦', target: 'ORGANIZER' },
  ORGANIZER_FAST_SETTLEMENT: { label: '정산이 빠르고 정확해요 📊', target: 'ORGANIZER' },
  ORGANIZER_FAST_REPLY: { label: '답장이 빠르네요 ⚡', target: 'ORGANIZER' },
  ORGANIZER_KIND: { label: '친절하고 매너가 좋아요 😊', target: 'ORGANIZER' },
  ORGANIZER_PUNCTUAL: { label: '시간 약속을 잘 지켜요 ⏰', target: 'ORGANIZER' },
  ORGANIZER_ACCURATE_INFO: { label: '상품 설명이 정확해요 🔍', target: 'ORGANIZER' },
  ORGANIZER_FAIR_PRICE: { label: '가격이 합리적이에요 💰', target: 'ORGANIZER' },
  ORGANIZER_EASY_PICKUP: { label: '수령이 편했어요 📍', target: 'ORGANIZER' },
  ORGANIZER_CLEAR_NOTICE: { label: '진행 상황을 잘 알려줘요 📢', target: 'ORGANIZER' },
  ORGANIZER_RECOMMEND: { label: '다음 공구도 참여하고 싶어요 🙌', target: 'ORGANIZER' },
};

export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'NO_SHOW', label: '노쇼(잠수)' },
  { value: 'PAYMENT_ISSUE', label: '입금 지연 · 미입금' },
  { value: 'ON_SITE_NEGOTIATION', label: '현장 네고' },
  { value: 'RUDE_BEHAVIOR', label: '비매너 · 욕설' },
  { value: 'FALSE_LISTING', label: '허위 매물' },
];

/** 마이페이지 '문의하기' 메일 수신 주소 — TODO: 운영 문의 메일 정해지면 채우기 (비어 있으면 받는 사람 없이 메일 작성창만 열림) */
export const SUPPORT_EMAIL = '';

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: '대기중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  COMPLETED: '거래완료',
  CANCELLED: '취소됨',
};

export const MAX_BOARD_IMAGES = 5;
