package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import com.soongsil.soongpal.user.dto.*;
import com.soongsil.soongpal.user.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @Operation(summary = "최종 회원가입", description = "카카오 로그인 후 받은 임시 토큰과 닉네임을 받아 최종 회원가입을 처리합니다. 모바일 앱은 응답 바디의 refreshToken을 직접 저장해서 쓰면 됨(쿠키 의존 안 해도 됨).")
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(
            @RequestHeader("Authorization") String tempToken,
            @RequestBody NicknameRequestDto nicknameRequestDto,
            HttpServletResponse response) {

        String token = tempToken.substring(7);
        TokenPair tokenPair = authService.registerNewUser(token, nicknameRequestDto.getNickname());
        addRefreshTokenToCookie(response, tokenPair.getRefreshToken());
        return ResponseEntity.ok(new AuthResponseDto(tokenPair.getAccessToken(), tokenPair.getRefreshToken()));
    }

    @Operation(summary = "토큰 재발급", description = "리프레시 토큰으로 새 액세스 토큰을 발급합니다. 웹은 쿠키로, 모바일 앱은 body의 refreshToken으로 보내면 됨(body가 있으면 body 우선).")
    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponseDto> refreshTokens(
            @RequestBody(required = false) TokenRefreshReqDto body,
            @CookieValue(value = "refreshToken", required = false) String cookieToken) {

        String refreshToken = (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank())
                ? body.getRefreshToken()
                : cookieToken;

        if (refreshToken == null) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        TokenRefreshResponseDto responseDto = authService.reissueTokens(refreshToken);
        return ResponseEntity.ok(responseDto);
    }

    private void addRefreshTokenToCookie(HttpServletResponse response, String refreshToken) {
        long refreshTokenValidityInSeconds = jwtTokenProvider.getRefreshTokenValidityInMilliseconds() / 1000;

        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge((int) refreshTokenValidityInSeconds);

        response.addCookie(cookie);
    }
}
