package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MannerReviewErrorCode {
    RESERVATION_NOT_COMPLETED(HttpStatus.BAD_REQUEST, "거래가 완료된 예약에만 매너 평가를 남길 수 있습니다."),
    NOT_A_PARTICIPANT(HttpStatus.FORBIDDEN, "이 거래의 당사자만 평가를 남길 수 있습니다."),
    ALREADY_REVIEWED(HttpStatus.CONFLICT, "이미 이 거래에 대한 평가를 남겼습니다."),
    KEYWORD_COUNT_INVALID(HttpStatus.BAD_REQUEST, "키워드는 1개 이상 3개 이하로 선택해주세요."),
    KEYWORD_ROLE_MISMATCH(HttpStatus.BAD_REQUEST, "상대방 역할에 맞는 키워드만 선택할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
