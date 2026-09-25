package com.soongsil.soongpal.user.dto;

import lombok.Getter;

/**
 * ⚠️ refreshToken도 응답 바디에 같이 내려줌 — 모바일 앱(React Native)은 axios/fetch로 이 API를 직접
 * 호출하는데, Set-Cookie 헤더로 내려주는 쿠키를 앱이 안정적으로 못 받는 경우가 많아서(플랫폼별로 다름)
 * 앱이 이 값을 직접 SecureStore 등에 저장해서 쓰도록 함. (쿠키는 웹 클라이언트 호환을 위해 그대로 유지)
 */
@Getter
public class AuthResponseDto {
    private final String accessToken;
    private final String refreshToken;

    public AuthResponseDto(String accessToken, String refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }
}
