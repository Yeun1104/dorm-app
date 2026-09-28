package com.soongsil.soongpal.common.config;

import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * STOMP CONNECT 프레임의 Authorization 헤더(Bearer accessToken)를 검증해서, 성공하면 STOMP 세션에
 * Authentication을 심어줌. 이후 같은 세션으로 보내는 모든 메시지에서 headerAccessor.getUser()로 그대로 꺼내 쓸 수 있음.
 *
 * ⚠️ 반드시 MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class)로 "메시지에 붙어있는 원본
 * accessor"를 꺼내서 setUser 해야 함. StompHeaderAccessor.wrap(message)는 헤더를 복사한 새 accessor를 만들어서,
 * 거기에 setUser를 해도 실제 메시지에는 반영이 안 됨 → CONNECT는 통과하는데 이후 메시지의 user가 항상 null이
 * 되어 senderId=0 → USER_NOT_FOUND가 나는 버그가 있었음.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
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
