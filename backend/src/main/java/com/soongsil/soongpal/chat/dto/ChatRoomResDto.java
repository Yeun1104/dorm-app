package com.soongsil.soongpal.chat.dto;

import com.soongsil.soongpal.chat.domain.ChatRoom;
import com.soongsil.soongpal.chat.domain.ChatRoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomResDto {

    private Long id;
    private String name;
    private Long productId;
    private String productTitle;
    private ChatRoomType type;
    private int userCount;
    private List<ChatRoomUserResDto> users;
    private String lastMessage;
    private Long lastMessageId;
    private LocalDateTime lastMessageTime;
    private Integer unreadCount; // 이 방에서 내가 안 읽은 메시지 개수 (뱃지용)

    public static ChatRoomResDto of(ChatRoom chatRoom, String name, Long boardId, String productTitle,
                                     List<ChatRoomUserResDto> users, String lastMessage, LocalDateTime lastMessageTime) {
        return of(chatRoom, name, boardId, productTitle, users, lastMessage, null, lastMessageTime, null);
    }

    public static ChatRoomResDto of(ChatRoom chatRoom, String name, Long boardId, String productTitle,
                                     List<ChatRoomUserResDto> users, String lastMessage, Long lastMessageId,
                                     LocalDateTime lastMessageTime, Integer unreadCount) {
        return ChatRoomResDto.builder()
                .id(chatRoom.getId())
                .name(name)
                .productId(boardId)
                .productTitle(productTitle)
                .type(chatRoom.getType())
                .userCount(chatRoom.getChatRoomUsers().size())
                .users(users)
                .lastMessage(lastMessage)
                .lastMessageId(lastMessageId)
                .lastMessageTime(lastMessageTime)
                .unreadCount(unreadCount)
                .build();
    }
}
