package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.user.domain.User;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
public class OAuthAttributes {
    private Map<String, Object> attributes;
    private String nameAttributeKey;
    private String oauthId;
    private String email;

    @Builder
    public OAuthAttributes(Map<String, Object> attributes, String nameAttributeKey, String oauthId, String email) {
        this.attributes = attributes;
        this.nameAttributeKey = nameAttributeKey;
        this.oauthId = oauthId;
        this.email = email;
    }

    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        return ofKakao(userNameAttributeName, attributes);
    }

    private static OAuthAttributes ofKakao(String userNameAttributeName, Map<String, Object> attributes) {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");

        return OAuthAttributes.builder()
                .oauthId(String.valueOf(attributes.get("id")))
                .email((String) kakaoAccount.get("email"))
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .build();
    }

    public User toEntity(String nickname) {
        return User.builder()
                .kakaoId(oauthId)
                .nickName(nickname)
                .email(email)
                .build();
    }
}