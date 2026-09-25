package com.soongsil.soongpal.user.util;

import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;

import java.util.regex.Pattern;

/**
 * 닉네임 형식 검증: 한글 2~8자 또는 영문 4~12자, 공백/특수문자/숫자/혼용 불가.
 * (중복 여부는 UserRepository.findByNickName으로 별도 체크함 — 여기는 형식만 봄)
 */
public final class NicknameValidator {

    private static final Pattern KOREAN_PATTERN = Pattern.compile("^[가-힣]{2,8}$");
    private static final Pattern ENGLISH_PATTERN = Pattern.compile("^[a-zA-Z]{4,12}$");

    private NicknameValidator() {
    }

    public static void validate(String nickname) {
        if (nickname == null) {
            throw new UserException(UserErrorCode.INVALID_NICKNAME_FORMAT);
        }
        if (!KOREAN_PATTERN.matcher(nickname).matches() && !ENGLISH_PATTERN.matcher(nickname).matches()) {
            throw new UserException(UserErrorCode.INVALID_NICKNAME_FORMAT);
        }
    }
}
