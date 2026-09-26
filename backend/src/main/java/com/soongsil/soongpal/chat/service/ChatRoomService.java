package com.soongsil.soongpal.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.chat.domain.ChatMessage;
import com.soongsil.soongpal.chat.domain.ChatRole;
import com.soongsil.soongpal.chat.domain.ChatRoom;
import com.soongsil.soongpal.chat.domain.ChatRoomUser;
import com.soongsil.soongpal.chat.dto.ChatRoomCreateReqDto;
import com.soongsil.soongpal.chat.dto.ChatRoomResDto;
import com.soongsil.soongpal.chat.dto.ChatRoomUserResDto;
import com.soongsil.soongpal.chat.dto.LastMessageDto;
import com.soongsil.soongpal.chat.dto.LastMessageProjection;
import com.soongsil.soongpal.chat.repository.ChatMessageRepository;
import com.soongsil.soongpal.chat.repository.ChatRoomRepository;
import com.soongsil.soongpal.chat.repository.ChatRoomUserRepository;
import com.soongsil.soongpal.common.exception.BoardErrorCode;
import com.soongsil.soongpal.common.exception.BoardException;
import com.soongsil.soongpal.common.exception.ChatErrorCode;
import com.soongsil.soongpal.common.exception.ChatException;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.soongsil.soongpal.chat.domain.ChatRoomType.GROUP;
import static com.soongsil.soongpal.chat.domain.ChatRoomType.PRIVATE;

/**
 * ⚠️ 리팩터링 예정: GROUP(단체) 채팅방 생성/참가(createGroupChatRoom, joinChatRoom)는
 * 공동구매도 1:1 채팅으로 바뀌면서 지금은 안 쓰이지만, 사전공구 등 나중을 위해 일단 남겨둠.
 */
@Slf4j
@Transactional
@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomUserRepository chatRoomUserRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public ChatRoomResDto createPrivateChatRoom(ChatRoomCreateReqDto dto, Long userId) {
        User findUser = userRepository.findById(userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.USER_NOT_FOUND));
        Board findBoard = boardRepository.findById(dto.getBoardId())
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));
        User boardUser = userRepository.findById(findBoard.getUser().getId())
                .orElseThrow(() -> new ChatException(ChatErrorCode.USER_NOT_FOUND));

        Optional<ChatRoom> chatRoom = chatRoomRepository.existsByTwoUser(findUser.getId(), boardUser.getId());
        if (chatRoom.isPresent()) {
            List<ChatRoomUserResDto> users = chatRoom.get().getChatRoomUsers().stream()
                    .map(ChatRoomUserResDto::from)
                    .toList();

            return ChatRoomResDto.of(chatRoom.get(), boardUser.getNickName(), findBoard.getId(), findBoard.getTitle(), users, null, null);
        }

        ChatRoom savedRoom = chatRoomRepository.save(ChatRoomCreateReqDto.toEntity(PRIVATE, dto.getBoardId()));

        ChatRoomUser roomUser = ChatRoomUser.builder()
                .chatRoom(savedRoom)
                .user(findUser)
                .role(ChatRole.MEMBER)
                .build();

        ChatRoomUser roomOwner = ChatRoomUser.builder()
                .chatRoom(savedRoom)
                .user(findBoard.getUser())
                .role(ChatRole.OWNER)
                .build();

        chatRoomUserRepository.save(roomOwner);
        chatRoomUserRepository.save(roomUser);

        savedRoom.addUser(roomOwner);
        savedRoom.addUser(roomUser);


        List<ChatRoomUserResDto> users = savedRoom.getChatRoomUsers().stream()
                .map(ChatRoomUserResDto::from)
                .toList();

        return ChatRoomResDto.of(savedRoom, boardUser.getNickName(), findBoard.getId(), findBoard.getTitle(), users, null, null);
    }

    public ChatRoomResDto createGroupChatRoom(Long userId, String chatRoomName, Long boardId) {
        ChatRoom savedRoom = chatRoomRepository.save(ChatRoomCreateReqDto.toEntity(GROUP, boardId));
        User findUser = userRepository.findById(userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.USER_NOT_FOUND));

        ChatRoomUser roomUser = ChatRoomUser.builder()
                .chatRoom(savedRoom)
                .user(findUser)
                .role(ChatRole.OWNER)
                .build();
        chatRoomUserRepository.save(roomUser);
        savedRoom.addUser(roomUser);

        List<ChatRoomUserResDto> users = savedRoom.getChatRoomUsers().stream()
                .map(ChatRoomUserResDto::from)
                .toList();

        return ChatRoomResDto.of(savedRoom, chatRoomName, boardId, chatRoomName, users, null, null);
    }

    public ChatRoomResDto getChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findChatRoomByIdAndUserId(roomId, userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_ACCESS_DENIED));

        Board findBoard = boardRepository.findById(chatRoom.getBoardId())
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        List<ChatRoomUserResDto> users = chatRoom.getChatRoomUsers().stream()
                .map(ChatRoomUserResDto::from)
                .toList();

        ChatMessage lastMessage = chatMessageRepository.findLastMessageByRoomId(chatRoom.getId()).orElse(null);
        String lastContent = lastMessage != null ? lastMessage.getContent() : null;
        Long lastMessageId = lastMessage != null ? lastMessage.getId() : null;
        LocalDateTime lastCreatedAt = lastMessage != null ? lastMessage.getCreatedAt() : chatRoom.getCreatedAt();

        Integer unreadCount = calculateUnreadCount(roomId, userId);

        ChatRoomResDto result = ChatRoomResDto.of(chatRoom, findBoard.getTitle(), findBoard.getId(), findBoard.getTitle(),
                users, lastContent, lastMessageId, lastCreatedAt, unreadCount);
        result.setNotificationMuted(isMuted(roomId, userId));
        return result;
    }

    public List<ChatRoomResDto> getChatRoomsByUser(Long userId) {
        List<ChatRoom> chatRooms = chatRoomRepository.findChatRoomsByUserId(userId);

        List<Long> roomIds = chatRooms.stream().map(ChatRoom::getId).toList();
        List<String> keys = roomIds.stream()
                .map(id -> "chat:room:" + id + ":last-message")
                .toList();

        Map<Long, LastMessageDto> lastMessageMap = new java.util.HashMap<>();
        List<Long> missedIds = new java.util.ArrayList<>();

        // Redis에서 캐시된 마지막 메시지 조회 시도. Redis가 없거나(로컬 개발 등) 접속 실패해도
        // 전체가 캐시 미스로 처리되어 DB에서 직접 조회하도록 폴백된다 (서비스 자체는 끊기지 않음).
        List<String> cachedValues = null;
        try {
            cachedValues = redisTemplate.opsForValue().multiGet(keys);
        } catch (Exception e) {
            log.warn("Redis 조회 실패 - DB 폴백으로 처리 ({}건): {}", roomIds.size(), e.getMessage());
        }

        for (int i = 0; i < roomIds.size(); i++) {
            String json = cachedValues != null ? cachedValues.get(i) : null;
            if (json != null) {
                try {
                    LastMessageDto dto = objectMapper.readValue(json, LastMessageDto.class);
                    lastMessageMap.put(roomIds.get(i), dto);
                } catch (Exception ignored) {
                    missedIds.add(roomIds.get(i));
                }
            } else {
                missedIds.add(roomIds.get(i));
            }
        }

        if (!missedIds.isEmpty()) {
            chatRoomRepository.findLastMessagesByRoomIds(missedIds)
                    .stream()
                    .map(this::toLastMessageDto)
                    .forEach(dto -> {
                        lastMessageMap.put(dto.roomId(), dto);
                        try {
                            redisTemplate.opsForValue().set(
                                    "chat:room:" + dto.roomId() + ":last-message",
                                    objectMapper.writeValueAsString(dto)
                            );
                        } catch (Exception e) {
                            log.warn("Redis cache write failed for room {}: {}", dto.roomId(), e.getMessage());
                        }
                    });
        }

        List<Long> boardIds = chatRooms.stream().map(ChatRoom::getBoardId).toList();
        Map<Long, Board> boardMap = boardRepository.findAllById(boardIds)
                .stream()
                .collect(Collectors.toMap(Board::getId, b -> b));

        return chatRooms.stream()
                .map(c -> Optional.ofNullable(boardMap.get(c.getBoardId()))
                        .map(findBoard -> {
                            List<ChatRoomUserResDto> users = c.getChatRoomUsers().stream()
                                    .map(ChatRoomUserResDto::from)
                                    .toList();

                            LastMessageDto lastMessage = lastMessageMap.get(c.getId());
                            String lastContent = lastMessage != null ? lastMessage.content() : null;
                            Long lastMessageId = lastMessage != null ? lastMessage.messageId() : null;
                            LocalDateTime lastCreatedAt = lastMessage != null ? lastMessage.createdAt() : c.getCreatedAt();

                            Integer unreadCount = calculateUnreadCount(c.getId(), userId);

                            ChatRoomResDto dto = ChatRoomResDto.of(c, findBoard.getTitle(), findBoard.getId(), findBoard.getTitle(),
                                    users, lastContent, lastMessageId, lastCreatedAt, unreadCount);
                            dto.setNotificationMuted(isMuted(c.getId(), userId));
                            return dto;
                        })
                )
                .flatMap(Optional::stream)
                .toList();
    }

    /** 이 방에서 내가 안 보낸(=상대가 보낸) 메시지 중, 내가 마지막으로 읽은 메시지보다 나중에 온 것들의 개수. */
    private Integer calculateUnreadCount(Long roomId, Long userId) {
        Long lastReadMessageId = chatRoomUserRepository.findByChatRoomIdAndUserId(roomId, userId)
                .map(ChatRoomUser::getLastReadMessageId)
                .orElse(null);
        long sinceId = lastReadMessageId != null ? lastReadMessageId : 0L;
        return (int) chatMessageRepository.countByChatRoom_IdAndIdGreaterThanAndSender_IdNot(roomId, sinceId, userId);
    }

    private boolean isMuted(Long roomId, Long userId) {
        return chatRoomUserRepository.findByChatRoomIdAndUserId(roomId, userId)
                .map(ChatRoomUser::isNotificationMuted)
                .orElse(false);
    }

    /** 이 채팅방만 콕 집어서 알림 켜기/끄기. */
    public void setNotificationMuted(Long roomId, Long userId, boolean muted) {
        ChatRoomUser roomUser = chatRoomUserRepository.findByChatRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_JOINED));
        roomUser.setNotificationMuted(muted);
    }

    public ChatRoomResDto joinChatRoom(Long boardId, Long userId) {
        Board findBoard = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        ChatRoom findChatRoom = chatRoomRepository.findByBoardId(boardId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_FOUND));

        if (findChatRoom.getType() == PRIVATE) {
            throw new ChatException(ChatErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }

        User findUser = userRepository.findById(userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.USER_NOT_FOUND));

        boolean alreadyJoined = chatRoomUserRepository.findByChatRoomIdAndUserId(findChatRoom.getId(), userId).isPresent();
        if (!alreadyJoined) {
            ChatRoomUser roomUser = ChatRoomUser.builder()
                    .chatRoom(findChatRoom)
                    .user(findUser)
                    .build();
            chatRoomUserRepository.save(roomUser);
            findChatRoom.addUser(roomUser);
        }

        List<ChatRoomUserResDto> users = findChatRoom.getChatRoomUsers().stream()
                .filter(user -> user.getRole().equals(ChatRole.OWNER))
                .map(ChatRoomUserResDto::from)
                .toList();

        return ChatRoomResDto.of(findChatRoom, findBoard.getTitle(),  findBoard.getId(), findBoard.getTitle(), users, null, null);
    }

    public ChatRoomResDto leaveChatRoom(Long roomId, Long userId) {
        ChatRoom findChatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_FOUND));

        Board findBoard = boardRepository.findById(findChatRoom.getBoardId())
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (findChatRoom.getType() == PRIVATE) {
            throw new ChatException(ChatErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }

        ChatRoomUser roomUser = chatRoomUserRepository.findByChatRoomIdAndUserId(findChatRoom.getId(), userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_JOINED));
        if (roomUser.getRole() == ChatRole.OWNER) {
            throw new ChatException(ChatErrorCode.CHAT_ROOM_OUT_DENIED);
        }

        chatRoomUserRepository.delete(roomUser);
        findChatRoom.removeUser(roomUser);

        return ChatRoomResDto.of(findChatRoom, findBoard.getTitle(),  findBoard.getId(), findBoard.getTitle(), null, null, null);
    }

    public void deleteChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findChatRoomByIdAndUserId(roomId, userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_DELETE_DENIED));

        ChatRoomUser roomUser = chatRoomUserRepository.findByChatRoomIdAndUserId(roomId, userId)
                        .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_JOINED));

        if (roomUser.getRole().equals(ChatRole.MEMBER)) {
            throw new ChatException(ChatErrorCode.CHAT_ROOM_DELETE_DENIED);
        }
        chatRoom.softDelete();
    }

    public void updateLastReadMessage(Long roomId, Long userId, Long messageId) {
        ChatRoomUser roomUser = chatRoomUserRepository.findByChatRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new ChatException(ChatErrorCode.CHAT_ROOM_NOT_JOINED));

        roomUser.updateLastReadMessage(messageId);
    }

    private LastMessageDto toLastMessageDto(LastMessageProjection projection) {
        return new LastMessageDto(projection.getRoomId(), projection.getMessageId(), projection.getContent(), projection.getCreatedAt());
    }
}
