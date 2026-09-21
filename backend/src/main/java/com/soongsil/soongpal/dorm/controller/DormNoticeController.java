package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.NoticeDetailDto;
import com.soongsil.soongpal.dorm.dto.NoticeListItemDto;
import com.soongsil.soongpal.dorm.service.DormNoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 공지사항. 읽기전용 (운영사무실만 작성 가능).
 */
@RestController
@RequestMapping("/api/dorm/notice")
@RequiredArgsConstructor
@Tag(name = "Dorm Notice Controller", description = "숭실대 기숙사 공지사항 조회 (읽기전용)")
public class DormNoticeController {

    private final DormNoticeService dormNoticeService;

    @Operation(summary = "공지사항 목록 조회 (검색 가능)", description = "page=0이 최신 15건. keyword를 주면 field(TITLE/CONTENT/WRITER, 기본 TITLE) 기준으로 검색함.")
    @GetMapping
    public ResponseEntity<CommonResDto<List<NoticeListItemDto>>> getList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "TITLE") RepairSearchField field
    ) {
        List<NoticeListItemDto> result = dormNoticeService.getList(getUserId(), page, keyword, field);
        return new ResponseEntity<>(new CommonResDto<>("공지사항 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "공지사항 상세조회")
    @GetMapping("/{no}")
    public ResponseEntity<CommonResDto<NoticeDetailDto>> getDetail(@PathVariable long no) {
        NoticeDetailDto result = dormNoticeService.getDetail(getUserId(), no);
        return new ResponseEntity<>(new CommonResDto<>("공지사항 상세조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
