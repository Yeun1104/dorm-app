package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.SpointResDto;
import com.soongsil.soongpal.dorm.service.DormSpointService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dorm/spoint")
@RequiredArgsConstructor
@Tag(name = "Dorm Spoint Controller", description = "마이페이지 - 상벌점조회 (읽기전용)")
public class DormSpointController {

    private final DormSpointService dormSpointService;

    @Operation(summary = "상벌점조회", description = "전체 내역 + 연도별 총점. 페이징 없음.")
    @GetMapping
    public ResponseEntity<CommonResDto<SpointResDto>> getSpoints() {
        SpointResDto result = dormSpointService.getSpoints(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("상벌점조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
