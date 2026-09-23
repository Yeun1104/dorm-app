package com.soongsil.soongpal.dorm.dto;

import java.util.List;

public record FoodMenuResDto(
        String weekLabel,
        List<FoodMenuDayDto> days,
        FoodMenuWeekNavDto prevWeek,
        FoodMenuWeekNavDto nextWeek
) {
}
