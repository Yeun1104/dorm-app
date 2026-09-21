package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.dto.OutingFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.OutingListItemDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 외박신청 조회 (목록 / 글쓰기 폼 기본값).
 * ssudorm 페이지를 긁어와서(Jsoup) 파싱함. 실제 HTML 구조는 view-source로 확보한 원본 기준.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormOutingService {

    private static final String LIST_PATH_BASE = "/SShostel/mall_main.php?viewform=B0001_bbs_night&board_no=1&next=";
    private static final String WRITE_FORM_PATH =
            "/SShostel/mall_main.php?viewform=B0001_bbs_night&mode=write&formpath=&board_type=&board_no=1&next=0&W=&Q=";

    private static final int PAGE_SIZE = 10;

    // 스크린샷/HTML에서 실제로 확인된 매핑은 이것 하나뿐. 나머지 상태 아이콘은 추측하지 않고 원본 파일명을 그대로 내려줌.
    private static final Map<String, String> STATUS_LABELS = Map.of(
            "ing_1.gif", "승인"
    );

    private static final Pattern DETAIL_NO_PATTERN = Pattern.compile("[?&]no=(\\d+)");
    private static final Pattern MAX_END_DATE_PATTERN = Pattern.compile("enddate\\.value\\s*>\\s*'(\\d{4}-\\d{2}-\\d{2})'");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public List<OutingListItemDto> getOutingList(Long userId, int page) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        int next = Math.max(page, 0) * PAGE_SIZE;
        String path = LIST_PATH_BASE + next;

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseOutingList(doc);
    }

    public OutingFormDefaultsDto getOutingFormDefaults(Long userId) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, WRITE_FORM_PATH, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseOutingFormDefaults(doc);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private List<OutingListItemDto> parseOutingList(Document doc) {
        try {
            Elements rows = doc.select("tr[onclick]");
            return rows.stream()
                    .map(this::toOutingListItem)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("외박신청 목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private OutingListItemDto toOutingListItem(Element row) {
        Elements tds = row.select("td");
        if (tds.size() < 5) {
            return null; // 예상 못한 행 구조는 조용히 스킵 (페이지 구조가 바뀌었을 가능성 - 로그로 확인 필요)
        }

        long no = Long.parseLong(tds.get(0).text().trim());
        String period = tds.get(2).text().trim();
        String[] parts = period.split("~");
        String startDate = parts.length > 0 ? parts[0].trim() : "";
        String endDate = parts.length > 1 ? parts[1].trim() : "";
        String writtenAt = tds.get(3).text().trim();

        Element statusImg = tds.get(4).selectFirst("img");
        String statusIcon = statusImg != null ? extractFileName(statusImg.attr("src")) : "unknown";
        String status = STATUS_LABELS.getOrDefault(statusIcon, "확인필요");

        Long detailId = extractDetailId(row.attr("onclick"));

        return new OutingListItemDto(no, startDate, endDate, writtenAt, status, statusIcon, detailId);
    }

    private OutingFormDefaultsDto parseOutingFormDefaults(Document doc) {
        try {
            String applicantName = doc.select("input[name=guest_name]").attr("value");
            String moZipCode = doc.select("input[name=mozip_code]").attr("value");

            String room = extractValueAfterLabel(doc, "호실");
            String seat = extractValueAfterLabel(doc, "자리");

            String phone1 = doc.select("select[name=handphone1]").val();
            String phone2 = doc.select("input[name=handphone2]").attr("value");
            String phone3 = doc.select("input[name=handphone3]").attr("value");

            String defaultStartDate = doc.select("input[name=sindate]").attr("value");
            String defaultEndDate = doc.select("input[name=enddate]").attr("value");

            String maxEndDate = extractMaxEndDate(doc);

            return new OutingFormDefaultsDto(
                    applicantName, room, seat, phone1, phone2, phone3,
                    defaultStartDate, defaultEndDate, maxEndDate, moZipCode
            );
        } catch (Exception e) {
            log.error("외박신청 글쓰기 폼 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    /**
     * "호실", "자리"처럼 <b>라벨</b>이 들어있는 td 바로 다음 td의 텍스트를 뽑아냄.
     * (ssudorm 테이블 구조가 라벨 td + 값 td가 붙어있는 형태라서)
     */
    private String extractValueAfterLabel(Document doc, String label) {
        for (Element bold : doc.select("td > b")) {
            if (label.equals(bold.text().trim())) {
                Element labelTd = bold.parent();
                Element valueTd = labelTd.nextElementSibling();
                if (valueTd != null) {
                    return valueTd.text().trim();
                }
            }
        }
        return "";
    }

    private String extractMaxEndDate(Document doc) {
        for (Element script : doc.select("script")) {
            Matcher matcher = MAX_END_DATE_PATTERN.matcher(script.data());
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        log.warn("외박신청 최대 신청가능일(enddate 상한)을 페이지에서 찾지 못함");
        return null;
    }

    private Long extractDetailId(String onclickAttr) {
        if (onclickAttr == null) {
            return null;
        }
        Matcher matcher = DETAIL_NO_PATTERN.matcher(onclickAttr);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }

    private String extractFileName(String url) {
        if (url == null || url.isBlank()) {
            return "unknown";
        }
        int idx = url.lastIndexOf('/');
        return idx >= 0 ? url.substring(idx + 1) : url;
    }
}
