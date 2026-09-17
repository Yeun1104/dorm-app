package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;


@Getter
@RequiredArgsConstructor
public enum ChatErrorCode {
    CHAT_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."),
    CHAT_ROOM_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 채팅방에 접근할 수 없습니다."),
    CHAT_ROOM_ALREADY_JOINED(HttpStatus.CONFLICT, "이미 참가한 채팅방입니다."),
    CHAT_ROOM_NOT_JOINED(HttpStatus.BAD_REQUEST, "참가하지 않은 채팅방입니다."),
    CHAT_ROOM_OUT_DENIED(HttpStatus.BAD_REQUEST, "게시글 유저는 채팅방에 나갈 수 없습니다."),
    CHAT_ROOM_DELETE_DENIED(HttpStatus.FORBIDDEN, "채팅방을 삭제할 권한이 없습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
