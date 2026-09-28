package com.soongsil.soongpal.chat.controller;

import com.soongsil.soongpal.chat.dto.ChatMessageReqDto;
import com.soongsil.soongpal.chat.dto.ChatMessageResDto;
import com.soongsil.soongpal.chat.service.ChatService;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;


@Slf4j
@RequiredArgsConstructor
@Controller
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/{roomId}")
    @SendTo("/topic/{roomId}")
    public ChatMessageResDto sendMessage(@DestinationVariable Long roomId,@Valid ChatMessageReqDto dto, StompHeaderAccessor headerAccessor) {
        log.info("메시지 도착 = {}", dto.getContent());
        Long userId = getUserId(headerAccessor);
        return chatService.saveMessage(roomId, dto, userId);
    }

    /**
     * STOMP 세션에 인증 정보가 없으면 예전처럼 0L로 넘기지 않고 바로 예외를 던짐.
     * (0L로 넘기면 나중에 "사용자를 찾을 수 없습니다"라는 엉뚱한 에러로 나타나서 원인 찾기가 어려웠음)
     */
    private Long getUserId(StompHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        log.info("headerAccessor에서 가져온 user: {}", principal);

        if (!(principal instanceof Authentication authentication)
                || "anonymousUser".equals(authentication.getPrincipal())) {
            log.warn("[STOMP] 메시지 전송 시 인증 정보 없음 - CONNECT 때 Authorization 헤더로 인증이 안 된 연결");
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }
        return Long.parseLong(authentication.getName());
    }

}
