package com.soongsil.soongpal.dorm.dto;

public record SpointItemDto(
        int no,
        String date,
        String reason,
        int point,
        boolean isBonus
) {
}
