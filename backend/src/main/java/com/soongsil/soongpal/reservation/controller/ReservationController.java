package com.soongsil.soongpal.reservation.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.reservation.dto.ReservationCreateReqDto;
import com.soongsil.soongpal.reservation.dto.ReservationResDto;
import com.soongsil.soongpal.reservation.dto.ReservationStatusUpdateReqDto;
import com.soongsil.soongpal.reservation.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Reservation Controller", description = "공동구매 참여요청(예약) API — 요청 → 방장 수락/거절 → (수락시) 1:1채팅+수량차감 순서")
public class ReservationController {

    private final ReservationService reservationService;

    @Operation(summary = "참여 요청 (API 1)", description = "수량을 입력해서 참여를 요청함. 이 시점엔 채팅방도 안 생기고 수량도 차감 안 됨 — 방장 확인 대기 상태(PENDING)가 됨.")
    @PostMapping("/api/board/{boardId}/reservations")
    public ResponseEntity<CommonResDto<ReservationResDto>> createReservation(
            @PathVariable Long boardId,
            @Valid @RequestBody ReservationCreateReqDto dto
    ) {
        Long userId = getUserId();
        ReservationResDto result = reservationService.createReservation(userId, boardId, dto);
        return new ResponseEntity<>(new CommonResDto<>("참여 요청이 접수되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "참여 요청 수락/거절/상태변경 (API 3, 방장 전용)",
            description = "PENDING → ACCEPTED(수락, 이때 1:1채팅 생성+수량차감) 또는 REJECTED(거절). ACCEPTED → COMPLETED(거래완료) 또는 CANCELLED(취소, 수량복구).")
    @PatchMapping("/api/reservations/{reservationId}/status")
    public ResponseEntity<CommonResDto<ReservationResDto>> updateStatus(
            @PathVariable Long reservationId,
            @Valid @RequestBody ReservationStatusUpdateReqDto dto
    ) {
        Long userId = getUserId();
        ReservationResDto result = reservationService.updateStatus(userId, reservationId, dto.getStatus());
        return new ResponseEntity<>(new CommonResDto<>("예약 상태가 변경되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "참여 요청 목록 조회 (API 2, 방장 전용)",
            description = "신청자 프로필(거래횟수/노쇼 신고이력)과 신청 수량이 같이 내려옴. 게시글 작성자만 조회 가능.")
    @GetMapping("/api/board/{boardId}/reservations")
    public ResponseEntity<CommonResDto<List<ReservationResDto>>> getReservationsByBoard(@PathVariable Long boardId) {
        Long userId = getUserId();
        List<ReservationResDto> result = reservationService.getReservationsByBoard(userId, boardId);
        return new ResponseEntity<>(new CommonResDto<>("참여 요청 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "내 참여 요청 목록 조회")
    @GetMapping("/api/reservations/mine")
    public ResponseEntity<CommonResDto<List<ReservationResDto>>> getMyReservations() {
        Long userId = getUserId();
        List<ReservationResDto> result = reservationService.getMyReservations(userId);
        return new ResponseEntity<>(new CommonResDto<>("내 참여 요청 목록 조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
