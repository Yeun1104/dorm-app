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

    /**
     * 이 메시지를 "아직 안 읽은" 참여자 수. 보낸 사람(senderId)은 자기 메시지를 당연히 읽은 걸로 치고 항상 제외함
     * — 전에는 이 제외가 없어서, 보낸 사람이 아직 lastReadMessageId를 갱신 전이라 본인까지 카운트에 잡혀
     *   "1"이어야 할 안읽음 숫자가 "2"처럼 하나 더 크게 나오던 버그가 있었음.
     */
    @Query("SELECT COUNT(cru) FROM ChatRoomUser cru " +
            "WHERE cru.chatRoom.id = :roomId " +
            "AND cru.user.id <> :senderId " +
            "AND (cru.lastReadMessageId IS NULL OR cru.lastReadMessageId < :messageId)")
    Integer countUnreadUsers(@Param("roomId") Long roomId, @Param("messageId") Long messageId, @Param("senderId") Long senderId);

}
