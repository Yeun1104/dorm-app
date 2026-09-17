package com.soongsil.soongpal.board.repository;

import com.soongsil.soongpal.board.domain.BoardImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardImageRepository extends JpaRepository<BoardImage, Long> {
}