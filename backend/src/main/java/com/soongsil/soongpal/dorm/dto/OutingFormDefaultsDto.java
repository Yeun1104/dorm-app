package com.soongsil.soongpal.dorm.dto;

/**
 * 외박신청 글쓰기 폼에 미리 채워져 있는 값들 (신청자 프로필 기반 자동입력 값 + 최대 신청가능일).
 * moZipCode는 화면엔 안 보이지만 실제 제출(act_bbs_night.php) 때 필요한 hidden 필드라 같이 내려줌.
 */
public record OutingFormDefaultsDto(
        String applicantName,
        String room,
        String seat,
        String phone1,
        String phone2,
        String phone3,
        String defaultStartDate,
        String defaultEndDate,
        String maxEndDate,
        String moZipCode
) {
}
