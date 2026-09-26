package com.soongsil.soongpal.dorm.dto;

/**
 * locked=true면 "남이 쓴 비밀글이라 못 봄" 상태. 그 경우 title/writer/content 등은 전부 빈 값이고,
 * 프론트에서는 locked만 보고 "비밀글입니다" 안내를 보여주면 됨.
 *
 * staffReply: 운영사무실이 이 글에 남긴 답변 내용 (없으면 null). 고쳐주세요 게시판엔 댓글 기능 자체가 없어서
 * 이 필드가 필요 없고, 일반문의및상담에만 해당됨.
 */
public record InquiryDetailDto(
        long postNo,
        boolean locked,
        String title,
        String writer,
        int viewCount,
        String writtenAt,
        String content,
        String staffReply
) {
    public static InquiryDetailDto locked(long postNo) {
        return new InquiryDetailDto(postNo, true, "", "", 0, "", "", null);
    }
}
