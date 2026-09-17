package com.soongsil.soongpal.user.dto;

import lombok.Getter;

@Getter
public class AuthResponseDto {
    private final String accessToken;
    public AuthResponseDto(String accessToken) {
        this.accessToken = accessToken;
    }
}