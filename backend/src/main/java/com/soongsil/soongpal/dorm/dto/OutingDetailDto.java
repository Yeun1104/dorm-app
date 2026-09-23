package com.soongsil.soongpal.dorm.dto;

public record OutingDetailDto(
        long applicationNo,
        String applicantName,
        String room,
        String seat,
        String writtenAt,
        String phone,
        String resultStatus,
        String startDate,
        String endDate,
        String memo
) {
}
