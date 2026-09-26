package com.soongsil.soongpal.reservation.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.chat.dto.ChatRoomCreateReqDto;
import com.soongsil.soongpal.chat.dto.ChatRoomResDto;
import com.soongsil.soongpal.chat.service.ChatRoomService;
import com.soongsil.soongpal.common.exception.*;
import com.soongsil.soongpal.notification.domain.NotificationType;
import com.soongsil.soongpal.notification.service.NotificationService;
import com.soongsil.soongpal.report.domain.ReportCategory;
import com.soongsil.soongpal.report.domain.ReportStatus;
import com.soongsil.soongpal.report.repository.ReportRepository;
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
 * 공동구매 참여요청/예약 흐름 (방장 피로도·노쇼 리스크를 줄이기 위해 "요청 → 수락 → 채팅/차감" 순서로 바뀜).
 *
 * 상태 흐름:
 *  PENDING(구매자가 수량 입력해서 참여 요청 — 채팅방 없음, 게이지 안 깎임)
 *    → ACCEPTED(방장이 신청자 프로필 보고 수락 — 이 순간 1:1 채팅방 생성 + 게이지 차감이 같이 일어남)
 *      → COMPLETED(거래 완료) 또는 CANCELLED(취소, 게이지 복구)
 *    → REJECTED(방장이 거절 — 종료, 채팅/차감 없음)
 *    → CANCELLED(구매자가 PENDING 상태일 때 스스로 요청을 철회 — 방장 처리 전에만 가능)
 *
 * 게이지(남은 수량)는 그때그때 ACCEPTED+COMPLETED 예약 수량 합을 쿼리로 계산함(별도 카운터 컬럼 없음).
 * ⚠️ 동시에 여러 건을 동시에 수락하는 동시성 문제까지는 아직 막지 않음(초기 버전 한계).
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;
    private final ReportRepository reportRepository;
    private final NotificationService notificationService;

    /** API 1: 참여 요청 (구매자 → 방장). 이 시점엔 채팅방도 안 생기고 수량도 안 깎임. */
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
        if (!buyer.isSchoolVerified()) {
            throw new UserException(UserErrorCode.SCHOOL_VERIFICATION_REQUIRED);
        }

        // 이미 이 게시글에 대해 진행 중인(대기중 또는 수락된) 요청이 있으면 그걸 그대로 돌려줌 (중복 요청 방지)
        List<ReservationStatus> activeStatuses = List.of(ReservationStatus.PENDING, ReservationStatus.ACCEPTED);
        var existing = reservationRepository.findByBoardIdAndBuyerIdAndStatusIn(boardId, buyerId, activeStatuses);
        if (existing.isPresent()) {
            return ReservationResDto.from(existing.get());
        }

        validateMinQuantity(board, dto.getQuantity());

        Reservation reservation = Reservation.builder()
                .board(board)
                .buyer(buyer)
                .quantity(dto.getQuantity())
                .build();
        reservationRepository.save(reservation);

        notificationService.notify(
                board.getUser(),
                NotificationType.RESERVATION_REQUESTED,
                "새 참여 요청",
                buyer.getNickName() + "님이 '" + board.getTitle() + "'에 참여를 요청했어요",
                board.getId(), null, reservation.getId()
        );

        return ReservationResDto.from(reservation);
    }

    /**
     * 구매자가 본인이 보낸 참여 요청을 스스로 철회함. PENDING 상태일 때만 가능
     * (방장이 이미 수락/거절 처리했으면 취소 불가 — 그 이후엔 방장한테 요청해서 CANCELLED로 처리해야 함).
     * PENDING은 애초에 수량 게이지에 안 잡혀있는 상태라 별도 복구 로직은 필요 없음.
     */
    @Transactional
    public void withdrawByBuyer(Long buyerId, Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        if (!reservation.getBuyer().getId().equals(buyerId)) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_BUYER_ONLY);
        }

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_ALREADY_PROCESSED);
        }

        reservation.cancel();
    }

    /**
     * API 3: 방장의 수락/거절 처리.
     * 수락(ACCEPTED)이면 잔여수량 재검증 + 채팅방 생성 + 게이지 차감이 한 트랜잭션으로 같이 처리됨.
     */
    @Transactional
    public ReservationResDto updateStatus(Long userId, Long reservationId, ReservationStatus newStatus) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        Board board = reservation.getBoard();
        if (!board.getUser().getId().equals(userId)) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_OWNER_ONLY);
        }

        validateTransition(reservation.getStatus(), newStatus);

        switch (newStatus) {
            case ACCEPTED -> {
                // 이 시점에 진짜 수량이 남아있는지 다시 확인 (요청 시점엔 게이지에 안 잡혀있었으므로)
                validateQuantity(board, reservation.getQuantity());
                ChatRoomResDto chatRoom = chatRoomService.createPrivateChatRoom(
                        new ChatRoomCreateReqDto(board.getId()), reservation.getBuyer().getId());
                reservation.accept(chatRoom.getId());

                notificationService.notify(
                        reservation.getBuyer(),
                        NotificationType.RESERVATION_ACCEPTED,
                        "참여 요청 수락됨",
                        "'" + board.getTitle() + "' 참여 요청이 수락됐어요! 채팅으로 이동해보세요",
                        board.getId(), chatRoom.getId(), reservation.getId()
                );
            }
            case REJECTED -> {
                reservation.reject();
                notificationService.notify(
                        reservation.getBuyer(),
                        NotificationType.RESERVATION_REJECTED,
                        "참여 요청 거절됨",
                        "'" + board.getTitle() + "' 참여 요청이 거절됐어요",
                        board.getId(), null, reservation.getId()
                );
            }
            case COMPLETED -> {
                reservation.markCompleted();
                notificationService.notify(
                        reservation.getBuyer(),
                        NotificationType.RESERVATION_COMPLETED,
                        "거래 완료",
                        "'" + board.getTitle() + "' 거래가 완료됐어요. 매너 평가를 남겨보세요!",
                        board.getId(), reservation.getChatRoomId(), reservation.getId()
                );
            }
            case CANCELLED -> reservation.cancel();
            default -> throw new ReservationException(ReservationErrorCode.RESERVATION_INVALID_STATUS_TRANSITION);
        }

        autoCompleteBoardIfSoldOut(board);

        return ReservationResDto.from(reservation);
    }

    // ⚠️ open-in-view:false라서, ReservationResDto.from()이 reservation.getBoard()/getBuyer() 같은
    // 지연로딩 연관관계를 세션이 열려있는 트랜잭션 안에서 다 읽고 끝내야 함. 없으면 LazyInitializationException.
    /** API 2: 방장용 참여 요청 목록 조회. 신청자 프로필(거래횟수/노쇼 신고이력)이 같이 내려감. 방장만 조회 가능. */
    @Transactional(readOnly = true)
    public List<ReservationResDto> getReservationsByBoard(Long userId, Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (!board.getUser().getId().equals(userId)) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_LIST_VIEW_DENIED);
        }

        return reservationRepository.findByBoardId(boardId).stream()
                .map(this::toResDtoWithBuyerProfile)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResDto> getMyReservations(Long buyerId) {
        return reservationRepository.findByBuyerId(buyerId).stream()
                .map(ReservationResDto::from)
                .toList();
    }

    private ReservationResDto toResDtoWithBuyerProfile(Reservation reservation) {
        Long buyerId = reservation.getBuyer().getId();
        long tradeCount = reservationRepository.countByBuyerIdAndStatus(buyerId, ReservationStatus.COMPLETED);
        long noShowCount = reportRepository.countByReportedUserIdAndCategoryAndStatus(
                buyerId, ReportCategory.NO_SHOW, ReportStatus.RESOLVED);
        return ReservationResDto.withBuyerProfile(reservation, (int) tradeCount, (int) noShowCount);
    }

    private void validateMinQuantity(Board board, int quantity) {
        int minRequired = board.getMinPurchaseQuantity() != null ? board.getMinPurchaseQuantity() : 1;
        if (quantity < minRequired) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_BELOW_MIN_QUANTITY);
        }
    }

    private void validateQuantity(Board board, int quantity) {
        validateMinQuantity(board, quantity);

        int held = reservationRepository.sumHeldQuantityByBoardId(board.getId());
        int remaining = board.getTotalQuantity() - held;
        if (quantity > remaining) {
            throw new ReservationException(ReservationErrorCode.RESERVATION_QUANTITY_EXCEEDS_REMAINING);
        }
    }

    private void validateTransition(ReservationStatus from, ReservationStatus to) {
        boolean valid = switch (from) {
            case PENDING -> to == ReservationStatus.ACCEPTED || to == ReservationStatus.REJECTED;
            case ACCEPTED -> to == ReservationStatus.COMPLETED || to == ReservationStatus.CANCELLED;
            case REJECTED, COMPLETED, CANCELLED -> false; // 종료 상태, 더 이상 변경 불가
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

            // 모집완료(품절) 시, 이 글에 실제로 참여 확정된(ACCEPTED) 사람들 전원에게 알림
            List<Reservation> acceptedReservations = reservationRepository.findByBoardIdAndStatus(board.getId(), ReservationStatus.ACCEPTED);
            for (Reservation r : acceptedReservations) {
                notificationService.notify(
                        r.getBuyer(),
                        NotificationType.BOARD_SOLD_OUT,
                        "모집 완료",
                        "참여하신 '" + board.getTitle() + "' 공동구매가 모집완료됐어요",
                        board.getId(), null, r.getId()
                );
            }
        }
    }
}
