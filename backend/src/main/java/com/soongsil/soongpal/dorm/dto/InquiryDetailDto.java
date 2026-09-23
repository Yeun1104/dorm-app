package com.soongsil.soongpal.dorm.dto;

/**
 * locked=true면 "남이 쓴 비밀글이라 못 봄" 상태. 그 경우 title/writer/content 등은 전부 빈 값이고,
 * 프론트에서는 locked만 보고 "비밀글입니다" 안내를 보여주면 됨.
 */
public record InquiryDetailDto(
        long postNo,
        boolean locked,
        String title,
        String writer,
        int viewCount,
        String writtenAt,
        String content
) {
    public static InquiryDetailDto locked(long postNo) {
        return new InquiryDetailDto(postNo, true, "", "", 0, "", "");
    }
}
