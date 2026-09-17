package com.soongsil.soongpal.chat.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Where(clause = "deleted_at IS NULL")
@Table(name = "chat_rooms")
public class ChatRoom extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRoomType type;

    private Long boardId;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder.Default
    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatRoomUser> chatRoomUsers = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatMessage> messages = new ArrayList<>();

    public void addUser(ChatRoomUser chatRoomUser) {
        this.chatRoomUsers.add(chatRoomUser);
    }

    public void removeUser(ChatRoomUser chatRoomUser) {
        this.chatRoomUsers.remove(chatRoomUser);
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.chatRoomUsers.forEach(ChatRoomUser::softDelete);
    }

}