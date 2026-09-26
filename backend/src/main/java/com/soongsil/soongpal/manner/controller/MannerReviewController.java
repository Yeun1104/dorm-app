package com.soongsil.soongpal.manner.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.manner.domain.MannerKeywordType;
import com.soongsil.soongpal.manner.dto.MannerReviewCreateReqDto;
import com.soongsil.soongpal.manner.dto.MannerReviewResDto;
import com.soongsil.soongpal.manner.service.MannerReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Manner Review Controller", description = "거래완료 후 매너 키워드(배지) 평가")
public class MannerReviewController {

    private final MannerReviewService mannerReviewService;

    @Operation(summary = "선택 가능한 매너 키워드 전체 목록", description = "프론트에서 선택 UI 만들 때 씀. targetRole로 구매자용/총대용 구분됨.")
    @GetMapping("/api/manner-keywords")
    public ResponseEntity<CommonResDto<List<MannerKeywordType>>> getKeywordOptions() {
        return new ResponseEntity<>(new CommonResDto<>("매너 키워드 목록", Arrays.asList(MannerKeywordType.values())), HttpStatus.OK);
    }

    @Operation(summary = "매너 평가 남기기", description = "거래완료(COMPLETED)된 예약에 대해 상대방에게 키워드 1~3개를 남김. 예약당 본인은 1번만 가능.")
    @PostMapping("/api/reservations/{reservationId}/manner-review")
    public ResponseEntity<CommonResDto<MannerReviewResDto>> createReview(
            @PathVariable Long reservationId,
            @Valid @RequestBody MannerReviewCreateReqDto dto
    ) {
        Long userId = getUserId();
        MannerReviewResDto result = mannerReviewService.createReview(userId, reservationId, dto);
        return new ResponseEntity<>(new CommonResDto<>("매너 평가가 등록되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "매너 평가 완료 여부 조회", description = "이 예약에 대해 내가 이미 평가를 남겼는지. 기기별이 아니라 서버 기준이라 다른 기기에서도 정확함.")
    @GetMapping("/api/reservations/{reservationId}/manner-review/status")
    public ResponseEntity<CommonResDto<Map<String, Boolean>>> getReviewStatus(@PathVariable Long reservationId) {
        Long userId = getUserId();
        boolean reviewed = mannerReviewService.hasReviewed(reservationId, userId);
        return new ResponseEntity<>(new CommonResDto<>("매너 평가 여부 조회 성공", Map.of("reviewed", reviewed)), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
