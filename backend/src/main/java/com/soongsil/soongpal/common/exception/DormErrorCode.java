package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DormErrorCode {
    DORM_ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "등록된 기숙사 계정이 없습니다. 먼저 기숙사 계정을 등록해주세요."),
    DORM_LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "기숙사 사이트 로그인에 실패했습니다. 아이디/비밀번호를 확인해주세요."),
    DORM_CONNECTION_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "기숙사 사이트에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."),
    DORM_PARSING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "기숙사 사이트 응답을 해석하는 데 실패했습니다."),

    // 외박신청/장기비움신청 작성 검증 (ssudorm 사이트 자체 JS 검증 규칙과 동일하게 서버에서도 미리 체크)
    // 두 게시판이 폼을 공유해서 메시지는 일반화된 표현("신청")으로 씀
    OUTING_MEMO_REQUIRED(HttpStatus.BAD_REQUEST, "사유를 입력해주세요."),
    OUTING_MEMO_TOO_LONG(HttpStatus.BAD_REQUEST, "사유는 255바이트를 초과할 수 없습니다."),
    OUTING_INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "종료일은 시작일보다 빠를 수 없습니다."),
    OUTING_DURATION_TOO_SHORT(HttpStatus.BAD_REQUEST, "1일 이상 기간을 선택해주세요."),
    OUTING_DURATION_TOO_LONG(HttpStatus.BAD_REQUEST, "6일을 초과하는 외박은 장기비움신청을 이용해주세요."),
    LONG_TERM_ABSENCE_DURATION_TOO_SHORT(HttpStatus.BAD_REQUEST, "7일 미만은 외박신청을 이용해주세요."),
    OUTING_START_DATE_IN_PAST(HttpStatus.BAD_REQUEST, "시작일은 오늘 이후로 선택해주세요."),
    OUTING_END_DATE_EXCEEDS_LIMIT(HttpStatus.BAD_REQUEST, "신청 가능 기간을 초과했습니다."),
    OUTING_SUBMIT_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "기숙사 사이트에 제출은 했지만 정상 처리됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),
    OUTING_DELETE_CONFIRM_REQUIRED(HttpStatus.BAD_REQUEST, "삭제하려면 confirm=true를 함께 보내주세요. (되돌릴 수 없는 작업입니다)"),
    OUTING_DELETE_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "삭제를 시도했지만 정상 처리됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),

    // 고쳐주세요 게시판
    REPAIR_SUBMIT_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "기숙사 사이트에 글을 올리긴 했지만 정상 등록됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),
    REPAIR_EDIT_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "수정 요청은 보냈지만 정상 반영됐는지 확인하지 못했습니다. 잠시 후 다시 확인해주세요."),
    REPAIR_DELETE_CONFIRM_REQUIRED(HttpStatus.BAD_REQUEST, "삭제하려면 confirm=true를 함께 보내주세요. (되돌릴 수 없는 작업입니다)"),
    REPAIR_DELETE_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "삭제를 시도했지만 정상 처리됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),
    REPAIR_NOT_OWNER(HttpStatus.FORBIDDEN, "본인이 작성한 글만 수정/삭제할 수 있습니다."),

    // 일반문의및상담 게시판
    INQUIRY_SUBMIT_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "기숙사 사이트에 글을 올리긴 했지만 정상 등록됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),
    INQUIRY_EDIT_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "수정 요청은 보냈지만 정상 반영됐는지 확인하지 못했습니다. 잠시 후 다시 확인해주세요."),
    INQUIRY_DELETE_CONFIRM_REQUIRED(HttpStatus.BAD_REQUEST, "삭제하려면 confirm=true를 함께 보내주세요. (되돌릴 수 없는 작업입니다)"),
    INQUIRY_DELETE_UNCONFIRMED(HttpStatus.INTERNAL_SERVER_ERROR, "삭제를 시도했지만 정상 처리됐는지 확인하지 못했습니다. 잠시 후 목록에서 직접 확인해주세요."),
    INQUIRY_NOT_OWNER(HttpStatus.FORBIDDEN, "본인이 작성한 글만 수정/삭제할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
