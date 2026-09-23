package com.soongsil.soongpal.dorm.dto;

public record DormAccountVerifyResDto(boolean success, String message) {
    public static DormAccountVerifyResDto ofSuccess() {
        return new DormAccountVerifyResDto(true, "기숙사 사이트 로그인에 성공했습니다.");
    }

    public static DormAccountVerifyResDto ofFailure(String message) {
        return new DormAccountVerifyResDto(false, message);
    }
}
