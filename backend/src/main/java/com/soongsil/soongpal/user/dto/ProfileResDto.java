package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.manner.dto.MannerBadgeDto;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 다른 사용자의 프로필 조회 화면 데이터.
 */
@Getter
@Builder
public class ProfileResDto {
    private Long userId;
    private String nickname;
    private int tradeCount; // 구매자로서 완료 + 판매자(작성자)로서 완료한 거래 수 합
    private List<MannerBadgeDto> topMannerBadges; // 가장 많이 받은 매너 키워드 상위 3개 (label + 받은 횟수)
    private List<BoardSummaryDto> inProgressBoards; // 모집중인 글
    private List<BoardSummaryDto> completedBoards;  // 거래완료된 글
}
