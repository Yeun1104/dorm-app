package com.soongsil.soongpal.dorm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수정은 본인이 작성한 글만 가능. 비밀번호는 서버가 기존 값을 자동으로 재사용하므로 다시 입력할 필요 없음.
 */
@Getter
@NoArgsConstructor
public class RepairUpdateReqDto {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    private String content;

    @NotNull(message = "방이 비어있을 때 방문 허용 여부를 선택해주세요.")
    private Boolean visitAllowed;
}
