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
    DORM_PARSING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "기숙사 사이트 응답을 해석하는 데 실패했습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
