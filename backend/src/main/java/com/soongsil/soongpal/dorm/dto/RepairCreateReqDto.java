package com.soongsil.soongpal.dorm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 작성자명/이메일은 서버가 ssudorm 프로필에서 자동으로 채움.
 * postPassword는 ssudorm 자체 게시판 기능(비밀번호로 본인 글 수정/삭제)이라 사용자가 직접 정해야 함 — 4자 이상.
 * 첨부파일 업로드는 아직 지원 안 함.
 */
@Getter
@NoArgsConstructor
public class RepairCreateReqDto {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    private String content;

    @NotBlank(message = "글 비밀번호를 입력해주세요. (4자 이상)")
    @Size(min = 4, message = "글 비밀번호는 4자 이상이어야 합니다.")
    private String postPassword;

    @NotNull(message = "방이 비어있을 때 방문 허용 여부를 선택해주세요.")
    private Boolean visitAllowed;
}
