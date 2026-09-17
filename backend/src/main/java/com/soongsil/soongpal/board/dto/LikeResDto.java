package com.soongsil.soongpal.board.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LikeResDto {

    private Long boardId;
    private Integer count;

    public static LikeResDto of(Long boardId, Integer count) {
        return LikeResDto.builder()
                .boardId(boardId)
                .count(count)
                .build();
    }
}
