package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.exception.BoardErrorCode;
import com.soongsil.soongpal.common.exception.BoardException;
import com.soongsil.soongpal.common.file.S3Uploader;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BoardRepository boardRepository;
    private final S3Uploader s3Uploader;

    @Transactional
    public void deletePostByAdmin(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        board.getBoardImages().forEach(image -> s3Uploader.deleteFile(image.getImageUrl()));
        board.getBoardImages().clear();
        board.markAsDeletedByAdmin();
    }
}