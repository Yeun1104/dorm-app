package com.soongsil.soongpal.common.exception;

import lombok.Getter;

@Getter
public class DormException extends RuntimeException {
    private final DormErrorCode errorCode;

    public DormException(DormErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public DormException(DormErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
