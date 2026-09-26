package com.soongsil.soongpal.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DevSeedResDto {
    private List<DevSeedUserDto> users;
    private List<DevSeedBoardDto> boards;

    @Getter
    @Builder
    public static class DevSeedUserDto {
        private Long userId;
        private String nickname;
        private String accessToken; // 이 유저로 로그인한 것처럼 Swagger/앱에서 바로 쓸 수 있음
    }

    @Getter
    @Builder
    public static class DevSeedBoardDto {
        private Long boardId;
        private String title;
        private String authorNickname;
    }
}
