package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.dto.BoardPageResDto;
import com.soongsil.soongpal.board.dto.BoardResDto;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.board.repository.LikeRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
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

    public BoardPageResDto getLikedBoards(Long userId, int page) {
        if (!userRepository.existsById(userId)) {
            throw new UserException(UserErrorCode.USER_NOT_FOUND);
        }
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BoardResDto> likedBoards = likeRepository.findBoardsByUserId(userId, pageable)
                .map((Board board) -> BoardResDto.from(board, likeRepository.countByBoardId(board.getId()), true));
        
        return BoardPageResDto.from(likedBoards);
    }

    public BoardPageResDto getMyBoards(Long userId, int page) {
        User findUser = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BoardResDto> boards = boardRepository.findByUser(findUser, pageable)
                .map(b -> BoardResDto.from(b, likeRepository.countByBoardId(b.getId()), likeRepository.existsByBoardIdAndUserId(b.getId(), findUser.getId())));
        return BoardPageResDto.from(boards);
    }

}
