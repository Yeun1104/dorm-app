package com.soongsil.soongpal.manner.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 거래 완료 후 서로에게 주는 칭찬 키워드.
 * BUYER 키워드는 "총대가 구매자에게" 주는 것, ORGANIZER 키워드는 "구매자가 총대에게" 주는 것.
 */
@Getter
@RequiredArgsConstructor
public enum MannerKeywordType {
    BUYER_FAST_PAYMENT("입금이 빨라요 💸", MannerTargetRole.BUYER),
    BUYER_PUNCTUAL("시간 약속을 칼같이 지켜요 ⏰", MannerTargetRole.BUYER),
    BUYER_GOOD_CHAT_MANNER("채팅 매너가 좋아요 💬", MannerTargetRole.BUYER),
    BUYER_KIND("친절하고 매너가 좋아요 😊", MannerTargetRole.BUYER),
    BUYER_QUICK_REPLY("답장이 빨라요 ⚡", MannerTargetRole.BUYER),
    BUYER_ON_TIME_PICKUP("수령 장소에 제때 와요 📍", MannerTargetRole.BUYER),
    BUYER_CLEAR_COMMUNICATION("필요한 내용을 정확히 말해줘요 🗣️", MannerTargetRole.BUYER),
    BUYER_FLEXIBLE("일정 조율이 유연해요 🤝", MannerTargetRole.BUYER),
    BUYER_POLITE("말투가 공손해요 🙏", MannerTargetRole.BUYER),
    BUYER_RECOMMEND("다음에도 같이 사고 싶어요 🙌", MannerTargetRole.BUYER),

    ORGANIZER_CLEAN_PACKAGING("소분이 깔끔해요 📦", MannerTargetRole.ORGANIZER),
    ORGANIZER_FAST_SETTLEMENT("정산이 빠르고 정확해요 📊", MannerTargetRole.ORGANIZER),
    ORGANIZER_FAST_REPLY("답장이 빠르네요 ⚡", MannerTargetRole.ORGANIZER),
    ORGANIZER_KIND("친절하고 매너가 좋아요 😊", MannerTargetRole.ORGANIZER),
    ORGANIZER_PUNCTUAL("시간 약속을 잘 지켜요 ⏰", MannerTargetRole.ORGANIZER),
    ORGANIZER_ACCURATE_INFO("상품 설명이 정확해요 🔍", MannerTargetRole.ORGANIZER),
    ORGANIZER_FAIR_PRICE("가격이 합리적이에요 💰", MannerTargetRole.ORGANIZER),
    ORGANIZER_EASY_PICKUP("수령이 편했어요 📍", MannerTargetRole.ORGANIZER),
    ORGANIZER_CLEAR_NOTICE("진행 상황을 잘 알려줘요 📢", MannerTargetRole.ORGANIZER),
    ORGANIZER_RECOMMEND("다음 공구도 참여하고 싶어요 🙌", MannerTargetRole.ORGANIZER);

    private final String label;
    private final MannerTargetRole targetRole;
}
