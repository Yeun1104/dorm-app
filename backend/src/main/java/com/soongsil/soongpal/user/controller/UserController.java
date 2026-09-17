package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.user.dto.UserInfoResponseDto;
import com.soongsil.soongpal.user.dto.UserUpdateRequestDto;
import com.soongsil.soongpal.user.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "사용자", description = "사용자 정보 관리 관련 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    @Operation(summary = "내 정보 조회", description = "로그인된 사용자의 정보를 조회합니다.")
    @GetMapping("/me")
    public ResponseEntity<UserInfoResponseDto> getUserInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        UserInfoResponseDto userInfo = authService.getUserInfo(userId);
        return ResponseEntity.ok(userInfo);
    }

    @Operation(summary = "내 정보 수정", description = "로그인된 사용자의 닉네임을 수정합니다.")
    @PatchMapping("/me")
    public ResponseEntity<UserInfoResponseDto> updateUser(
            @RequestBody UserUpdateRequestDto updateRequestDto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        UserInfoResponseDto updatedUser = authService.updateUserInfo(userId, updateRequestDto);
        return ResponseEntity.ok(updatedUser);
    }

    @Operation(summary = "회원 탈퇴", description = "로그인된 사용자를 탈퇴 처리하고 카카오 연동을 해제합니다.")
    @DeleteMapping("/me")
    public ResponseEntity<String> deleteUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        authService.deleteUser(userId);

        return ResponseEntity.ok("회원 탈퇴가 성공적으로 처리되었습니다.");
    }

    @Operation(summary = "로그아웃", description = "사용자의 리프레시 토큰을 무효화하여 로그아웃 처리합니다.")
    @PostMapping("/logout")
    public ResponseEntity<String> logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        authService.logout(userId);

        return ResponseEntity.ok("로그아웃되었습니다.");
    }

}