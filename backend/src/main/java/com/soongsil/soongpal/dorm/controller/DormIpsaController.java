package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.IpsaDetailDto;
import com.soongsil.soongpal.dorm.dto.IpsaListItemDto;
import com.soongsil.soongpal.dorm.service.DormIpsaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dorm/ipsa")
@RequiredArgsConstructor
@Tag(name = "Dorm Ipsa Controller", description = "마이페이지 - 입사신청/선발내역 (읽기전용)")
public class DormIpsaController {

    private final DormIpsaService dormIpsaService;

    @Operation(summary = "입사신청/선발내역 목록 조회")
    @GetMapping
    public ResponseEntity<CommonResDto<List<IpsaListItemDto>>> getList() {
        List<IpsaListItemDto> result = dormIpsaService.getList(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("입사신청 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "입사신청/선발내역 상세조회", description = "no가 아니라 목록에서 받은 mozipCode로 조회함.")
    @GetMapping("/{mozipCode}")
    public ResponseEntity<CommonResDto<IpsaDetailDto>> getDetail(@PathVariable long mozipCode) {
        IpsaDetailDto result = dormIpsaService.getDetail(getUserId(), mozipCode);
        return new ResponseEntity<>(new CommonResDto<>("입사신청 상세조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
