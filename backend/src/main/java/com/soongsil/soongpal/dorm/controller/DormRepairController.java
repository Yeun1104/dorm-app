package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.RepairCreateReqDto;
import com.soongsil.soongpal.dorm.dto.RepairCreateResDto;
import com.soongsil.soongpal.dorm.dto.RepairDetailDto;
import com.soongsil.soongpal.dorm.dto.RepairFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.RepairListItemDto;
import com.soongsil.soongpal.dorm.dto.RepairUpdateReqDto;
import com.soongsil.soongpal.dorm.service.DormRepairService;
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
@RequestMapping("/api/dorm/repair")
@RequiredArgsConstructor
@Tag(name = "Dorm Repair Controller", description = "숭실대 기숙사 \"고쳐주세요\" 게시판 조회/작성/수정/삭제/검색")
public class DormRepairController {

    private final DormRepairService dormRepairService;

    @Operation(summary = "고쳐주세요 목록 조회 (검색 가능)", description = "page=0이 최신 15건. keyword를 주면 field(TITLE/CONTENT/WRITER, 기본 TITLE) 기준으로 검색함.")
    @GetMapping
    public ResponseEntity<CommonResDto<List<RepairListItemDto>>> getList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "TITLE") RepairSearchField field
    ) {
        List<RepairListItemDto> result = dormRepairService.getList(getUserId(), page, keyword, field);
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "고쳐주세요 상세조회")
    @GetMapping("/{no}")
    public ResponseEntity<CommonResDto<RepairDetailDto>> getDetail(@PathVariable long no) {
        RepairDetailDto result = dormRepairService.getDetail(getUserId(), no);
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 상세조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "고쳐주세요 글쓰기 폼 기본값 조회", description = "작성자명/이메일 등 ssudorm이 자동으로 채워주는 값")
    @GetMapping("/new")
    public ResponseEntity<CommonResDto<RepairFormDefaultsDto>> getFormDefaults() {
        RepairFormDefaultsDto result = dormRepairService.getFormDefaults(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 폼 기본값 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "고쳐주세요 작성/제출", description = "제목/내용/글 비밀번호/방문허용여부만 입력받아 실제 ssudorm에 제출함. 첨부파일은 아직 지원 안 함.")
    @PostMapping
    public ResponseEntity<CommonResDto<RepairCreateResDto>> create(@Valid @RequestBody RepairCreateReqDto dto) {
        RepairCreateResDto result = dormRepairService.create(getUserId(), dto);
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 글이 등록되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "고쳐주세요 수정", description = "본인이 작성한 글만 수정 가능. 비밀번호는 서버가 자동으로 재사용함.")
    @PutMapping("/{no}")
    public ResponseEntity<CommonResDto<RepairDetailDto>> update(@PathVariable long no, @Valid @RequestBody RepairUpdateReqDto dto) {
        RepairDetailDto result = dormRepairService.update(getUserId(), no, dto);
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 글이 수정되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "고쳐주세요 삭제", description = "되돌릴 수 없는 작업입니다. 본인이 작성한 글만 가능하며, 반드시 confirm=true를 함께 보내야 실행됩니다.")
    @DeleteMapping("/{no}")
    public ResponseEntity<CommonResDto<Void>> delete(
            @PathVariable long no,
            @RequestParam(defaultValue = "false") boolean confirm
    ) {
        dormRepairService.delete(getUserId(), no, confirm);
        return new ResponseEntity<>(new CommonResDto<>("고쳐주세요 글이 삭제되었습니다.", null), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
