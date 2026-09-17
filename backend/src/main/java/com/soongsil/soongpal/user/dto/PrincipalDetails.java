package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.user.domain.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

@Getter
public class PrincipalDetails implements OAuth2User {

    private User user;
    private OAuthAttributes oauthAttributes;
    private String role;

    public PrincipalDetails(User user) {
        this.user = user;
        this.role = "ROLE_" + user.getRole().name();
    }

    public PrincipalDetails(OAuthAttributes oauthAttributes, String role) {
        this.oauthAttributes = oauthAttributes;
        this.role = role;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return oauthAttributes != null ? oauthAttributes.getAttributes() : Collections.emptyMap();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singleton(new SimpleGrantedAuthority(this.role));
    }

    @Override
    public String getName() {
        return oauthAttributes != null ? oauthAttributes.getOauthId() : String.valueOf(user.getId());
    }
}