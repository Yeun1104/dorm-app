package com.soongsil.soongpal.manner.dto;

import com.soongsil.soongpal.manner.domain.MannerKeywordType;
import com.soongsil.soongpal.manner.domain.MannerReview;
import lombok.Builder;
import lombok.Getter;

import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Builder
public class MannerReviewResDto {
    private Long id;
    private Long reservationId;
    private Long reviewerId;
    private Long revieweeId;
    private Set<MannerKeywordType> keywords;
    private Set<String> keywordLabels;

    public static MannerReviewResDto from(MannerReview review) {
        return MannerReviewResDto.builder()
                .id(review.getId())
                .reservationId(review.getReservation().getId())
                .reviewerId(review.getReviewer().getId())
                .revieweeId(review.getReviewee().getId())
                .keywords(review.getKeywords())
                .keywordLabels(review.getKeywords().stream().map(MannerKeywordType::getLabel).collect(Collectors.toSet()))
                .build();
    }
}
