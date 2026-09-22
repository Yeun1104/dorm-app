package com.soongsil.soongpal.reservation.dto;

import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReservationStatusUpdateReqDto {

    @Schema(description = "변경할 상태", allowableValues = {"IN_PROGRESS", "COMPLETED", "CANCELLED"})
    @NotNull
    private ReservationStatus status;
}
