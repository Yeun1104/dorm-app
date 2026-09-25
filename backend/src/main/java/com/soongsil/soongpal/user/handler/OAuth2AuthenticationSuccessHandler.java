package com.soongsil.soongpal.user.handler;

import com.soongsil.soongpal.user.domain.Role;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import com.soongsil.soongpal.user.dto.PrincipalDetails;
import com.soongsil.soongpal.user.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    @Value("${app.oauth2.authorized-redirect-uri}")
    private String authorizedRedirectUri;
    @Value("${app.cookie.domain}")
    private String cookieDomain;
    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    private final JwtTokenProvider jwtTokenProvider;
    private final AuthService authService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {

        PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();

        if ("ROLE_GUEST".equals(principalDetails.getAuthorities().iterator().next().getAuthority())) {
            log.info("### SUCCESS HANDLER: User is identified as GUEST. Redirecting to signup.");
            String tempToken = jwtTokenProvider.createTempSignupToken(principalDetails.getOauthAttributes());

            String redirectUrl = UriComponentsBuilder.fromUriString(authorizedRedirectUri + "/auth/signup")
                    .queryParam("temp_token", tempToken)
                    .build().toUriString();
            response.sendRedirect(redirectUrl);

        } else {
            log.info("### SUCCESS HANDLER: User is identified as EXISTING USER. Setting cookie.");
            String userId = String.valueOf(principalDetails.getUser().getId());
            Role userRole = principalDetails.getUser().getRole();

            String accessToken = jwtTokenProvider.createAccessToken(userId, userRole);
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);

            authService.updateRefreshToken(Long.parseLong(userId), refreshToken);

            addRefreshTokenToCookie(response, refreshToken);

            // ⚠️ refreshToken 쿠키는 이 요청을 처리한 인앱브라우저(WebView)에만 저장되고, 앱의 자체
            // HTTP 클라이언트(axios 등)는 그 쿠키 저장소에 접근할 수 없어서 재발급을 못 받는 문제가 있었음
            // (실제로 1시간마다 재로그인해야 하는 원인). accessToken처럼 refreshToken도 리다이렉트 URL에
            // 같이 실어서, 앱이 딥링크로 직접 받아 SecureStore 등에 저장해뒀다가 /api/auth/refresh 호출 시
            // body로 보내도록 바꿈 (쿠키는 웹 클라이언트를 위해 그대로 유지함).
            String redirectUrl = UriComponentsBuilder.fromUriString(authorizedRedirectUri)
                    .queryParam("access_token", accessToken)
                    .queryParam("refresh_token", refreshToken)
                    .build().toUriString();
            response.sendRedirect(redirectUrl);
        }
    }

    private void addRefreshTokenToCookie(HttpServletResponse response, String refreshToken) {
        long refreshTokenValidityInSeconds = jwtTokenProvider.getRefreshTokenValidityInMilliseconds() / 1000;

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(refreshTokenValidityInSeconds)
                .sameSite(cookieSecure ? "None" : "Lax")
                .domain(cookieSecure ? cookieDomain : null)
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }
}
