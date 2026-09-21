package com.soongsil.soongpal.dorm.dto;

public record InquiryListItemDto(
        long displayNo,
        long no,
        String title,
        String writer,
        int viewCount,
        String writtenDate,
        boolean isNew,
        boolean isSecret,
        int replyCount
) {
}
