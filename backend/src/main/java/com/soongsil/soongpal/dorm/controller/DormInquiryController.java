package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.InquiryCreateReqDto;
import com.soongsil.soongpal.dorm.dto.InquiryCreateResDto;
import com.soongsil.soongpal.dorm.dto.InquiryDetailDto;
import com.soongsil.soongpal.dorm.dto.InquiryFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.InquiryListItemDto;
import com.soongsil.soongpal.dorm.dto.InquiryUpdateReqDto;
import com.soongsil.soongpal.dorm.service.DormInquiryService;
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
@RequestMapping("/api/dorm/inquiry")
@RequiredArgsConstructor
@Tag(name = "Dorm Inquiry Controller", description = "숭실대 기숙사 \"일반문의및상담\" 게시판 조회/작성/수정/삭제/검색")
public class DormInquiryController {

    private final DormInquiryService dormInquiryService;

    @Operation(summary = "일반문의 목록 조회 (검색 가능)", description = "page=0이 최신 15건. keyword를 주면 field(TITLE/CONTENT/WRITER, 기본 TITLE) 기준으로 검색함.")
    @GetMapping
    public ResponseEntity<CommonResDto<List<InquiryListItemDto>>> getList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "TITLE") RepairSearchField field
    ) {
        List<InquiryListItemDto> result = dormInquiryService.getList(getUserId(), page, keyword, field);
        return new ResponseEntity<>(new CommonResDto<>("일반문의 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "일반문의 상세조회", description = "남이 쓴 비밀글이면 locked=true만 오고 내용은 안 보임.")
    @GetMapping("/{no}")
    public ResponseEntity<CommonResDto<InquiryDetailDto>> getDetail(@PathVariable long no) {
        InquiryDetailDto result = dormInquiryService.getDetail(getUserId(), no);
        return new ResponseEntity<>(new CommonResDto<>("일반문의 상세조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "일반문의 글쓰기 폼 기본값 조회")
    @GetMapping("/new")
    public ResponseEntity<CommonResDto<InquiryFormDefaultsDto>> getFormDefaults() {
        InquiryFormDefaultsDto result = dormInquiryService.getFormDefaults(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("일반문의 폼 기본값 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "일반문의 작성/제출", description = "제목/내용/글 비밀번호/비밀글여부만 입력받아 실제 ssudorm에 제출함. 첨부파일은 아직 지원 안 함.")
    @PostMapping
    public ResponseEntity<CommonResDto<InquiryCreateResDto>> create(@Valid @RequestBody InquiryCreateReqDto dto) {
        InquiryCreateResDto result = dormInquiryService.create(getUserId(), dto);
        return new ResponseEntity<>(new CommonResDto<>("일반문의 글이 등록되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "일반문의 수정", description = "본인이 작성한 글만 수정 가능. 비밀번호는 서버가 자동으로 재사용함.")
    @PutMapping("/{no}")
    public ResponseEntity<CommonResDto<InquiryDetailDto>> update(@PathVariable long no, @Valid @RequestBody InquiryUpdateReqDto dto) {
        InquiryDetailDto result = dormInquiryService.update(getUserId(), no, dto);
        return new ResponseEntity<>(new CommonResDto<>("일반문의 글이 수정되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "일반문의 삭제", description = "되돌릴 수 없는 작업입니다. 본인이 작성한 글만 가능하며, 반드시 confirm=true를 함께 보내야 실행됩니다.")
    @DeleteMapping("/{no}")
    public ResponseEntity<CommonResDto<Void>> delete(
            @PathVariable long no,
            @RequestParam(defaultValue = "false") boolean confirm
    ) {
        dormInquiryService.delete(getUserId(), no, confirm);
        return new ResponseEntity<>(new CommonResDto<>("일반문의 글이 삭제되었습니다.", null), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
