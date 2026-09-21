package com.soongsil.soongpal.dorm.dto;

import java.util.Map;

/**
 * 입사신청 상세는 항목이 매우 많고(성명/학번/배정호실/입금여부/세부금액 등) 페이지마다 조금씩 달라질 수 있어서,
 * 라벨을 그대로 key로 쓰는 Map으로 내려줌. 주민등록번호는 원본 페이지가 이미 뒷자리를 가려서 보여주기 때문에
 * 그 마스킹된 값 그대로는 포함되지만(예: "051104-4******"), 절대 원본 미마스킹 값은 긁어오지 않음.
 */
public record IpsaDetailDto(long mozipCode, Map<String, String> fields) {
}
