package com.soongsil.soongpal.dorm.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.dto.FoodMenuResDto;
import com.soongsil.soongpal.dorm.service.DormFoodMenuService;
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

@RestController
@RequestMapping("/api/dorm/food-menu")
@RequiredArgsConstructor
@Tag(name = "Dorm Food Menu Controller", description = "자료실 - 식단 (읽기전용, 주 단위)")
public class DormFoodMenuController {

    private final DormFoodMenuService dormFoodMenuService;

    @Operation(summary = "식단 조회", description = "gyear/gmonth/gday 셋 다 주면 그 날짜가 포함된 주로 이동, 안 주면 이번 주. 응답의 prevWeek/nextWeek 값을 그대로 다음 호출에 넣으면 이전/다음 주로 넘어갈 수 있음.")
    @GetMapping
    public ResponseEntity<CommonResDto<FoodMenuResDto>> getMenu(
            @RequestParam(required = false) String gyear,
            @RequestParam(required = false) String gmonth,
            @RequestParam(required = false) String gday
    ) {
        FoodMenuResDto result = dormFoodMenuService.getMenu(getUserId(), gyear, gmonth, gday);
        return new ResponseEntity<>(new CommonResDto<>("식단 조회 성공", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
