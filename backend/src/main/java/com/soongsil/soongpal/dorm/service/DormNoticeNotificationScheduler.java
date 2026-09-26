package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.domain.DormNoticeCheckpoint;
import com.soongsil.soongpal.dorm.dto.NoticeListItemDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import com.soongsil.soongpal.dorm.repository.DormNoticeCheckpointRepository;
import com.soongsil.soongpal.notification.domain.NotificationType;
import com.soongsil.soongpal.notification.service.NotificationService;
import com.soongsil.soongpal.user.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * 기숙사 새 공지사항을 매일 9시/12시/18시에 확인해서, (기숙사계정 연동 + 공지알림 켜둔) 사용자들에게 알림을 보냄.
 *
 * 공지사항은 로그인 없이 볼 수 있는 페이지라서, 사용자별로 로그인해서 확인하지 않고 딱 1번만(익명으로)
 * 최신 목록을 조회함 — 그래서 "특정 계정만 로그인 실패" 같은 문제 자체가 없음 (사용자 순회 안 함).
 *
 * 새 글 여부는 시스템 전체에 하나뿐인 DormNoticeCheckpoint로 판단함. 서버가 처음 이 기능을 켠 시점(체크포인트가
 * 아직 없을 때)엔 과거 공지가 전부 "새 글"로 잡혀서 알림이 쏟아지는 걸 막기 위해, 최초 1회는 알림 없이
 * 기준점만 기록하고 넘어감.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DormNoticeNotificationScheduler {

    private final DormNoticeService dormNoticeService;
    private final DormNoticeCheckpointRepository checkpointRepository;
    private final DormAccountRepository dormAccountRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 9,12,18 * * *")
    @Transactional
    public void checkAndNotifyNewNotices() {
        try {
            List<NoticeListItemDto> notices = dormNoticeService.getPublicList(); // 최신순(내림차순)으로 옴
            if (notices.isEmpty()) {
                return;
            }

            long latestNo = notices.get(0).no();

            DormNoticeCheckpoint checkpoint = checkpointRepository.findAll().stream()
                    .findFirst()
                    .orElseGet(() -> checkpointRepository.save(new DormNoticeCheckpoint()));

            Long lastNotifiedNo = checkpoint.getLastNotifiedNoticeNo();

            if (lastNotifiedNo == null) {
                // 최초 실행: 알림 없이 기준점만 기록 (알림 폭탄 방지)
                checkpoint.updateLastNotifiedNoticeNo(latestNo);
                log.info("[기숙사 공지 알림] 최초 실행 — 기준점만 {}(으)로 기록하고 알림은 생략", latestNo);
                return;
            }

            List<NoticeListItemDto> newNotices = notices.stream()
                    .filter(n -> n.no() > lastNotifiedNo)
                    .sorted(Comparator.comparingLong(NoticeListItemDto::no)) // 오래된 것부터 순서대로 알림
                    .toList();

            if (newNotices.isEmpty()) {
                return;
            }

            List<User> targets = dormAccountRepository.findAll().stream()
                    .map(DormAccount::getUser)
                    .filter(u -> notificationService.isDormNoticeEnabled(u.getId()))
                    .toList();

            for (NoticeListItemDto notice : newNotices) {
                for (User user : targets) {
                    notificationService.notify(
                            user,
                            NotificationType.DORM_NOTICE,
                            "새 공지사항",
                            notice.title(),
                            null, null, null
                    );
                }
            }

            checkpoint.updateLastNotifiedNoticeNo(latestNo);
            log.info("[기숙사 공지 알림] 새 공지 {}건, 대상자 {}명에게 발송 완료", newNotices.size(), targets.size());
        } catch (Exception e) {
            // 이 작업 전체가 실패해도 다음 스케줄(3번 중 하나)에 재시도되므로, 여기서 예외를 삼키고 로그만 남김
            log.error("[기숙사 공지 알림] 체크 중 오류 발생", e);
        }
    }
}
