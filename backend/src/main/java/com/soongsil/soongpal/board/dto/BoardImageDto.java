package com.soongsil.soongpal.board.dto;

import com.soongsil.soongpal.board.domain.BoardImage;
import lombok.Getter;

@Getter
public class BoardImageDto {
    private Long id;
    private String imageUrl;

    public BoardImageDto(BoardImage boardImage) {
        this.id = boardImage.getId();
        this.imageUrl = boardImage.getImageUrl();
    }
}