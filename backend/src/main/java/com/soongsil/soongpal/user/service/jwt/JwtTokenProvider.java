package com.soongsil.soongpal.user.service.jwt;

import com.soongsil.soongpal.user.domain.Role;
import com.soongsil.soongpal.user.dto.OAuthAttributes;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-validity-in-milliseconds}")
    private long accessTokenValidityInMilliseconds;

    @Value("${jwt.refresh-token-validity-in-milliseconds}")
    private long refreshTokenValidityInMilliseconds;

    @Value("${jwt.temp-token-validity-in-milliseconds}")
    private long tempTokenValidityInMilliseconds;

    private Key key;

    @PostConstruct
    public void afterPropertiesSet() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String createAccessToken(String userId, Role role) {
        return createToken(userId, role, accessTokenValidityInMilliseconds);
    }

    public String createRefreshToken(String userId) {
        return createToken(userId, refreshTokenValidityInMilliseconds);
    }

    public String createTempSignupToken(OAuthAttributes attributes) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + this.tempTokenValidityInMilliseconds);

        return Jwts.builder()
            .claim("id", attributes.getOauthId())
            .claim("email", attributes.getEmail())
            .setIssuedAt(now)
            .signWith(key, SignatureAlgorithm.HS512)
            .setExpiration(validity)
            .compact();
    }

    private String createToken(String subject, Role role, long validityMilliseconds) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityMilliseconds);

        return Jwts.builder()
            .setSubject(subject)
            .claim("auth", role.name())
            .setIssuedAt(now)
            .signWith(key, SignatureAlgorithm.HS512)
            .setExpiration(validity)
            .compact();
    }

    private String createToken(String subject, long validityMilliseconds) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityMilliseconds);

        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(now)
                .signWith(key, SignatureAlgorithm.HS512)
                .setExpiration(validity)
                .compact();
    }

    public OAuthAttributes getAttributesFromTempToken(String token) {
        Claims claims = parseClaims(token);
        String oauthId = claims.get("id", String.class);
        String email = claims.get("email", String.class);

        return OAuthAttributes.builder()
            .oauthId(oauthId)
            .email(email)
            .build();
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        if (claims.get("auth") == null) {
            log.error(">>>>> [JwtTokenProvider] 권한 정보가 없는 토큰입니다.");
            throw new RuntimeException("권한 정보가 없는 토큰입니다.");
        }

        String roleName = claims.get("auth", String.class);
        Collection<? extends GrantedAuthority> authorities =
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleName));

        UserDetails principal = new User(claims.getSubject(), "", authorities);

        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            log.info("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            log.info("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            log.info("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            log.info("JWT 토큰이 잘못되었습니다.");
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public long getRefreshTokenValidityInMilliseconds() {
        return refreshTokenValidityInMilliseconds;
    }
}