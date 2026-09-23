package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.DormAccountRegisterReqDto;
import com.soongsil.soongpal.dorm.dto.DormAccountVerifyResDto;
import com.soongsil.soongpal.dorm.service.DormAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dorm/account")
@RequiredArgsConstructor
@Tag(name = "Dorm Account Controller", description = "숭실대 기숙사 사이트(ssudorm) 계정 연동")
public class DormAccountController {

    private final DormAccountService dormAccountService;

    @Operation(summary = "기숙사 계정 등록/수정", description = "본인의 ssudorm 아이디/비밀번호를 등록합니다. 암호화되어 저장됩니다.")
    @PostMapping
    public ResponseEntity<CommonResDto<Void>> registerOrUpdate(@Valid @RequestBody DormAccountRegisterReqDto dto) {
        dormAccountService.registerOrUpdate(getUserId(), dto);
        return new ResponseEntity<>(new CommonResDto<>("기숙사 계정이 등록되었습니다.", null), HttpStatus.OK);
    }

    @Operation(summary = "기숙사 계정 로그인 검증", description = "등록된 계정으로 실제 ssudorm 로그인이 되는지 확인합니다.")
    @PostMapping("/verify")
    public ResponseEntity<CommonResDto<DormAccountVerifyResDto>> verify() {
        DormAccountVerifyResDto result = dormAccountService.verifyLogin(getUserId());
        return new ResponseEntity<>(new CommonResDto<>("검증 완료", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
