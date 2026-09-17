package com.soongsil.soongpal.board.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;

import lombok.*;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Where(clause = "deleted_at IS NULL")
public class Board extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    private Integer price;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String url;

    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BoardImage> boardImages = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Like> likes = new ArrayList<>();

    public void addBoardImage(BoardImage boardImage) {
        this.boardImages.add(boardImage);
        boardImage.setBoard(this);
    }

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void markAsDeletedByAdmin() {
        this.title = "삭제된 게시물";
        this.content = "사용 규정에 위반되어 관리자에 의해 삭제된 게시물입니다.";
        this.deletedAt = LocalDateTime.now();
        this.status = BoardStatus.DELETED;
        this.url = null;
        this.price = null;
        this.location = null;
    }

    public void softDeleteByUser() {
        this.deletedAt = LocalDateTime.now();
        this.status = BoardStatus.DELETED;
    }

    public void removeBoardImage(Long imageId) {
        this.boardImages.removeIf(image -> image.getId().equals(imageId));
    }

    public void update(String title, String content, Integer price, String url, String location,
                       BoardCategory category) {
        this.title = title;
        this.content = content;
        this.price = price;
        this.url = url;
        this.location = location;
        this.category = category;
    }

    public void updateStatus(BoardStatus status) {
        this.status = status;
    }
}