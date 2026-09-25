package com.soongsil.soongpal.chat.dto;

import java.time.LocalDateTime;

public record LastMessageDto(
        Long roomId,
        Long messageId,
        String content,
        LocalDateTime createdAt
) {}
