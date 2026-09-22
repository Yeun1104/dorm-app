package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.user.dto.ProfileResDto;
import com.soongsil.soongpal.user.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

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
}
