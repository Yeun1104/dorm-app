package com.soongsil.soongpal.dorm.dto;

/**
 * 고쳐주세요 게시판 목록의 한 행.
 *
 * ⚠️ displayNo와 no는 다른 값임에 주의:
 * - displayNo: 화면에 보이는 게시글 번호 (예: 10795). 참고용일 뿐, 상세조회에는 못 씀.
 * - no: 상세조회(GET /api/dorm/repair/{no})에 실제로 써야 하는 값.
 */
public record RepairListItemDto(
        long displayNo,
        long no,
        String title,
        String writer,
        int viewCount,
        String writtenDate,
        boolean isNew
) {
}
