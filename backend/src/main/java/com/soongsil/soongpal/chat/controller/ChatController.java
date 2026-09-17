package com.soongsil.soongpal.chat.controller;

import com.soongsil.soongpal.chat.dto.ChatMessageReqDto;
import com.soongsil.soongpal.chat.dto.ChatMessageResDto;
import com.soongsil.soongpal.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;


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

    private Long getUserId(StompHeaderAccessor headerAccessor) {
        Authentication authentication = (Authentication) headerAccessor.getUser();
        log.info("headerAccessor에서 가져온 authentication: ", authentication);

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            return 0L;
        }
        return Long.parseLong(authentication.getName());
    }

}
