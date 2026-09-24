package com.soongsil.soongpal.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 모바일 앱처럼 쿠키를 못 쓰는 클라이언트를 위해 body로 refreshToken을 직접 보낼 수 있게 하는 DTO.
 * 웹 클라이언트는 기존처럼 쿠키만 보내면 되고(body 생략 가능), 그 경우 서버가 쿠키값을 대신 씀.
 */
@Getter
@NoArgsConstructor
public class TokenRefreshReqDto {
    private String refreshToken;
}
