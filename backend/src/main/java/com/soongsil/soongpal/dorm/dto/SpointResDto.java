package com.soongsil.soongpal.dorm.dto;

import java.util.List;

public record SpointResDto(List<SpointItemDto> items, List<SpointYearTotalDto> yearlyTotals) {
}
