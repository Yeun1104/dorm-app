package com.soongsil.soongpal.manner.dto;

import com.soongsil.soongpal.manner.domain.MannerKeywordType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Set;

@Getter
@NoArgsConstructor
public class MannerReviewCreateReqDto {

    @Schema(description = "선택한 매너 키워드 1~3개. 상대방 역할(구매자/총대)에 맞는 키워드만 선택 가능함.")
    @NotEmpty
    @Size(min = 1, max = 3)
    private Set<MannerKeywordType> keywords;
}
