package com.soongsil.soongpal.dorm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DormAccountRegisterReqDto {

    @NotBlank(message = "기숙사 사이트 아이디를 입력해주세요.")
    private String dormUsername;

    @NotBlank(message = "기숙사 사이트 비밀번호를 입력해주세요.")
    private String dormPassword;
}
