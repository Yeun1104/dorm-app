package com.soongsil.soongpal.dorm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 작성자명/이메일은 서버가 ssudorm 프로필에서 자동으로 채움.
 * 고쳐주세요와 다르게 방문허용 항목은 없고, 대신 isSecret(비밀글) 항목이 있음.
 * 첨부파일 업로드는 아직 지원 안 함.
 */
@Getter
@NoArgsConstructor
public class InquiryCreateReqDto {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    private String content;

    @NotBlank(message = "글 비밀번호를 입력해주세요. (4자 이상)")
    @Size(min = 4, message = "글 비밀번호는 4자 이상이어야 합니다.")
    private String postPassword;

    private boolean isSecret;
}
