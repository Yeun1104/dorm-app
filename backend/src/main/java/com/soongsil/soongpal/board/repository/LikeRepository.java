package com.soongsil.soongpal.board.repository;


import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.Like;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.soongsil.soongpal.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Long> {

    int countByBoardId (Long boardId);

    Optional<Like> findByBoardIdAndUserId(Long boardId, Long userId);

    boolean existsByBoardIdAndUserId(Long boardId, Long userId);

    @Query("SELECT l.board FROM Like l WHERE l.user.id = :userId")
    Page<Board> findBoardsByUserId(@Param("userId") Long userId, Pageable pageable);

    void deleteAllByUser(User user);

}
