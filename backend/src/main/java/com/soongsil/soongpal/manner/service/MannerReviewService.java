package com.soongsil.soongpal.manner.service;

import com.soongsil.soongpal.common.exception.*;
import com.soongsil.soongpal.manner.domain.MannerKeywordType;
import com.soongsil.soongpal.manner.domain.MannerReview;
import com.soongsil.soongpal.manner.domain.MannerTargetRole;
import com.soongsil.soongpal.manner.dto.MannerBadgeDto;
import com.soongsil.soongpal.manner.dto.MannerReviewCreateReqDto;
import com.soongsil.soongpal.manner.dto.MannerReviewResDto;
import com.soongsil.soongpal.manner.repository.MannerReviewRepository;
import com.soongsil.soongpal.reservation.domain.Reservation;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 거래완료(COMPLETED)된 예약 건에 대해 구매자↔총대가 서로에게 매너 키워드를 남기는 기능.
 * - 구매자는 ORGANIZER용 키워드로 총대를 평가
 * - 총대(게시글 작성자)는 BUYER용 키워드로 구매자를 평가
 * - 예약 하나당 각자 1번씩만 평가 가능
 */
@Service
@RequiredArgsConstructor
public class MannerReviewService {

    private final MannerReviewRepository mannerReviewRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;

    @Transactional
    public MannerReviewResDto createReview(Long reviewerId, Long reservationId, MannerReviewCreateReqDto dto) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        if (reservation.getStatus() != ReservationStatus.COMPLETED) {
            throw new MannerReviewException(MannerReviewErrorCode.RESERVATION_NOT_COMPLETED);
        }

        Long buyerId = reservation.getBuyer().getId();
        Long organizerId = reservation.getBoard().getUser().getId();

        User revieweeUser;
        MannerTargetRole expectedTargetRole;

        if (reviewerId.equals(buyerId)) {
            // 구매자가 총대를 평가 -> ORGANIZER용 키워드만 허용
            revieweeUser = reservation.getBoard().getUser();
            expectedTargetRole = MannerTargetRole.ORGANIZER;
        } else if (reviewerId.equals(organizerId)) {
            // 총대가 구매자를 평가 -> BUYER용 키워드만 허용
            revieweeUser = reservation.getBuyer();
            expectedTargetRole = MannerTargetRole.BUYER;
        } else {
            throw new MannerReviewException(MannerReviewErrorCode.NOT_A_PARTICIPANT);
        }

        if (dto.getKeywords().isEmpty() || dto.getKeywords().size() > 3) {
            throw new MannerReviewException(MannerReviewErrorCode.KEYWORD_COUNT_INVALID);
        }
        boolean roleMismatch = dto.getKeywords().stream()
                .anyMatch(k -> k.getTargetRole() != expectedTargetRole);
        if (roleMismatch) {
            throw new MannerReviewException(MannerReviewErrorCode.KEYWORD_ROLE_MISMATCH);
        }

        if (mannerReviewRepository.existsByReservationIdAndReviewerId(reservationId, reviewerId)) {
            throw new MannerReviewException(MannerReviewErrorCode.ALREADY_REVIEWED);
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        MannerReview review = MannerReview.builder()
                .reservation(reservation)
                .reviewer(reviewer)
                .reviewee(revieweeUser)
                .keywords(dto.getKeywords())
                .build();
        mannerReviewRepository.save(review);

        return MannerReviewResDto.from(review);
    }

    /** 이 사용자가 가장 많이 받은 키워드 상위 N개 (프로필에 노출용). */
    public List<MannerBadgeDto> getTopBadges(Long userId, int limit) {
        List<MannerReview> reviews = mannerReviewRepository.findByRevieweeId(userId);

        Map<MannerKeywordType, Long> counts = reviews.stream()
                .flatMap(r -> r.getKeywords().stream())
                .collect(Collectors.groupingBy(k -> k, Collectors.counting()));

        return counts.entrySet().stream()
                .sorted(Map.Entry.<MannerKeywordType, Long>comparingByValue().reversed())
                .limit(limit)
                .map(entry -> new MannerBadgeDto(entry.getKey().getLabel(), entry.getValue()))
                .toList();
    }

    /**
     * 이 예약에 대해 "나"(reviewerId)가 이미 매너 평가를 남겼는지 여부.
     * 프론트가 기기에만 평가여부를 저장해서 다른 기기 로그인 시 안내줄이 다시 뜨는 문제 때문에 필요해짐.
     */
    public boolean hasReviewed(Long reservationId, Long reviewerId) {
        return mannerReviewRepository.existsByReservationIdAndReviewerId(reservationId, reviewerId);
    }
}
