package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.OutingFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.OutingListItemDto;
import com.soongsil.soongpal.dorm.service.DormOutingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dorm/outing")
@RequiredArgsConstructor
@Tag(name = "Dorm Outing Controller", description = "숭실대 기숙사 외박신청 조회")
public class DormOutingController {

    private final DormOutingService dormOutingService;

    @Operation(summary = "외박신청 목록 조회", description = "page=0이 최신 10건. ssudorm 실시간 조회라 응답이 다소 느릴 수 있음.")
    @GetMapping
    public ResponseEntity<CommonResDto<List<OutingListItemDto>>> getOutingList(
            @RequestParam(defaultValue = "0") int page
    ) {
        List<OutingListItemDto> result = dormOutingService.getOutingList(getUserId(), page);
        return new ResponseEntity<>(new CommonResDto<>("외박신청 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "외박신청 글쓰기 폼 기본값 조회", description = "신청자명/호실/자리/연락처 등 ssudorm이 자동으로 채워주는 값 + 최대 신청가능일")
    @GetMapping("/new")
    public ResponseEntity<CommonResDto<OutingFormDefaultsDto>> getOutingFormDefaults() {
        OutingFormDefaultsDto result = dormOutingService.getOutingFormDefaults(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("외박신청 폼 기본값 조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
