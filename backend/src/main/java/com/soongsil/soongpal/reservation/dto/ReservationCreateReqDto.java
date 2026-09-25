package com.soongsil.soongpal.reservation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReservationCreateReqDto {

    @Schema(description = "구매 신청 수량", example = "3")
    @NotNull
    @Min(1)
    private Integer quantity;
}
