package com.soongsil.soongpal.reservation.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.chat.dto.ChatRoomCreateReqDto;
import com.soongsil.soongpal.chat.dto.ChatRoomResDto;
import com.soongsil.soongpal.chat.service.ChatRoomService;
import com.soongsil.soongpal.common.exception.*;
import com.soongsil.soongpal.reservation.domain.Reservation;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.dto.ReservationCreateReqDto;
import com.soongsil.soongpal.reservation.dto.ReservationResDto;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 공동구매 수량 예약(구매신청) 흐름.
 *
 * 상태 흐름: PENDING(구매자가 수량 입력해서 1:1 채팅 시작 — 아직 수량 게이지 안 깎임)
 *          → IN_PROGRESS(방장이 "이 사람과 거래중" 확정 — 이때부터 게이지 차감)
 *          → COMPLETED(거래 완료) 또는 CANCELLED(취소, 게이지 있었으면 복구)
 *
 * 게이지(남은 수량)는 별도 카운터 컬럼을 두지 않고, 그때그때 IN_PROGRESS+COMPLETED 예약 수량 합을
 * 쿼리로 계산함(ReservationRepository.sumHeldQuantityByBoardId) — 그래서 취소하면 자동으로 복구된 것처럼 보임.
 * ⚠️ 동시에 여러 명이 동시에 "거래중으로 확정"을 누르는 동시성 문제까지는 아직 막지 않음(초기 버전 한계).
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;

    @Transactional
    public ReservationResDto createReservation(Long buyerId, Long boardId, ReservationCreateReqDto dto) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (board.getStatus() != BoardStatus.IN_PROGRESS) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_BOARD_NOT_PURCHASABLE);
        }

        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        if (board.getUser().getId().equals(buyerId)) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_SELF_PURCHASE_NOT_ALLOWED);
        }

        if (buyer.isCurrentlyRestricted()) {
            throw new UserException(UserErrorCode.USER_SUSPENDED);
        }
        // 학교 계정(usaint) 인증된 사용자만 구매 신청 가능
        if (!buyer.isSchoolVerified()) {
            throw new UserException(UserErrorCode.SCHOOL_VERIFICATION_REQUIRED);
        }

        // 이미 이 게시글에 대해 진행 중인 예약이 있으면 그걸 그대로 돌려줌 (중복 생성 방지)
        List<ReservationStatus> activeStatuses = List.of(ReservationStatus.PENDING, ReservationStatus.IN_PROGRESS);
        var existing = reservationRepository.findByBoardIdAndBuyerIdAndStatusIn(boardId, buyerId, activeStatuses);
        if (existing.isPresent()) {
            return ReservationResDto.from(existing.get());
        }

        validateQuantity(board, dto.getQuantity());

        ChatRoomResDto chatRoom = chatRoomService.createPrivateChatRoom(new ChatRoomCreateReqDto(boardId), buyerId);

        Reservation reservation = Reservation.builder()
                .board(board)
                .buyer(buyer)
                .chatRoomId(chatRoom.getId())
                .quantity(dto.getQuantity())
                .build();
        reservationRepository.save(reservation);

        return ReservationResDto.from(reservation);
    }

    @Transactional
    public ReservationResDto updateStatus(Long userId, Long reservationId, ReservationStatus newStatus) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        Board board = reservation.getBoard();
        if (!board.getUser().getId().equals(userId)) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_OWNER_ONLY);
        }

        validateTransition(reservation.getStatus(), newStatus);

        // PENDING 상태에서 IN_PROGRESS/COMPLETED로 넘어갈 때는 이 시점에 수량이 진짜 남아있는지 다시 확인함
        // (이 예약은 아직 게이지에 안 잡혀있는 상태이므로 그대로 더해서 비교)
        if (reservation.getStatus() == ReservationStatus.PENDING
                && (newStatus == ReservationStatus.IN_PROGRESS || newStatus == ReservationStatus.COMPLETED)) {
            validateQuantity(board, reservation.getQuantity());
        }

        switch (newStatus) {
            case IN_PROGRESS -> reservation.markInProgress();
            case COMPLETED -> reservation.markCompleted();
            case CANCELLED -> reservation.cancel();
            default -> throw new ReservationException(ReservationErrorCode.RESERVATION_INVALID_STATUS_TRANSITION);
        }

        autoCompleteBoardIfSoldOut(board);

        return ReservationResDto.from(reservation);
    }

    public List<ReservationResDto> getReservationsByBoard(Long boardId) {
        return reservationRepository.findByBoardId(boardId).stream()
                .map(ReservationResDto::from)
                .toList();
    }

    public List<ReservationResDto> getMyReservations(Long buyerId) {
        return reservationRepository.findByBuyerId(buyerId).stream()
                .map(ReservationResDto::from)
                .toList();
    }

    private void validateQuantity(Board board, int quantity) {
        int minRequired = board.getMinPurchaseQuantity() != null ? board.getMinPurchaseQuantity() : 1;
        if (quantity < minRequired) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_BELOW_MIN_QUANTITY);
        }

        int held = reservationRepository.sumHeldQuantityByBoardId(board.getId());
        int remaining = board.getTotalQuantity() - held;
        if (quantity > remaining) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_QUANTITY_EXCEEDS_REMAINING);
        }
    }

    private void validateTransition(ReservationStatus from, ReservationStatus to) {
        boolean valid = switch (from) {
            case PENDING -> to == ReservationStatus.IN_PROGRESS || to == ReservationStatus.COMPLETED || to == ReservationStatus.CANCELLED;
            case IN_PROGRESS -> to == ReservationStatus.COMPLETED || to == ReservationStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false; // 종료 상태, 더 이상 변경 불가
        };
        if (!valid) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_INVALID_STATUS_TRANSITION);
        }
    }

    private void autoCompleteBoardIfSoldOut(Board board) {
        int held = reservationRepository.sumHeldQuantityByBoardId(board.getId());
        int remaining = board.getTotalQuantity() - held;
        if (remaining <= 0 && board.getStatus() == BoardStatus.IN_PROGRESS) {
            board.updateStatus(BoardStatus.COMPLETED);
        }
    }
}
