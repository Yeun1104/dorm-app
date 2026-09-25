package com.soongsil.soongpal.common.exception;

import lombok.Getter;

@Getter
public class ReservationException extends RuntimeException {
    private final ReservationErrorCode errorCode;

    public ReservationException(ReservationErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
