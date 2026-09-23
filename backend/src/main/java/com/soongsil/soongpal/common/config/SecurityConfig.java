package com.soongsil.soongpal.common.config;

import com.soongsil.soongpal.user.service.jwt.JwtAuthenticationFilter;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import com.soongsil.soongpal.user.handler.OAuth2AuthenticationSuccessHandler;
import com.soongsil.soongpal.user.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sessionManagement -> sessionManagement
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(authorize -> authorize
                    // ⚠️ 아래의 광범위한 "/**" permitAll보다 먼저(우선순위 높게) 와야 하는 규칙들.
                    // Spring Security는 먼저 매치되는 규칙을 적용하기 때문에, 순서가 바뀌면 이 규칙들이 무력화됨.
                    .requestMatchers("/api/dorm/**").authenticated()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .requestMatchers(
                            "/",
                            "/error",
                            "/oauth2/**",
                            "/login/oauth2/code/**",
                            "/api/auth/**",
                            "/api/dev/**", // ⚠️ 개발 전용 테스트 로그인 API. 배포 시 app.feature.dev-tools.enabled=false로 꺼서 컨트롤러 자체를 없애야 함
                            "/swagger-ui.html",
                            "/swagger-ui/**",
                            "/v3/api-docs/**",
                            "/ws/chat/**",
                            "/**"
                    ).permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/board/**").permitAll()
                    .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oAuth2AuthenticationSuccessHandler)
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
