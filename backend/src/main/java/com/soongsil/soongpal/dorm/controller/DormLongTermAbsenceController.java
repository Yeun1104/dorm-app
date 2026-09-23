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

/**
 * 장기비움신청. 외박신청과 폼 구조가 완전히 동일해서(board_no만 다름) 같은 서비스 로직을 재사용함.
 */
@RestController
@RequestMapping("/api/dorm/long-term-absence")
@RequiredArgsConstructor
@Tag(name = "Dorm Long-Term Absence Controller", description = "숭실대 기숙사 장기비움신청 조회/작성/삭제")
public class DormLongTermAbsenceController {

    private final DormOutingService dormOutingService;

    @Operation(summary = "장기비움신청 목록 조회", description = "page=0이 최신 10건.")
    @GetMapping
    public ResponseEntity<CommonResDto<List<OutingListItemDto>>> getList(
            @RequestParam(defaultValue = "0") int page
    ) {
        List<OutingListItemDto> result = dormOutingService.getLongTermAbsenceList(getUserId(), page);
        return new ResponseEntity<>(new CommonResDto<>("장기비움신청 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "장기비움신청 상세조회")
    @GetMapping("/{no}")
    public ResponseEntity<CommonResDto<OutingDetailDto>> getDetail(@PathVariable long no) {
        OutingDetailDto result = dormOutingService.getLongTermAbsenceDetail(getUserId(), no);
        return new ResponseEntity<>(new CommonResDto<>("장기비움신청 상세조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "장기비움신청 글쓰기 폼 기본값 조회")
    @GetMapping("/new")
    public ResponseEntity<CommonResDto<OutingFormDefaultsDto>> getFormDefaults() {
        OutingFormDefaultsDto result = dormOutingService.getLongTermAbsenceFormDefaults(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("장기비움신청 폼 기본값 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "장기비움신청 작성/제출", description = "시작일/종료일/사유만 입력받아 실제 ssudorm에 제출함.")
    @PostMapping
    public ResponseEntity<CommonResDto<OutingCreateResDto>> create(@Valid @RequestBody OutingCreateReqDto dto) {
        OutingCreateResDto result = dormOutingService.createLongTermAbsence(getUserId(), dto);
        return new ResponseEntity<>(new CommonResDto<>("장기비움신청이 접수되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "장기비움신청 삭제", description = "되돌릴 수 없는 작업입니다. 반드시 confirm=true를 함께 보내야 실행됩니다.")
    @DeleteMapping("/{no}")
    public ResponseEntity<CommonResDto<Void>> delete(
            @PathVariable long no,
            @RequestParam(defaultValue = "false") boolean confirm
    ) {
        dormOutingService.deleteLongTermAbsence(getUserId(), no, confirm);
        return new ResponseEntity<>(new CommonResDto<>("장기비움신청이 삭제되었습니다.", null), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
