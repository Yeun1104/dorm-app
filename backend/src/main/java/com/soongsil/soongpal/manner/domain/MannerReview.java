package com.soongsil.soongpal.manner.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.reservation.domain.Reservation;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

/**
 * 거래완료(COMPLETED)된 예약 1건에 대해, 한쪽이 상대방에게 남기는 매너 키워드 평가.
 * 예약 하나당 리뷰는 최대 2개 (구매자→총대, 총대→구매자) — reservation+reviewer 조합으로 유니크 제약.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"reservation_id", "reviewer_id"}))
public class MannerReview extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "manner_review_keyword", joinColumns = @JoinColumn(name = "manner_review_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "keyword", nullable = false)
    private Set<MannerKeywordType> keywords = new HashSet<>();

    @Builder
    public MannerReview(Reservation reservation, User reviewer, User reviewee, Set<MannerKeywordType> keywords) {
        this.reservation = reservation;
        this.reviewer = reviewer;
        this.reviewee = reviewee;
        this.keywords = keywords;
    }
}
