package com.soongsil.soongpal.notification.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationPreferenceResDto {
    private boolean chatEnabled;
    private boolean reservationEnabled;
    private boolean boardStatusEnabled;
    private boolean dormNoticeEnabled;
}
