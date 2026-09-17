package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum UserErrorCode {
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    USER_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 존재하는 사용자입니다."),
    INVALID_USER_CREDENTIALS(HttpStatus.UNAUTHORIZED, "잘못된 사용자 인증 정보입니다."),
    USER_ACCESS_DENIED(HttpStatus.FORBIDDEN, "사용자 접근이 거부되었습니다."),
    USER_UPDATE_DENIED(HttpStatus.FORBIDDEN, "사용자 정보를 수정할 권한이 없습니다."),
    USER_DELETE_DENIED(HttpStatus.FORBIDDEN, "사용자 정보를 삭제할 권한이 없습니다."),
    INVALID_USER_DATA(HttpStatus.BAD_REQUEST, "유효하지 않은 사용자 데이터입니다.");

    private final HttpStatus httpStatus;
    private final String message;
}