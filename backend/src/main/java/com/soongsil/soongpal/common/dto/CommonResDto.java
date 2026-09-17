package com.soongsil.soongpal.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;


@Getter
@AllArgsConstructor
public class CommonResDto<T> {

    private final String statusMessage;
    private final T result;

}