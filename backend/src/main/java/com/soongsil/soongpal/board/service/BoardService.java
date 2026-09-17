package com.soongsil.soongpal.board.service;

import com.soongsil.soongpal.board.domain.*;
import com.soongsil.soongpal.board.dto.*;
import com.soongsil.soongpal.board.repository.BoardImageRepository;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.board.repository.LikeRepository;
import com.soongsil.soongpal.chat.service.ChatRoomService;
import com.soongsil.soongpal.common.exception.BoardErrorCode;
import com.soongsil.soongpal.common.exception.BoardException;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.common.file.S3Uploader;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;


@Slf4j
@RequiredArgsConstructor
@Service
public class BoardService {

    private final BoardRepository boardRepository;
    private final LikeRepository likeRepository;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;
    private final S3Uploader s3Uploader;
    private final BoardImageRepository boardImageRepository;

    @Transactional
    public BoardResDto createBoard(BoardCreateReqDto boardCreateReqDto, List<MultipartFile> images, Long userId) {
        if (images == null) {
            images = Collections.emptyList();
        }

        if (images.size() > 5) {
            throw new BoardException(BoardErrorCode.BOARD_FILE_UPLOAD_ERROR);
        }

        User findUser = getUser(userId);
        Board board = BoardCreateReqDto.toEntity(boardCreateReqDto, findUser);
        Board savedBoard = boardRepository.save(board);

        if (!images.isEmpty()) {
            for (MultipartFile imageFile : images) {
                String imageUrl = s3Uploader.uploadFile(imageFile, "board");
                if (imageUrl != null) {
                    BoardImage boardImage = BoardImage.builder()
                            .imageUrl(imageUrl)
                            .board(board)
                            .build();
                    boardImageRepository.save(boardImage);
                    board.addBoardImage(boardImage);
                }
            }
        }

        if (savedBoard.getCategory() == BoardCategory.GROUP) {
            chatRoomService.createGroupChatRoom(userId, boardCreateReqDto.getTitle(), savedBoard.getId());
        }

        return BoardResDto.from(board, 0, false);
    }

    public BoardResDto getBoardById(Long id, Long userId) {
        Board findBoard = boardRepository.findById(id)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        Integer likeCount = likeRepository.countByBoardId(findBoard.getId());
        boolean liked = likeRepository.existsByBoardIdAndUserId(findBoard.getId(), userId);
        return BoardResDto.from(findBoard, likeCount, liked);
    }

    @Transactional
    public BoardResDto updateBoard(Long id, @Valid BoardUpdateReqDto boardUpdateReqDto,
                                   List<MultipartFile> newImages, List<Long> deleteImageIds, Long userId) {
        User findUser = getUser(userId);

        Board findBoard = boardRepository.findById(id)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (!findUser.equals(findBoard.getUser())) {
            throw new BoardException(BoardErrorCode.BOARD_UPDATE_DENIED);
        }

        int currentImageCount = findBoard.getBoardImages().size();
        int deleteImageCount = (deleteImageIds != null) ? deleteImageIds.size() : 0;
        int newImageCount = (newImages != null) ? newImages.size() : 0;

        if (currentImageCount - deleteImageCount + newImageCount > 5) {
            throw new BoardException(BoardErrorCode.BOARD_FILE_UPLOAD_ERROR);
        }

        findBoard.update(
                boardUpdateReqDto.getTitle(),
                boardUpdateReqDto.getContent(),
                boardUpdateReqDto.getPrice(),
                boardUpdateReqDto.getUrl(),
                boardUpdateReqDto.getLocation(),
                boardUpdateReqDto.getCategory()
        );

        // 이미지 삭제
        if (deleteImageIds != null && !deleteImageIds.isEmpty()) {
            for (Long deleteImageId : deleteImageIds) {
                BoardImage imageToDelete = findBoard.getBoardImages().stream()
                        .filter(img -> img.getId().equals(deleteImageId))
                        .findFirst()
                        .orElse(null);

                if (imageToDelete != null) {
                    s3Uploader.deleteFile(imageToDelete.getImageUrl());
                    findBoard.removeBoardImage(deleteImageId);
                }
            }
        }

        // 새 이미지 추가
        if (newImages != null && !newImages.isEmpty()) {
            for (MultipartFile imageFile : newImages) {
                String imageUrl = s3Uploader.uploadFile(imageFile, "board");
                BoardImage newBoardImage = BoardImage.builder()
                        .imageUrl(imageUrl)
                        .board(findBoard)
                        .build();
                findBoard.addBoardImage(newBoardImage);
            }
        }

        Integer likeCount = likeRepository.countByBoardId(findBoard.getId());
        boolean liked = likeRepository.existsByBoardIdAndUserId(findBoard.getId(), userId);
        return BoardResDto.from(findBoard, likeCount, liked);
    }

    @Transactional
    public BoardResDto updateBoardStatus(Long id, BoardStatusUpdateDto statusUpdateDto, Long userId) {
        User findUser = getUser(userId);

        Board findBoard = boardRepository.findById(id)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (!findUser.equals(findBoard.getUser())) {
            throw new BoardException(BoardErrorCode.BOARD_UPDATE_DENIED);
        }

        findBoard.updateStatus(statusUpdateDto.getStatus());

        Integer likeCount = likeRepository.countByBoardId(findBoard.getId());
        boolean liked = likeRepository.existsByBoardIdAndUserId(findBoard.getId(), userId);
        return BoardResDto.from(findBoard, likeCount, liked);
    }

    @Transactional
    public void deleteBoard(Long id, Long userId) {
        User findUser = getUser(userId);

        Board findBoard = boardRepository.findById(id)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (!findUser.equals(findBoard.getUser())) {
            throw new BoardException(BoardErrorCode.BOARD_DELETE_DENIED);
        }

        findBoard.softDeleteByUser();
    }

    public BoardPageResDto getFilteredBoards(String keyword, Long userId, BoardCategory category, BoardStatus status, int page) {
        Pageable pageable = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        Page<Board> boardsPage;

        if (keyword != null && !keyword.isEmpty()) {
            // 키워드로 게시글 제목 검색
            boardsPage = boardRepository.findByTitleContainingIgnoreCase(keyword, pageable);
        }
        else if (category != null && status != null) {
            // 카테고리 + 상태 조합 검색
            boardsPage = boardRepository.findByCategoryAndStatus(category, status, pageable);
        } else if (category != null) {
            // 게시글 카테고리 검색
            boardsPage = boardRepository.findByCategory(category, pageable);
        } else if (status != null) {
            // 현재 게시글 상태 검색
            boardsPage = boardRepository.findByStatus(status, pageable);
        } else {
            // 모든 게시글 조회
            boardsPage = boardRepository.findAll(pageable);
        }

        Page<BoardResDto> boardPageResDto = boardsPage.map(board -> BoardResDto.from(board, likeRepository.countByBoardId(board.getId()), likeRepository.existsByBoardIdAndUserId(board.getId(), userId) ));
        return BoardPageResDto.from(boardPageResDto);
    }

    public LikeResDto addLike(Long boardId, Long userId) {
        User findUser = getUser(userId);

        Board findBoard = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        if (likeRepository.existsByBoardIdAndUserId(findBoard.getId(), userId)) {
            int likeCount = likeRepository.countByBoardId(boardId);
            return LikeResDto.of(boardId, likeCount);
        }

        Like like = Like.builder()
                .board(findBoard)
                .user(findUser)
                .build();
        likeRepository.save(like);

        int likeCount = likeRepository.countByBoardId(boardId);
        return LikeResDto.of(boardId, likeCount);
    }

    public LikeResDto deleteLike(Long boardId, Long userId) {
        Like findLike = likeRepository.findByBoardIdAndUserId(boardId, userId)
                .orElseThrow(() -> new BoardException(BoardErrorCode.LIKE_NOT_FOUND));

        likeRepository.delete(findLike);

        int likeCount = likeRepository.countByBoardId(boardId);
        return LikeResDto.of(boardId, likeCount);
    }

    public LikeResDto getLikeCount(Long boardId) {
        int likeCount = likeRepository.countByBoardId(boardId);
        return LikeResDto.of(boardId, likeCount);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public void softDeleteAllBoardsByUser(User user) {
        List<Board> boardsToDelete = boardRepository.findAllByUser(user);
        for (Board board : boardsToDelete) {
            board.getBoardImages().forEach(image -> s3Uploader.deleteFile(image.getImageUrl()));
            board.getBoardImages().clear();
            board.softDeleteByUser();
        }
    }
}