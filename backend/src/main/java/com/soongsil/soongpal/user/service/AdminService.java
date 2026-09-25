package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.exception.BoardErrorCode;
import com.soongsil.soongpal.common.exception.BoardException;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.common.file.S3Uploader;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final S3Uploader s3Uploader;

    @Transactional
    public void deletePostByAdmin(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        board.getBoardImages().forEach(image -> s3Uploader.deleteFile(image.getImageUrl()));
        board.getBoardImages().clear();
        board.markAsDeletedByAdmin();
    }

    /**
     * ⚠️ usaint(학교 계정) 연동 전까지 임시로 쓰는 수동 인증 처리.
     * 실제 usaint API 연동이 붙으면 이 수동 처리는 필요 없어지거나 예외 상황용으로만 남을 예정.
     */
    @Transactional
    public void verifySchoolAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        user.markSchoolVerified();
    }
}
