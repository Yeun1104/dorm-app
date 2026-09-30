package com.soongsil.soongpal.chat.domain;


import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.*;


@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "chat_messages")
public class ChatMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    /** 보낸 사람이 "전송 취소"했는지. true면 content는 그대로 DB에 남아있어도 응답에서는 항상 가려서 내려줌. */
    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /**
     * 답장 대상 메시지 id. FK가 아니라 그냥 id값만 저장함(자기참조 매핑 없이 단순하게 가려고) —
     * 원본 메시지가 삭제되거나 아주 오래돼도 이 메시지 자체는 영향받지 않음.
     */
    @Column(name = "reply_to_message_id")
    private Long replyToMessageId;

    public void markDeleted() {
        this.deleted = true;
    }

}
