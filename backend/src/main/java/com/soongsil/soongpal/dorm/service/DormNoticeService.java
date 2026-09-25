package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.NoticeContentBlockDto;
import com.soongsil.soongpal.dorm.dto.NoticeDetailDto;
import com.soongsil.soongpal.dorm.dto.NoticeListItemDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 공지사항 (board_no=1) 조회/검색. 읽기전용 (운영사무실만 작성 가능해서 우리 앱에선 작성/수정/삭제 없음).
 *
 * ⚠️ 다른 게시판들과 달리 viewform이 B0001_noticeboard_list / B0001_noticeboard_view 로 다름
 * (고쳐주세요/일반문의는 B0001_board_list / B0001_board_view).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormNoticeService {

    private static final int BOARD_NO = 1;
    private static final int PAGE_SIZE = 15;
    private static final Charset EUC_KR = Charset.forName("EUC-KR");

    private static final String LIST_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_noticeboard_list&board_no=" + BOARD_NO + "&next=%d";
    private static final String DETAIL_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_noticeboard_view&formpath=&board_type=&next=0&board_no=" + BOARD_NO + "&no=%d&Q=&W=";

    private static final Pattern DETAIL_NO_PATTERN = Pattern.compile("viewContent\\('\\d+','(\\d+)'\\)");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public List<NoticeListItemDto> getList(Long userId, int page) {
        return getList(userId, page, null, RepairSearchField.TITLE);
    }

    public List<NoticeListItemDto> getList(Long userId, int page, String keyword, RepairSearchField field) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        int next = Math.max(page, 0) * PAGE_SIZE;
        String path = String.format(LIST_PATH_TEMPLATE, next);

        if (keyword != null && !keyword.isBlank()) {
            RepairSearchField searchField = field != null ? field : RepairSearchField.TITLE;
            path += "&Q=" + encodeEucKr(keyword) + "&W=" + searchField.getParamValue();
        }

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseList(doc);
    }

    public NoticeDetailDto getDetail(Long userId, long no) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DETAIL_PATH_TEMPLATE, no);
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseDetail(doc, no);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private String encodeEucKr(String value) {
        try {
            return URLEncoder.encode(value, EUC_KR.name());
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private List<NoticeListItemDto> parseList(Document doc) {
        try {
            Elements titleLinks = doc.select("a.board");
            return titleLinks.stream()
                    .map(this::toNoticeListItem)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("공지사항 목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private NoticeListItemDto toNoticeListItem(Element titleLink) {
        Element row = titleLink.closest("tr");
        if (row == null) {
            return null;
        }

        Elements tds = row.select("td");
        if (tds.size() < 5) {
            return null;
        }

        long displayNo;
        try {
            displayNo = Long.parseLong(tds.get(0).text().trim());
        } catch (NumberFormatException e) {
            return null;
        }

        Long no = extractDetailNo(titleLink.attr("href"));
        if (no == null) {
            return null;
        }

        String title = titleLink.text().trim();
        String writer = tds.get(2).text().trim();
        int viewCount;
        try {
            viewCount = Integer.parseInt(tds.get(3).text().trim());
        } catch (NumberFormatException e) {
            viewCount = 0;
        }
        String writtenDate = tds.get(4).text().trim();
        boolean isNew = tds.get(1).select("img[src*=ico_board_new]").first() != null;

        return new NoticeListItemDto(displayNo, no, title, writer, viewCount, writtenDate, isNew);
    }

    private NoticeDetailDto parseDetail(Document doc, long no) {
        try {
            String title = extractTitle(doc);
            String writer = extractLabeledValue(doc, "작성자:");
            String viewCountStr = extractLabeledValue(doc, "조회수:");
            String writtenAt = extractLabeledValue(doc, "작성일:");
            List<NoticeContentBlockDto> blocks = NoticeContentParser.parse(doc.selectFirst("td.descript"));
            String content = NoticeContentParser.toPlainText(blocks);

            int viewCount;
            try {
                viewCount = Integer.parseInt(viewCountStr.trim());
            } catch (NumberFormatException e) {
                viewCount = 0;
            }

            return new NoticeDetailDto(no, title, writer, viewCount, writtenAt, content, blocks);
        } catch (Exception e) {
            log.error("공지사항 상세 파싱 실패 (no={})", no, e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private String extractTitle(Document doc) {
        Element titleTd = doc.selectFirst("td[height=34][bgcolor=#edf8fc]");
        return titleTd != null ? titleTd.text().trim() : "";
    }

    private String extractLabeledValue(Document doc, String label) {
        for (Element td : doc.select("td")) {
            String text = td.ownText().trim();
            if (text.startsWith(label)) {
                return text.substring(label.length()).trim();
            }
        }
        return "";
    }

    private Long extractDetailNo(String hrefAttr) {
        if (hrefAttr == null) {
            return null;
        }
        Matcher matcher = DETAIL_NO_PATTERN.matcher(hrefAttr);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }
}
