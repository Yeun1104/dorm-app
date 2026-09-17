package com.soongsil.soongpal.user.dto;

import lombok.Getter;

@Getter
public class TokenRefreshResponseDto {
    private String accessToken;

    public TokenRefreshResponseDto(String accessToken) {
        this.accessToken = accessToken;
    }
}