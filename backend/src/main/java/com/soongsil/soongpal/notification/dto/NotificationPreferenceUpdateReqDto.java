package com.soongsil.soongpal.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NotificationPreferenceUpdateReqDto {
    @Schema(description = "채팅 메시지 알림", example = "true")
    private boolean chatEnabled;

    @Schema(description = "참여요청(옴/수락/거절) 알림", example = "true")
    private boolean reservationEnabled;

    @Schema(description = "모집완료/거래완료 알림", example = "true")
    private boolean boardStatusEnabled;

    @Schema(description = "기숙사 새 공지사항 알림", example = "true")
    private boolean dormNoticeEnabled;
}
