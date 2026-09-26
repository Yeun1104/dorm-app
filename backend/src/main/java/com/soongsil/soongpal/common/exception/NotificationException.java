package com.soongsil.soongpal.common.exception;

import lombok.Getter;

@Getter
public class NotificationException extends RuntimeException {
    private final NotificationErrorCode errorCode;

    public NotificationException(NotificationErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
