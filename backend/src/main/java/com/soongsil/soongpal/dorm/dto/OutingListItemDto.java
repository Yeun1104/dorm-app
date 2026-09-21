package com.soongsil.soongpal.dorm.dto;

/**
 * 외박신청 목록의 한 행.
 *
 * status/statusRawIcon 관련 안내:
 * 스크린샷에서 확인된 아이콘은 "ing_1.gif" = "승인" 하나뿐이라, 그 외 아이콘은
 * 매핑을 확신할 수 없어서 status="확인필요"로 내려주고 statusRawIcon에 실제 파일명을 그대로 담아둠.
 * 나중에 "대기"/"반려" 상태인 신청 건을 실제로 하나 만들어서 아이콘 파일명을 확인하면 매핑 추가하면 됨.
 */
public record OutingListItemDto(
        long applicationNo,
        String startDate,
        String endDate,
        String writtenAt,
        String status,
        String statusRawIcon,
        Long detailId
) {
}
