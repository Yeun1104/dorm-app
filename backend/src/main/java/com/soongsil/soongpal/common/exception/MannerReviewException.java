package com.soongsil.soongpal.common.exception;

import lombok.Getter;

@Getter
public class MannerReviewException extends RuntimeException {
    private final MannerReviewErrorCode errorCode;

    public MannerReviewException(MannerReviewErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
