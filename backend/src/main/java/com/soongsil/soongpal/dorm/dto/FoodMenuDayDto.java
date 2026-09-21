package com.soongsil.soongpal.dorm.dto;

import java.util.List;

public record FoodMenuDayDto(
        String date,
        String dayOfWeek,
        List<String> breakfast,
        List<String> lunch,
        List<String> dinner,
        List<String> combinedMeal
) {
}
