package com.soongsil.soongpal.user.controller;

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

    @Operation(summary = "최종 회원가입", description = "임시 토큰과 닉네임을 받아 최종 회원가입을 처리합니다.")
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(
            @RequestHeader("Authorization") String tempToken,
            @RequestBody NicknameRequestDto nicknameRequestDto,
            HttpServletResponse response) {

        String token = tempToken.substring(7);
        TokenPair tokenPair = authService.registerNewUser(token, nicknameRequestDto.getNickname());
        addRefreshTokenToCookie(response, tokenPair.getRefreshToken());
        return ResponseEntity.ok(new AuthResponseDto(tokenPair.getAccessToken()));
    }

    @Operation(summary = "토큰 재발급", description = "리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급합니다.")
    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponseDto> refreshTokens(@CookieValue("refreshToken") String refreshToken) {
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