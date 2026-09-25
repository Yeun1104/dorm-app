package com.soongsil.soongpal.board.service;

import com.soongsil.soongpal.board.domain.*;
import com.soongsil.soongpal.board.dto.*;
import com.soongsil.soongpal.board.repository.BoardImageRepository;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.board.repository.LikeRepository;
import com.soongsil.soongpal.common.exception.BoardErrorCode;
import com.soongsil.soongpal.common.exception.BoardException;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.common.file.S3Uploader;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
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
@Transactional(readOnly = true)
public class BoardService {

    private final BoardRepository boardRepository;
    private final LikeRepository likeRepository;
    private final UserRepository userRepository;
    private final S3Uploader s3Uploader;
    private final BoardImageRepository boardImageRepository;
    private final ReservationRepository reservationRepository;

    @Transactional
    public BoardResDto createBoard(BoardCreateReqDto boardCreateReqDto, List<MultipartFile> images, Long userId) {
        if (images == null) {
            images = Collections.emptyList();
        }

        if (images.size() > 5) {
            throw new BoardException(BoardErrorCode.BOARD_FILE_UPLOAD_ERROR);
        }

        User findUser = getUser(userId);
        if (findUser.isCurrentlyRestricted()) {
            throw new UserException(UserErrorCode.USER_SUSPENDED);
        }
        // 학교 계정(usaint) 인증된 사용자만 글쓰기 가능
        if (!findUser.isSchoolVerified()) {
            throw new UserException(UserErrorCode.SCHOOL_VERIFICATION_REQUIRED);
        }

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

        // ⚠️ 예전엔 여기서 GROUP 카테고리면 단체채팅방을 자동으로 열었는데, 이제 공동구매도 1:1 채팅만 쓰기로 해서
        // 글쓰기 시점엔 채팅방을 안 만듦. 구매자가 참여요청을 보내고, 방장이 수락해야 1:1 채팅방이 생김.
        return BoardResDto.from(board, 0, false, savedBoard.getTotalQuantity(), 0);
    }

    // ⚠️ open-in-view: false라서, 세션이 열려있는 이 트랜잭션 안에서 board.getUser() 같은 지연로딩 연관관계를
    // 다 읽어서 DTO로 변환까지 끝내야 함. @Transactional이 없으면 컨트롤러에 응답 돌아가기 직전(세션 닫힌 뒤)에
    // BoardResDto.from()이 board.getUser().getNickName()을 읽으려다 LazyInitializationException이 남.
    @Transactional(readOnly = true)
    public BoardResDto getBoardById(Long id, Long userId) {
        Board findBoard = boardRepository.findById(id)
                .orElseThrow(() -> new BoardException(BoardErrorCode.BOARD_NOT_FOUND));

        return toBoardResDto(findBoard, userId);
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
                boardUpdateReqDto.getTotalPrice(),
                boardUpdateReqDto.getTotalQuantity(),
                boardUpdateReqDto.getMinPurchaseQuantity(),
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

        return toBoardResDto(findBoard, userId);
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

        return toBoardResDto(findBoard, userId);
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

    @Transactional(readOnly = true)
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

        Page<BoardResDto> boardPageResDto = boardsPage.map(board -> toBoardResDto(board, userId));
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

    private BoardResDto toBoardResDto(Board board, Long userId) {
        Integer likeCount = likeRepository.countByBoardId(board.getId());
        boolean liked = likeRepository.existsByBoardIdAndUserId(board.getId(), userId);
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
