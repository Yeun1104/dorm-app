package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.user.domain.Role;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ⚠️ 개발 전용. 카카오 OAuth 없이 테스트용 JWT를 즉시 발급받기 위한 API.
 *
 * app.feature.dev-tools.enabled=false 로 두면 이 컨트롤러 자체가 로드되지 않음
 * (application.yml 로컬 기본값은 true, 배포 환경에서는 반드시 false로 바꿔야 함 — 그렇지 않으면
 *  누구나 이 API로 로그인 없이 아무 계정의 토큰을 발급받을 수 있게 되는 심각한 보안 구멍이 됨).
 */
@RestController
@RequestMapping("/api/dev/auth")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.feature.dev-tools", name = "enabled", havingValue = "true")
@Tag(name = "[DEV ONLY] Dev Auth Controller", description = "로컬 테스트용 JWT 즉시 발급 (운영 환경에서는 반드시 비활성화)")
public class DevAuthController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Operation(summary = "[DEV ONLY] 테스트 유저 JWT 발급", description = "kakaoId가 'dev-local-user'인 테스트 유저를 없으면 만들고, 그 유저의 access token을 바로 발급합니다.")
    @PostMapping("/token")
    public ResponseEntity<CommonResDto<String>> issueDevToken(
            @RequestParam(defaultValue = "dev-local-user") String kakaoId,
            @RequestParam(defaultValue = "로컬테스트유저") String nickname
    ) {
        User user = userRepository.findByKakaoId(kakaoId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .kakaoId(kakaoId)
                                .nickName(nickname)
                                .email(kakaoId + "@dev.local")
                                .build()
                ));

        String accessToken = jwtTokenProvider.createAccessToken(user.getId().toString(), user.getRole());

        return new ResponseEntity<>(new CommonResDto<>("개발용 토큰 발급 성공 (userId=" + user.getId() + ")", accessToken), HttpStatus.OK);
    }
}
