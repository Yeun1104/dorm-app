package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.user.dto.ProfileResDto;
import com.soongsil.soongpal.user.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Profile Controller", description = "사용자 프로필 조회 (닉네임/거래횟수/매너키워드/올린 글 목록)")
public class ProfileController {

    private final ProfileService profileService;

    @Operation(summary = "프로필 조회", description = "다른 사용자의 프로필(또는 내 프로필)을 조회함. 신고 버튼은 프론트에서 이 userId로 POST /api/reports 호출하면 됨.")
    @GetMapping("/api/users/{userId}/profile")
    public ResponseEntity<CommonResDto<ProfileResDto>> getProfile(@PathVariable Long userId) {
        ProfileResDto result = profileService.getProfile(userId);
        return new ResponseEntity<>(new CommonResDto<>("프로필 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "내 프로필 이미지 등록/변경", description = "기존 이미지가 있으면 교체됨(이전 이미지는 S3에서 삭제).")
    @PostMapping(value = "/api/users/me/profile-image", consumes = "multipart/form-data")
    public ResponseEntity<CommonResDto<Map<String, String>>> updateMyProfileImage(@RequestParam("image") MultipartFile image) {
        Long userId = getUserId();
        String url = profileService.updateMyProfileImage(userId, image);
        return new ResponseEntity<>(new CommonResDto<>("프로필 이미지가 변경되었습니다.", Map.of("profileImageUrl", url)), HttpStatus.OK);
    }

    @Operation(summary = "내 프로필 이미지 삭제(기본 이미지로 되돌림)")
    @DeleteMapping("/api/users/me/profile-image")
    public ResponseEntity<CommonResDto<Void>> deleteMyProfileImage() {
        Long userId = getUserId();
        profileService.deleteMyProfileImage(userId);
        return new ResponseEntity<>(new CommonResDto<>("프로필 이미지가 기본 이미지로 변경되었습니다.", null), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
