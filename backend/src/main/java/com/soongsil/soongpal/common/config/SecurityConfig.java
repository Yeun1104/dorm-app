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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
                    // 기숙사 계정(아이디/비번 등록, 로그인 대행) API는 반드시 로그인한 사용자만 접근 가능해야 해서
                    // 아래의 광범위한 "/**" permitAll보다 먼저(우선순위 높게) 명시함.
                    .requestMatchers("/api/dorm/**").authenticated()
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
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oAuth2AuthenticationSuccessHandler)
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
