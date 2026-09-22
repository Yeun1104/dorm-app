package com.soongsil.soongpal.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 다른 사용자의 프로필 조회 화면 데이터.
 * ⚠️ mannerKeywords는 매너 배지 시스템을 아직 안 만들어서 항상 빈 배열로 내려감 (추후 연동 예정).
 */
@Getter
@Builder
public class ProfileResDto {
    private Long userId;
    private String nickname;
    private int tradeCount; // 구매자로서 완료 + 판매자(작성자)로서 완료한 거래 수 합
    private List<String> mannerKeywords; // 항상 빈 배열 (추후 매너배지 기능과 연동)
    private List<BoardSummaryDto> inProgressBoards; // 모집중인 글
    private List<BoardSummaryDto> completedBoards;  // 거래완료된 글
}
