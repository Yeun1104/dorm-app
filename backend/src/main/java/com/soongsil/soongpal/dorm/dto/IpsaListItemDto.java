package com.soongsil.soongpal.dorm.dto;

public record IpsaListItemDto(
        int displayNo,
        long mozipCode,
        String recruitType,
        String selectionStatus,
        String residencePeriod,
        String roommateInfo
) {
}
