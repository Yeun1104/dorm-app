package com.soongsil.soongpal.chat.dto;

import com.soongsil.soongpal.chat.domain.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Builder
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResDto {

    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String content; // 삭제된 메시지면 항상 null (프론트는 deleted만 보고 "삭제된 채팅입니다" 표시)
    private boolean deleted;
    private ChatReplyPreviewDto replyTo; // 답장이 아니면 null
    private Integer unreadCount;
    private LocalDateTime createdAt;

    public static ChatMessageResDto from(ChatMessage message, Integer unreadCount) {
        return from(message, unreadCount, null);
    }

    public static ChatMessageResDto from(ChatMessage message, Integer unreadCount, ChatMessage replyToMessage) {
        return ChatMessageResDto.builder()
                .id(message.getId())
                .roomId(message.getChatRoom().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getNickName())
                .content(message.isDeleted() ? null : message.getContent())
                .deleted(message.isDeleted())
                .replyTo(replyToMessage == null ? null : ChatReplyPreviewDto.from(replyToMessage))
                .unreadCount(unreadCount)
                .createdAt(message.getCreatedAt())
                .build();
    }

}
