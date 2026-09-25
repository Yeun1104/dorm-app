package com.soongsil.soongpal.chat.repository;

import com.soongsil.soongpal.chat.domain.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId ORDER BY cm.createdAt DESC LIMIT 1")
    Optional<ChatMessage> findLastMessageByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId ORDER BY cm.createdAt DESC")
    Page<ChatMessage> findByChatRoomId(@Param("roomId") Long roomId, Pageable pageable);

    /** 안읽음 뱃지용: 이 방에서 내가 안 보낸(=상대가 보낸) 메시지 중, 내가 마지막으로 읽은 메시지 id보다 큰 것들의 개수. */
    long countByChatRoom_IdAndIdGreaterThanAndSender_IdNot(Long roomId, Long lastReadMessageId, Long senderId);
}
