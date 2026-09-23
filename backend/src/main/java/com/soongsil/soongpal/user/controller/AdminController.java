package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.user.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "관리자", description = "관리자 전용 API")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @DeleteMapping("/boards/{boardId}")
    @ApiResponse(responseCode = "200", description = "게시글 강제 삭제 성공")
    @Operation(summary = "게시글 강제 삭제", description = "관리자가 ID를 이용해 특정 게시글을 강제로 삭제합니다.")
    public ResponseEntity<CommonResDto<Void>> deletePostByAdmin(@PathVariable Long boardId) {
        adminService.deletePostByAdmin(boardId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 강제 삭제 성공", null), HttpStatus.OK);
    }

    @PatchMapping("/users/{userId}/verify-school")
    @ApiResponse(responseCode = "200", description = "학교 인증 수동 처리 성공")
    @Operation(summary = "[임시] 학교 계정 인증 수동 처리", description = "usaint 연동 전까지 관리자가 수동으로 학교 인증 여부를 true로 바꿔주는 임시 API.")
    public ResponseEntity<CommonResDto<Void>> verifySchoolAccount(@PathVariable Long userId) {
        adminService.verifySchoolAccount(userId);
        return new ResponseEntity<>(new CommonResDto<>("학교 인증 처리 완료", null), HttpStatus.OK);
    }
}
