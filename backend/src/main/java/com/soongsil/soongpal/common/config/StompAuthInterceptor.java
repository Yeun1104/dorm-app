package com.soongsil.soongpal.common.config;

import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * ⚠️ 이게 없으면 STOMP CONNECT 시점에 인증이 전혀 안 붙어서, ChatController의
 * headerAccessor.getUser()가 항상 null이 되고 → 모든 메시지 전송이 USER_NOT_FOUND로 실패함
 * (senderId가 항상 0L로 떨어지기 때문). 실제로 이 인터셉터가 누락되어 있었음.
 *
 * CONNECT 프레임의 Authorization 헤더(Bearer accessToken)를 꺼내서 검증하고,
 * 성공하면 STOMP 세션에 Authentication을 심어줌 — 이후 이 세션으로 보내는 모든 메시지에서
 * headerAccessor.getUser()로 그대로 재사용됨(세션 단위로 유지되는 STOMP의 특성).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("[STOMP] CONNECT 요청에 Authorization 헤더가 없거나 형식이 잘못됨");
                throw new IllegalArgumentException("인증 토큰이 필요합니다.");
            }

            String token = authHeader.substring(7);

            if (!jwtTokenProvider.validateToken(token)) {
                log.warn("[STOMP] CONNECT 요청의 토큰이 유효하지 않음");
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }

            Authentication authentication = jwtTokenProvider.getAuthentication(token);
            accessor.setUser(authentication);
            log.info("[STOMP] 인증 성공, userId={}", authentication.getName());
        }

        return message;
    }
}
