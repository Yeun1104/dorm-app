package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.repository.LikeRepository;
import com.soongsil.soongpal.board.service.BoardService;
import com.soongsil.soongpal.chat.domain.ChatRoom;
import com.soongsil.soongpal.chat.repository.ChatRoomRepository;
import com.soongsil.soongpal.chat.repository.DeviceTokenRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.user.domain.Role;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.dto.*;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;


@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final BoardService boardService;
    private final JwtTokenProvider jwtTokenProvider;
    private final DeviceTokenRepository deviceTokenRepository;
    private final WebClient webClient = WebClient.create();
    private final ChatRoomRepository chatRoomRepository;

    @Value("${kakao-admin.key}")
    private String kakaoAdminKey;

    @Transactional
    public TokenPair registerNewUser(String tempToken, String nickname) {
        if (!jwtTokenProvider.validateToken(tempToken)) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }
        OAuthAttributes attributes = jwtTokenProvider.getAttributesFromTempToken(tempToken);

        if (userRepository.findByNickName(nickname).isPresent()) {
            throw new UserException(UserErrorCode.USER_ALREADY_EXISTS);
        }

        User newUser = attributes.toEntity(nickname);
        userRepository.save(newUser);

        String userId = String.valueOf(newUser.getId());
        Role userRole = newUser.getRole();

        String accessToken = jwtTokenProvider.createAccessToken(userId, userRole);
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);

        newUser.updateRefreshToken(refreshToken);

        return new TokenPair(accessToken, refreshToken);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        likeRepository.deleteAllByUser(user);
        chatRoomRepository.findChatRoomsByUserId(userId).forEach(ChatRoom::softDelete);
        boardService.softDeleteAllBoardsByUser(user);
        unlinkKakaoAccount(user.getKakaoId());
        user.getDeviceTokens().clear();
        user.softDelete();
        userRepository.save(user);
    }

    private void unlinkKakaoAccount(String kakaoId) {
        String unlinkUri = "https://kapi.kakao.com/v1/user/unlink";

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("target_id_type", "user_id");
        formData.add("target_id", kakaoId);

        webClient.post()
            .uri(unlinkUri)
            .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + kakaoAdminKey)
            .contentType(MediaType.valueOf("application/x-www-form-urlencoded"))
            .body(BodyInserters.fromFormData(formData))
            .retrieve()
            .bodyToMono(String.class)
            .block();
    }

    public UserInfoResponseDto getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        return new UserInfoResponseDto(user);
    }

    @Transactional
    public UserInfoResponseDto updateUserInfo(Long userId, UserUpdateRequestDto updateRequestDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        String newNickname = updateRequestDto.getNickname();
        if (userRepository.findByNickName(newNickname).isPresent()) {
            throw new UserException(UserErrorCode.USER_ALREADY_EXISTS);
        }

        user.updateNickname(newNickname);

        return new UserInfoResponseDto(user);
    }

    @Transactional
    public void updateRefreshToken(Long userId, String refreshToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        user.updateRefreshToken(refreshToken);
    }

    @Transactional
    public void logout(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        user.updateRefreshToken(null);
    }

    public TokenRefreshResponseDto reissueTokens(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        String userIdStr = jwtTokenProvider.getUserIdFromToken(refreshToken);
        Long userId = Long.parseLong(userIdStr);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        if (!refreshToken.equals(user.getRefreshToken())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        Role userRole = user.getRole();

        String newAccessToken = jwtTokenProvider.createAccessToken(String.valueOf(userId), userRole);

        return new TokenRefreshResponseDto(newAccessToken);
    }
}