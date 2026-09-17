package com.soongsil.soongpal.chat.dto;

import com.soongsil.soongpal.chat.domain.ChatMessage;
import com.soongsil.soongpal.chat.domain.ChatRoom;
import com.soongsil.soongpal.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Schema(description = "채팅 메시지 전송 요청 DTO")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageReqDto {

    @Schema(description = "메시지 내용", example = "콜라 1.25L 공구하실 분 있나요? 2000원입니다")
    @NotBlank
    private String content;

    public static ChatMessage toEntity(ChatMessageReqDto dto, User sender, ChatRoom chatRoom) {
        return ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(dto.getContent())
                .build();
    }

}