package com.soongsil.soongpal.report.service;

import com.soongsil.soongpal.report.domain.Report;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * 신고 접수될 때마다 관리자가 확인 중인 디스코드 채널로 웹훅 메시지를 보냄.
 * webhookUrl이 비어있으면(설정 안 했으면) 조용히 건너뜀 — 로컬 개발 환경에서 에러 안 나게 하기 위함.
 *
 * 디스코드 웹훅 만드는 법: 채널 설정 > 연동 > 웹후크 > 새 웹후크 만들기 > URL 복사해서
 * DISCORD_REPORT_WEBHOOK_URL 환경변수에 넣으면 됨.
 */
@Slf4j
@Component
public class DiscordReportNotifier {

    @Value("${discord.report-webhook-url:}")
    private String webhookUrl;

    private final WebClient webClient = WebClient.create();

    public void notifyNewReport(Report report) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.debug("디스코드 웹훅 URL 미설정 - 신고 알림 생략");
            return;
        }

        try {
            Map<String, Object> embed = Map.of(
                    "title", "🚨 새 신고 접수",
                    "color", 15158332, // 빨간색
                    "fields", List.of(
                            Map.of("name", "신고자", "value", report.getReporter().getNickName(), "inline", true),
                            Map.of("name", "신고대상", "value", report.getReportedUser().getNickName(), "inline", true),
                            Map.of("name", "카테고리", "value", report.getCategory().name(), "inline", true),
                            Map.of("name", "사유", "value", truncate(report.getReason()), "inline", false)
                    )
            );

            webClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("embeds", List.of(embed)))
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            // 디스코드 알림 실패가 신고 접수 자체를 막으면 안 되므로 로그만 남김
            log.error("디스코드 신고 알림 전송 실패", e);
        }
    }

    private String truncate(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > 500 ? text.substring(0, 500) + "..." : text;
    }
}
