package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum BoardErrorCode {
    BOARD_NOT_FOUND(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."),
    BOARD_ACCESS_DENIED(HttpStatus.FORBIDDEN, "게시글에 접근할 권한이 없습니다."),
    BOARD_UPDATE_DENIED(HttpStatus.FORBIDDEN, "게시글을 수정할 권한이 없습니다."),
    BOARD_DELETE_DENIED(HttpStatus.FORBIDDEN, "게시글을 삭제할 권한이 없습니다."),
    INVALID_BOARD_DATA(HttpStatus.BAD_REQUEST, "유효하지 않은 게시글 데이터입니다."),
    BOARD_ALREADY_DELETED(HttpStatus.CONFLICT, "이미 삭제된 게시글입니다."),
    BOARD_FILE_UPLOAD_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "게시글 파일 업로드 개수를 초과했습니다."),
    LIKE_NOT_FOUND(HttpStatus.NOT_FOUND, "좋아요를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}