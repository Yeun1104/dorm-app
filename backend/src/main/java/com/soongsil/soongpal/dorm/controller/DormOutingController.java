package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.OutingCreateReqDto;
import com.soongsil.soongpal.dorm.dto.OutingCreateResDto;
import com.soongsil.soongpal.dorm.dto.OutingDetailDto;
import com.soongsil.soongpal.dorm.dto.OutingFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.OutingListItemDto;
import com.soongsil.soongpal.dorm.service.DormOutingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dorm/outing")
@RequiredArgsConstructor
@Tag(name = "Dorm Outing Controller", description = "숭실대 기숙사 외박신청 조회/작성/삭제")
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

    @Operation(summary = "외박신청 상세조회")
    @GetMapping("/{no}")
    public ResponseEntity<CommonResDto<OutingDetailDto>> getOutingDetail(@PathVariable long no) {
        OutingDetailDto result = dormOutingService.getOutingDetail(getUserId(), no);
        return new ResponseEntity<>(new CommonResDto<>("외박신청 상세조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "외박신청 글쓰기 폼 기본값 조회", description = "신청자명/호실/자리/연락처 등 ssudorm이 자동으로 채워주는 값 + 최대 신청가능일")
    @GetMapping("/new")
    public ResponseEntity<CommonResDto<OutingFormDefaultsDto>> getOutingFormDefaults() {
        OutingFormDefaultsDto result = dormOutingService.getOutingFormDefaults(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("외박신청 폼 기본값 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "외박신청 작성/제출", description = "시작일/종료일/사유만 입력받아 실제 ssudorm에 제출함. 연락처 등은 프로필 기본값으로 자동 채움.")
    @PostMapping
    public ResponseEntity<CommonResDto<OutingCreateResDto>> createOuting(@Valid @RequestBody OutingCreateReqDto dto) {
        OutingCreateResDto result = dormOutingService.createOuting(getUserId(), dto);
        return new ResponseEntity<>(new CommonResDto<>("외박신청이 접수되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "외박신청 삭제", description = "되돌릴 수 없는 작업입니다. 반드시 confirm=true를 함께 보내야 실행됩니다 (프론트에서 확인 다이얼로그를 띄운 뒤에만 confirm=true로 호출하세요).")
    @DeleteMapping("/{no}")
    public ResponseEntity<CommonResDto<Void>> deleteOuting(
            @PathVariable long no,
            @RequestParam(defaultValue = "false") boolean confirm
    ) {
        dormOutingService.deleteOuting(getUserId(), no, confirm);
        return new ResponseEntity<>(new CommonResDto<>("외박신청이 삭제되었습니다.", null), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
