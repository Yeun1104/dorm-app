package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.InquiryCreateReqDto;
import com.soongsil.soongpal.dorm.dto.InquiryCreateResDto;
import com.soongsil.soongpal.dorm.dto.InquiryDetailDto;
import com.soongsil.soongpal.dorm.dto.InquiryFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.InquiryListItemDto;
import com.soongsil.soongpal.dorm.dto.InquiryUpdateReqDto;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "일반문의및상담" 게시판 (board_no=2) 조회/작성/수정/삭제/검색.
 * 고쳐주세요와 같은 게시판 시스템(B0001_board_list/view/write/edit)이라 구조는 거의 동일하지만,
 * - 방문허용 항목이 없고
 * - 대신 비밀글(secret) 기능이 있음: 남이 쓴 비밀글은 못 열어보고, 상세조회하면 비밀번호 입력 페이지로 대체됨
 *   → 우리는 그 경우 locked=true만 내려주고 구체적인 내용은 아예 시도하지 않음 (본인 글이면 그냥 보임).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormInquiryService {

    private static final int BOARD_NO = 2;
    private static final int PAGE_SIZE = 15;
    private static final Charset EUC_KR = Charset.forName("EUC-KR");

    private static final String LIST_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_list&board_no=" + BOARD_NO + "&next=%d";
    private static final String WRITE_FORM_PATH =
            "/SShostel/mall_main.php?viewform=B0001_board_write&formpath=&board_type=&board_no=" + BOARD_NO + "&next=0";
    private static final String DETAIL_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_view&formpath=&board_type=&next=0&board_no=" + BOARD_NO + "&no=%d&Q=&W=";
    private static final String EDIT_FORM_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_edit&formpath=&board_type=&board_no=" + BOARD_NO + "&no=%d&next=0";
    private static final String CREATE_SUBMIT_PATH = "/SShostel/main/board/act_write.php";
    private static final String EDIT_SUBMIT_PATH = "/SShostel/main/board/act_edit.php";
    private static final String DELETE_PATH_TEMPLATE =
            "/SShostel/main/board/act_del.php?viewform=B0001_board_list&formpath=&board_type=&board_no=" + BOARD_NO + "&next=0&no=%d";

    private static final Pattern DETAIL_NO_PATTERN = Pattern.compile("viewContent\\('\\d+','(\\d+)'\\)");
    private static final Pattern REPLY_COUNT_PATTERN = Pattern.compile("\\((\\d+)\\)");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public List<InquiryListItemDto> getList(Long userId, int page) {
        return getList(userId, page, null, RepairSearchField.TITLE);
    }

    public List<InquiryListItemDto> getList(Long userId, int page, String keyword, RepairSearchField field) {
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

    public InquiryDetailDto getDetail(Long userId, long no) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DETAIL_PATH_TEMPLATE, no);
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseDetail(doc, no);
    }

    public InquiryFormDefaultsDto getFormDefaults(Long userId) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, WRITE_FORM_PATH, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseFormDefaults(doc);
    }

    public InquiryCreateResDto create(Long userId, InquiryCreateReqDto dto) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        InquiryFormDefaultsDto formDefaults = getFormDefaults(userId);

        Map<String, String> formData = new LinkedHashMap<>();
        formData.put("viewform", "B0001_board_list");
        formData.put("formpath", "");
        formData.put("board_type", "");
        formData.put("next", "0");
        formData.put("board_no", String.valueOf(BOARD_NO));
        formData.put("helpkey", String.valueOf(BOARD_NO));
        formData.put("title", dto.getTitle());
        formData.put("guestname", formDefaults.writerName());
        formData.put("guestpass", dto.getPostPassword());
        formData.put("guestemail", formDefaults.writerEmail());
        formData.put("content", normalizeLineBreaks(dto.getContent()));
        if (dto.isSecret()) {
            formData.put("secret", "1"); // 체크박스라 원본 폼도 체크 안 하면 아예 필드를 안 보냄
        }

        dormSessionManager.postAuthenticated(
                userId, CREATE_SUBMIT_PATH, formData, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return confirmSubmission(userId, dto.getTitle());
    }

    public InquiryDetailDto update(Long userId, long no, InquiryUpdateReqDto dto) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        InquiryDetailDto current = getDetail(userId, no);
        assertOwner(userId, current);

        String editFormPath = String.format(EDIT_FORM_PATH_TEMPLATE, no);
        Document editFormDoc = dormSessionManager.fetchAuthenticated(
                userId, editFormPath, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        String guestname = editFormDoc.select("input[name=guestname]").attr("value");
        String guestpass = editFormDoc.select("input[name=guestpass]").attr("value");
        String guestemail = editFormDoc.select("input[name=guestemail]").attr("value");

        Map<String, String> formData = new LinkedHashMap<>();
        formData.put("viewform", "B0001_board_list");
        formData.put("formpath", "");
        formData.put("board_type", "");
        formData.put("next", "0");
        formData.put("board_no", String.valueOf(BOARD_NO));
        formData.put("no", String.valueOf(no));
        formData.put("passwd_edit", "");
        formData.put("title", dto.getTitle());
        formData.put("guestname", guestname);
        formData.put("guestpass", guestpass);
        formData.put("guestemail", guestemail);
        formData.put("content", normalizeLineBreaks(dto.getContent()));
        if (dto.isSecret()) {
            formData.put("secret", "1");
        }

        dormSessionManager.postAuthenticated(
                userId, EDIT_SUBMIT_PATH, formData, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        InquiryDetailDto updated = getDetail(userId, no);
        if (!dto.getTitle().equals(updated.title())) {
            log.warn("일반문의 수정 후 제목이 반영 안 됨 (userId={}, no={})", userId, no);
            throw new DormException(DormErrorCode.INQUIRY_EDIT_UNCONFIRMED);
        }
        return updated;
    }

    public void delete(Long userId, long no, boolean confirm) {
        if (!confirm) {
            throw new DormException(DormErrorCode.INQUIRY_DELETE_CONFIRM_REQUIRED);
        }

        DormAccount dormAccount = getDormAccountOrThrow(userId);

        InquiryDetailDto current = getDetail(userId, no);
        assertOwner(userId, current);

        String path = String.format(DELETE_PATH_TEMPLATE, no);
        dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        InquiryDetailDto after = getDetail(userId, no);
        if (!after.title().isBlank()) {
            log.warn("일반문의 삭제 후에도 상세조회에 데이터가 남아있음 (userId={}, no={})", userId, no);
            throw new DormException(DormErrorCode.INQUIRY_DELETE_UNCONFIRMED);
        }
    }

    /**
     * 본인 글인지 확인. 비밀글인데 locked면(=남의 비밀글) 당연히 막고,
     * 비밀글이 아니어도 작성자명이 로그인 계정 이름과 다르면(=남이 쓴 공개글) 막음
     * (고쳐주세요와 동일한 방식 — 실제로 그 실수로 처음에 버그가 났었어서 여긴 처음부터 둘 다 검사함).
     */
    private void assertOwner(Long userId, InquiryDetailDto detail) {
        if (detail.locked()) {
            throw new DormException(DormErrorCode.INQUIRY_NOT_OWNER);
        }
        InquiryFormDefaultsDto profile = getFormDefaults(userId);
        if (!profile.writerName().equals(detail.writer())) {
            throw new DormException(DormErrorCode.INQUIRY_NOT_OWNER);
        }
    }

    private String normalizeLineBreaks(String content) {
        return content.replace("\r\n", "\n").replace("\n", "<br>");
    }

    private String encodeEucKr(String value) {
        try {
            return URLEncoder.encode(value, EUC_KR.name());
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private InquiryCreateResDto confirmSubmission(Long userId, String expectedTitle) {
        List<InquiryListItemDto> latest = getList(userId, 0);
        InquiryListItemDto matched = latest.stream()
                .filter(item -> expectedTitle.equals(item.title()))
                .findFirst()
                .orElse(null);

        if (matched == null) {
            log.warn("일반문의 제출 후 목록에서 일치하는 제목을 찾지 못함 (userId={}, title={})", userId, expectedTitle);
            throw new DormException(DormErrorCode.INQUIRY_SUBMIT_UNCONFIRMED);
        }

        return new InquiryCreateResDto(true, matched);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private List<InquiryListItemDto> parseList(Document doc) {
        try {
            Elements titleLinks = doc.select("a.board");
            return titleLinks.stream()
                    .map(this::toInquiryListItem)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("일반문의 목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private InquiryListItemDto toInquiryListItem(Element titleLink) {
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

        Element titleTd = tds.get(1);
        boolean isNew = titleTd.select("img[src*=ico_board_new]").first() != null;
        boolean isSecret = titleTd.select("img[src*=ico_secrete]").first() != null;

        int replyCount = 0;
        Matcher replyMatcher = REPLY_COUNT_PATTERN.matcher(titleTd.text());
        if (replyMatcher.find()) {
            replyCount = Integer.parseInt(replyMatcher.group(1));
        }

        return new InquiryListItemDto(displayNo, no, title, writer, viewCount, writtenDate, isNew, isSecret, replyCount);
    }

    /**
     * 남이 쓴 비밀글을 열면 정상 상세페이지 대신 "비밀번호 입력" 페이지가 뜸
     * (input[name=board_secret_view_password]가 있는 폼). 그 경우 locked=true만 내려줌.
     */
    private InquiryDetailDto parseDetail(Document doc, long no) {
        try {
            if (doc.selectFirst("input[name=board_secret_view_password]") != null) {
                return InquiryDetailDto.locked(no);
            }

            String title = extractTitle(doc);
            String writer = extractLabeledValue(doc, "작성자:");
            String viewCountStr = extractLabeledValue(doc, "조회수:");
            String writtenAt = extractLabeledValue(doc, "작성일:");
            String content = extractContent(doc);

            int viewCount;
            try {
                viewCount = Integer.parseInt(viewCountStr.trim());
            } catch (NumberFormatException e) {
                viewCount = 0;
            }

            return new InquiryDetailDto(no, false, title, writer, viewCount, writtenAt, content);
        } catch (Exception e) {
            log.error("일반문의 상세 파싱 실패 (no={})", no, e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private InquiryFormDefaultsDto parseFormDefaults(Document doc) {
        try {
            String writerName = doc.select("input[name=guestname]").attr("value");
            String writerEmail = doc.select("input[name=guestemail]").attr("value");
            return new InquiryFormDefaultsDto(writerName, writerEmail);
        } catch (Exception e) {
            log.error("일반문의 글쓰기 폼 파싱 실패", e);
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

    private String extractContent(Document doc) {
        Element contentTd = doc.selectFirst("td.descript");
        return contentTd != null ? contentTd.text().trim() : "";
    }

    private Long extractDetailNo(String hrefAttr) {
        if (hrefAttr == null) {
            return null;
        }
        Matcher matcher = DETAIL_NO_PATTERN.matcher(hrefAttr);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }
}
