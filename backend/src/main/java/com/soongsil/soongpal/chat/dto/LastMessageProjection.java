package com.soongsil.soongpal.chat.dto;

import java.time.LocalDateTime;

public interface LastMessageProjection {

    Long getRoomId();

    Long getMessageId();

    String getContent();

    LocalDateTime getCreatedAt();
}
