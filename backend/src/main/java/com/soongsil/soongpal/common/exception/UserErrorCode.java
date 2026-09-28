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
    INVALID_USER_DATA(HttpStatus.BAD_REQUEST, "유효하지 않은 사용자 데이터입니다."),
    INVALID_NICKNAME_FORMAT(HttpStatus.BAD_REQUEST, "닉네임은 한글 2~8자 또는 영문 4~12자로, 공백과 특수문자 없이 입력해주세요."),
    USER_SUSPENDED(HttpStatus.FORBIDDEN, "이용이 제한된 계정입니다. 게시글 작성/채팅이 제한됩니다."),

    // 프로필 이미지
    PROFILE_IMAGE_INVALID(HttpStatus.BAD_REQUEST, "jpg, png, webp, gif 형식의 5MB 이하 이미지만 등록할 수 있습니다."),
    PROFILE_IMAGE_UPLOAD_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "프로필 이미지를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."),

    // 학교 인증
    SCHOOL_VERIFICATION_REQUIRED(HttpStatus.FORBIDDEN, "학교 계정 인증이 완료된 사용자만 이용할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
