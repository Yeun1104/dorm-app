package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.dto.BoardSummaryDto;
import com.soongsil.soongpal.user.dto.ProfileResDto;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final ReservationRepository reservationRepository;

    public ProfileResDto getProfile(Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        List<Board> boards = boardRepository.findAllByUser(user);

        List<BoardSummaryDto> inProgressBoards = boards.stream()
                .filter(b -> b.getStatus() == BoardStatus.IN_PROGRESS)
                .map(BoardSummaryDto::from)
                .toList();

        List<BoardSummaryDto> completedBoards = boards.stream()
                .filter(b -> b.getStatus() == BoardStatus.COMPLETED)
                .map(BoardSummaryDto::from)
                .toList();

        long completedAsBuyer = reservationRepository.countByBuyerIdAndStatus(targetUserId, ReservationStatus.COMPLETED);
        long completedAsSeller = reservationRepository.countByBoard_UserIdAndStatus(targetUserId, ReservationStatus.COMPLETED);

        return ProfileResDto.builder()
                .userId(user.getId())
                .nickname(user.getNickName())
                .tradeCount((int) (completedAsBuyer + completedAsSeller))
                .mannerKeywords(Collections.emptyList()) // 매너배지 아직 없음
                .inProgressBoards(inProgressBoards)
                .completedBoards(completedBoards)
                .build();
    }
}
