package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.dto.BoardPageResDto;
import com.soongsil.soongpal.board.dto.BoardResDto;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.board.repository.LikeRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Transactional
@Service
@RequiredArgsConstructor
public class MyPageService {

    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final BoardRepository boardRepository;
    private final ReservationRepository reservationRepository;

    public BoardPageResDto getLikedBoards(Long userId, int page) {
        if (!userRepository.existsById(userId)) {
            throw new UserException(UserErrorCode.USER_NOT_FOUND);
        }
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BoardResDto> likedBoards = likeRepository.findBoardsByUserId(userId, pageable)
                .map((Board board) -> toBoardResDto(board, userId, true));

        return BoardPageResDto.from(likedBoards);
    }

    public BoardPageResDto getMyBoards(Long userId, int page) {
        User findUser = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BoardResDto> boards = boardRepository.findByUser(findUser, pageable)
                .map(b -> toBoardResDto(b, userId, likeRepository.existsByBoardIdAndUserId(b.getId(), userId)));
        return BoardPageResDto.from(boards);
    }

    private BoardResDto toBoardResDto(Board board, Long userId, boolean liked) {
        Integer likeCount = likeRepository.countByBoardId(board.getId());
        Integer remaining = calculateRemainingQuantity(board);
        Integer waitingCount = (int) reservationRepository.countByBoardIdAndStatus(board.getId(), ReservationStatus.PENDING);
        return BoardResDto.from(board, likeCount, liked, remaining, waitingCount);
    }

    private Integer calculateRemainingQuantity(Board board) {
        if (board.getTotalQuantity() == null) {
            return null;
        }
        int held = reservationRepository.sumHeldQuantityByBoardId(board.getId());
        return Math.max(board.getTotalQuantity() - held, 0);
    }

}
