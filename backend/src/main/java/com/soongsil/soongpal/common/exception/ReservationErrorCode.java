package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ReservationErrorCode {
    RESERVATION_NOT_FOUND(HttpStatus.NOT_FOUND, "예약 내역을 찾을 수 없습니다."),
    RESERVATION_OWNER_ONLY(HttpStatus.FORBIDDEN, "게시글 작성자만 참여 요청을 수락/거절/상태변경할 수 있습니다."),
    RESERVATION_LIST_VIEW_DENIED(HttpStatus.FORBIDDEN, "게시글 작성자만 참여 요청 목록을 볼 수 있습니다."),
    RESERVATION_BUYER_ONLY(HttpStatus.FORBIDDEN, "본인이 보낸 참여 요청만 취소할 수 있습니다."),
    RESERVATION_SELF_PURCHASE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "본인 게시글은 구매 신청할 수 없습니다."),
    RESERVATION_QUANTITY_EXCEEDS_REMAINING(HttpStatus.BAD_REQUEST, "남은 수량보다 많이 신청할 수 없습니다."),
    RESERVATION_BELOW_MIN_QUANTITY(HttpStatus.BAD_REQUEST, "최소 구매 수량보다 적게 신청할 수 없습니다."),
    RESERVATION_INVALID_STATUS_TRANSITION(HttpStatus.BAD_REQUEST, "허용되지 않는 예약 상태 변경입니다."),
    RESERVATION_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 방장이 처리한 요청은 취소할 수 없습니다."),
    RESERVATION_BOARD_NOT_PURCHASABLE(HttpStatus.BAD_REQUEST, "구매 신청할 수 없는 게시글입니다. (마감되었거나 삭제됨)");

    private final HttpStatus httpStatus;
    private final String message;
}
