package com.soongsil.soongpal.dorm.dto;

/**
 * 외박신청/장기비움신청 목록의 한 행.
 *
 * ⚠️ displayNo와 no는 다른 값임에 주의:
 * - displayNo: 화면에 보이는 신청 번호 (예: 103). 참고용일 뿐, 상세조회에는 못 씀.
 * - no: 상세조회(GET /api/dorm/outing/{no} 또는 /api/dorm/long-term-absence/{no})에 실제로 써야 하는 값.
 *
 * status/statusRawIcon 관련 안내:
 * 스크린샷에서 확인된 아이콘은 "ing_1.gif" = "승인" 하나뿐이라, 그 외 아이콘은
 * 매핑을 확신할 수 없어서 status="확인필요"로 내려주고 statusRawIcon에 실제 파일명을 그대로 담아둠.
 */
public record OutingListItemDto(
        long displayNo,
        String startDate,
        String endDate,
        String writtenAt,
        String status,
        String statusRawIcon,
        Long no
) {
}
