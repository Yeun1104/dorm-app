package com.soongsil.soongpal.chat.dto;

import com.soongsil.soongpal.chat.domain.ChatMessage;
import lombok.Builder;
import lombok.Getter;

/** 답장 메시지에서 "원본 메시지"를 짧게 보여줄 때 쓰는 미리보기. */
@Getter
@Builder
public class ChatReplyPreviewDto {
    private Long id;
    private Long senderId;
    private String senderName;
    private String content; // 원본이 삭제된 메시지면 null
    private boolean deleted;

    public static ChatReplyPreviewDto from(ChatMessage original) {
        return ChatReplyPreviewDto.builder()
                .id(original.getId())
                .senderId(original.getSender().getId())
                .senderName(original.getSender().getNickName())
                .content(original.isDeleted() ? null : original.getContent())
                .deleted(original.isDeleted())
                .build();
    }
}
