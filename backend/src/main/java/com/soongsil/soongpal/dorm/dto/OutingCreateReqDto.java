package com.soongsil.soongpal.dorm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 사용자가 실제로 입력하는 값은 이 세 개뿐.
 * 신청자명/호실/자리/연락처는 서버가 ssudorm 프로필에서 자동으로 채워서 같이 제출함.
 */
@Getter
@NoArgsConstructor
public class OutingCreateReqDto {

    @NotNull(message = "외박 시작일을 입력해주세요.")
    private LocalDate startDate;

    @NotNull(message = "외박 종료일을 입력해주세요.")
    private LocalDate endDate;

    @NotBlank(message = "외박 사유를 입력해주세요.")
    private String memo;
}
