package com.soongsil.soongpal.chat.dto;

import com.soongsil.soongpal.chat.domain.ChatRoom;
import com.soongsil.soongpal.chat.domain.ChatRoomType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;


@Schema(description = "채팅방 생성 요청 DTO")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomCreateReqDto {

    @NotNull
    private Long boardId;

    public static ChatRoom toEntity(ChatRoomType type, Long boardId) {
        return ChatRoom.builder()
                .type(type)
                .boardId(boardId)
                .build();
    }
}