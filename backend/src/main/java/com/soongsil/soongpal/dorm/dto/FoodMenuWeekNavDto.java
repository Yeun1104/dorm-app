package com.soongsil.soongpal.dorm.dto;

/**
 * 이전/다음 주로 넘어갈 때 GET /api/dorm/food-menu?gyear=&gmonth=&gday=에 그대로 넣어주면 됨.
 */
public record FoodMenuWeekNavDto(String gyear, String gmonth, String gday) {
}
