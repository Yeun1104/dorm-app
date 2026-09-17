package com.soongsil.soongpal.common.exception;

import lombok.Getter;

@Getter
public class BoardException extends RuntimeException {
    private final BoardErrorCode errorCode;

    public BoardException(BoardErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}