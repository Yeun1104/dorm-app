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

            String redirectUrl = UriComponentsBuilder.fromUriString(authorizedRedirectUri)
                    .queryParam("access_token", accessToken)
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