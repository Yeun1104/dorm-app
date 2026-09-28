package com.soongsil.soongpal.user.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.common.file.S3Uploader;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import com.soongsil.soongpal.manner.dto.MannerBadgeDto;
import com.soongsil.soongpal.manner.service.MannerReviewService;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import com.soongsil.soongpal.reservation.repository.ReservationRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.dto.BoardSummaryDto;
import com.soongsil.soongpal.user.dto.ProfileResDto;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final int TOP_BADGE_COUNT = 3;
    private static final long MAX_PROFILE_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif");
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final ReservationRepository reservationRepository;
    private final MannerReviewService mannerReviewService;
    private final DormAccountRepository dormAccountRepository;
    private final S3Uploader s3Uploader;

    @Transactional(readOnly = true)
    public ProfileResDto getProfile(Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        List<Board> boards = boardRepository.findAllByUser(user);

        List<BoardSummaryDto> inProgressBoards = boards.stream()
                .filter(b -> b.getStatus() == BoardStatus.IN_PROGRESS)
                .map(BoardSummaryDto::from)
                .toList();

        List<BoardSummaryDto> completedBoards = boards.stream()
                .filter(b -> b.getStatus() == BoardStatus.COMPLETED)
                .map(BoardSummaryDto::from)
                .toList();

        long completedAsBuyer = reservationRepository.countByBuyerIdAndStatus(targetUserId, ReservationStatus.COMPLETED);
        long completedAsSeller = reservationRepository.countByBoard_UserIdAndStatus(targetUserId, ReservationStatus.COMPLETED);

        List<MannerBadgeDto> topBadges = mannerReviewService.getTopBadges(targetUserId, TOP_BADGE_COUNT);

        boolean dormVerified = dormAccountRepository.findByUserId(targetUserId).isPresent();

        return ProfileResDto.builder()
                .userId(user.getId())
                .nickname(user.getNickName())
                .profileImageUrl(user.getProfileImageUrl())
                .schoolVerified(user.isSchoolVerified())
                .dormVerified(dormVerified)
                .tradeCount((int) (completedAsBuyer + completedAsSeller))
                .topMannerBadges(topBadges)
                .inProgressBoards(inProgressBoards)
                .completedBoards(completedBoards)
                .build();
    }

    /**
     * 내 프로필 이미지 등록/변경. 앱 안에서만 쓰는 이미지라 카카오 프로필 사진은 가져오지 않고, 사용자가 직접 올린 것만 저장함.
     *
     * - 다른 사용자에게도 보이는 이미지라 형식(jpg/png/webp/gif)과 용량(5MB)을 검증함
     * - 업로드가 실패하면(S3가 꺼진 로컬 환경, 빈 파일 등 uploadFile이 null을 돌려줄 때) 기존 프로필 이미지는 그대로 두고 에러를 냄
     *   (예전엔 null을 그대로 저장해서 기존 이미지 URL이 지워지고, 응답 만들다 NPE가 났음)
     * - 새 이미지 저장에 성공한 뒤에 기존 이미지를 지우고, 그 삭제가 실패해도 프로필 변경 자체는 취소하지 않음
     */
    @Transactional
    public String updateMyProfileImage(Long userId, MultipartFile image) {
        validateProfileImage(image);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        String oldUrl = user.getProfileImageUrl();

        String newUrl = s3Uploader.uploadFile(image, "profile");
        if (newUrl == null) {
            throw new UserException(UserErrorCode.PROFILE_IMAGE_UPLOAD_FAILED);
        }
        user.updateProfileImageUrl(newUrl);

        if (oldUrl != null) {
            try {
                s3Uploader.deleteFile(oldUrl);
            } catch (Exception e) {
                log.warn("이전 프로필 이미지 삭제 실패 (프로필 변경은 유지): {}", oldUrl, e);
            }
        }

        return newUrl;
    }

    private void validateProfileImage(MultipartFile image) {
        if (image == null || image.isEmpty() || image.getSize() > MAX_PROFILE_IMAGE_BYTES) {
            throw new UserException(UserErrorCode.PROFILE_IMAGE_INVALID);
        }

        String contentType = image.getContentType() == null ? "" : image.getContentType().toLowerCase(Locale.ROOT);
        boolean typeOk = ALLOWED_IMAGE_TYPES.contains(contentType);

        // 일부 앱은 파일 타입을 application/octet-stream 등으로 보내기도 해서, 타입이 불분명할 땐 확장자로 한 번 더 확인함
        if (!typeOk && (contentType.isEmpty() || contentType.equals("application/octet-stream"))) {
            String name = image.getOriginalFilename() == null ? "" : image.getOriginalFilename().toLowerCase(Locale.ROOT);
            int dot = name.lastIndexOf('.');
            typeOk = dot >= 0 && ALLOWED_IMAGE_EXTENSIONS.contains(name.substring(dot + 1));
        }

        if (!typeOk) {
            throw new UserException(UserErrorCode.PROFILE_IMAGE_INVALID);
        }
    }
}
