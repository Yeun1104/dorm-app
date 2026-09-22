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
@Tag(name = "Reservation Controller", description = "공동구매 수량 예약(구매신청) API")
public class ReservationController {

    private final ReservationService reservationService;

    @Operation(summary = "구매 신청", description = "수량을 입력해서 구매를 신청함. 1:1 채팅방이 같이 생성됨(이미 신청한 적 있으면 기존 걸 그대로 돌려줌). 이 시점엔 아직 수량이 차감되지 않음.")
    @PostMapping("/api/board/{boardId}/reservations")
    public ResponseEntity<CommonResDto<ReservationResDto>> createReservation(
            @PathVariable Long boardId,
            @Valid @RequestBody ReservationCreateReqDto dto
    ) {
        Long userId = getUserId();
        ReservationResDto result = reservationService.createReservation(userId, boardId, dto);
        return new ResponseEntity<>(new CommonResDto<>("구매 신청이 접수되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "예약 상태 변경 (방장 전용)", description = "IN_PROGRESS(거래중, 이때부터 수량 차감)/COMPLETED(거래완료)/CANCELLED(취소, 수량 복구)")
    @PatchMapping("/api/reservations/{reservationId}/status")
    public ResponseEntity<CommonResDto<ReservationResDto>> updateStatus(
            @PathVariable Long reservationId,
            @Valid @RequestBody ReservationStatusUpdateReqDto dto
    ) {
        Long userId = getUserId();
        ReservationResDto result = reservationService.updateStatus(userId, reservationId, dto.getStatus());
        return new ResponseEntity<>(new CommonResDto<>("예약 상태가 변경되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "게시글별 예약 목록 조회 (방장 확인용)", description = "누가 얼마나 신청했는지 목록. 방장이든 누구든 지금은 다 볼 수 있음 — 방장 전용으로 막을지는 추후 논의.")
    @GetMapping("/api/board/{boardId}/reservations")
    public ResponseEntity<CommonResDto<List<ReservationResDto>>> getReservationsByBoard(@PathVariable Long boardId) {
        List<ReservationResDto> result = reservationService.getReservationsByBoard(boardId);
        return new ResponseEntity<>(new CommonResDto<>("예약 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "내 구매 신청 목록 조회")
    @GetMapping("/api/reservations/mine")
    public ResponseEntity<CommonResDto<List<ReservationResDto>>> getMyReservations() {
        Long userId = getUserId();
        List<ReservationResDto> result = reservationService.getMyReservations(userId);
        return new ResponseEntity<>(new CommonResDto<>("내 구매 신청 목록 조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
