package com.soongsil.soongpal.board.repository;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;


public interface BoardRepository extends JpaRepository<Board, Long> {

    /**
     * 게시글 행을 쓰기 잠금(SELECT ... FOR UPDATE)으로 조회.
     * 참여 요청처럼 "이미 있는지 확인 → 없으면 저장" 하는 곳에서 같은 글에 대한 동시 요청을 한 줄로 세워
     * 버튼 연타 등으로 같은 사람의 진행 중 요청이 2개 생기는 걸 막음 (트랜잭션 안에서만 사용)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Board b WHERE b.id = :id")
    Optional<Board> findByIdForUpdate(@Param("id") Long id);
    Page<Board> findByCategory(BoardCategory category, Pageable pageable);
    Page<Board> findByStatus(BoardStatus status, Pageable pageable);
    Page<Board> findByCategoryAndStatus(BoardCategory category, BoardStatus status, Pageable pageable);
    Page<Board> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);
    Page<Board> findByUser(User user, Pageable pageable);
    List<Board> findAllByUser(User user);
}
