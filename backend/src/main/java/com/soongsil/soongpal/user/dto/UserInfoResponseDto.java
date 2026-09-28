package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.user.domain.User;
import lombok.Getter;

@Getter
public class UserInfoResponseDto {

    private Long userId;
    private String nickname;
    private String email;
    private String kakaoId;
    private String profileImageUrl;

    public UserInfoResponseDto(User user) {
        this.userId = user.getId();
        this.nickname = user.getNickName();
        this.email = user.getEmail();
        this.kakaoId = user.getKakaoId();
        this.profileImageUrl = user.getProfileImageUrl();
    }
}
