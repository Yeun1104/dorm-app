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

    ORGANIZER_CLEAN_PACKAGING("소분이 깔끔해요 📦", MannerTargetRole.ORGANIZER),
    ORGANIZER_FAST_SETTLEMENT("정산이 빠르고 정확해요 📊", MannerTargetRole.ORGANIZER),
    ORGANIZER_FAST_REPLY("답장이 빠르네요 ⚡", MannerTargetRole.ORGANIZER);

    private final String label;
    private final MannerTargetRole targetRole;
}
