package com.soongsil.soongpal.chat.repository;

import com.soongsil.soongpal.chat.domain.ChatRoomUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;


public interface ChatRoomUserRepository extends JpaRepository<ChatRoomUser, Long> {

    Optional<ChatRoomUser> findByChatRoomIdAndUserId(Long roomId, Long userId);
    List<ChatRoomUser> findByChatRoomIdAndUserIdNot(Long roomId, Long userId);

    @Query("SELECT COUNT(cru) FROM ChatRoomUser cru " +
            "WHERE cru.chatRoom.id = :roomId " +
            "AND (cru.lastReadMessageId IS NULL OR cru.lastReadMessageId < :messageId)")
    Integer countUnreadUsers(@Param("roomId") Long roomId, @Param("messageId") Long messageId);

}