package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.domain.RepairSearchField;
import com.soongsil.soongpal.dorm.dto.RepairCreateReqDto;
import com.soongsil.soongpal.dorm.dto.RepairCreateResDto;
import com.soongsil.soongpal.dorm.dto.RepairDetailDto;
import com.soongsil.soongpal.dorm.dto.RepairFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.RepairListItemDto;
import com.soongsil.soongpal.dorm.dto.RepairUpdateReqDto;
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
 * "고쳐주세요" 게시판 (board_no=3) 조회/작성/수정/삭제/검색.
 * ssudorm 페이지를 긁어와서(Jsoup) 파싱함. 실제 HTML 구조는 view-source로 확보한 원본 기준.
 *
 * 첨부파일 업로드는 아직 지원 안 함(파일 없이 텍스트만 제출).
 * 수정/삭제는 본인이 작성한 글만 가능 (작성자명이 로그인 계정 이름과 일치하는지로 확인).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormRepairService {

    private static final int BOARD_NO = 3;
    private static final int PAGE_SIZE = 15; // 목록 페이징 단위 (사이트 JS movePage(15,30,45...)로 확인됨)
    private static final Charset EUC_KR = Charset.forName("EUC-KR");

    private static final String LIST_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_list&board_no=" + BOARD_NO + "&next=%d";
    private static final String WRITE_FORM_PATH =
            "/SShostel/mall_main.php?viewform=B0001_board_write&formpath=&board_type=&board_no=" + BOARD_NO + "&next=0";
    private static final String DETAIL_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_view&formpath=&board_type=&next=0&board_no=" + BOARD_NO + "&no=%d&Q=&W=";
    private static final String EDIT_FORM_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_board_edit&formpath=&board_type=&board_no=" + BOARD_NO + "&no=%d&next=0";
    // 원본 HTML의 <form ... action="...act_write.php" ...> / act_edit.php 그대로.
    private static final String CREATE_SUBMIT_PATH = "/SShostel/main/board/act_write.php";
    private static final String EDIT_SUBMIT_PATH = "/SShostel/main/board/act_edit.php";
    // 상세페이지의 삭제 버튼이 그냥 이 URL로 GET 이동하는 방식이라 그대로 재현함.
    private static final String DELETE_PATH_TEMPLATE =
            "/SShostel/main/board/act_del.php?viewform=B0001_board_list&formpath=&board_type=&board_no=" + BOARD_NO + "&next=0&no=%d";

    // 제목 링크는 <a href="javascript:viewContent('3','11135');" class="board">처럼 href 안에 JS 호출이 들어있음
    // (onclick 속성이 아니라 href임에 주의 — 여기서 실제 상세조회용 내부 ID(두 번째 인자)를 뽑아냄).
    // 화면에 보이는 "번호" 컬럼(예: 10793)과는 다른 값이라 반드시 이걸로 상세조회해야 함.
    private static final Pattern DETAIL_NO_PATTERN = Pattern.compile("viewContent\\('\\d+','(\\d+)'\\)");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public List<RepairListItemDto> getList(Long userId, int page) {
        return getList(userId, page, null, RepairSearchField.TITLE);
    }

    public List<RepairListItemDto> getList(Long userId, int page, String keyword, RepairSearchField field) {
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

    public RepairDetailDto getDetail(Long userId, long no) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DETAIL_PATH_TEMPLATE, no);
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseDetail(doc, no);
    }

    public RepairFormDefaultsDto getFormDefaults(Long userId) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, WRITE_FORM_PATH, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseFormDefaults(doc);
    }

    /**
     * 작성자명/이메일은 글쓰기 폼 조회(getFormDefaults)에서 자동으로 가져와 같이 제출함.
     * 이 GET 호출이 세션도 같이 검증/갱신해두기 때문에, 바로 다음 POST는 재시도 없이 딱 1번만 제출함
     * (외박신청 때 겪었던 중복 제출 버그와 같은 이유로, POST는 절대 재시도하지 않음).
     *
     * 사용자가 입력한 줄바꿈(\n)은 <br>로 바꿔서 보냄 — 안 그러면 ssudorm 게시판에서 한 줄로 붙어버림
     * (원래 사이트는 리치텍스트 에디터라 줄바꿈을 알아서 <br>/<p>로 넣어주지만, 우리는 일반 텍스트로 보내기 때문).
     */
    public RepairCreateResDto create(Long userId, RepairCreateReqDto dto) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        RepairFormDefaultsDto formDefaults = getFormDefaults(userId);

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
        formData.put("visit", Boolean.TRUE.equals(dto.getVisitAllowed()) ? "1" : "0");
        formData.put("content", normalizeLineBreaks(dto.getContent()));

        dormSessionManager.postAuthenticated(
                userId, CREATE_SUBMIT_PATH, formData, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return confirmSubmission(userId, dto.getTitle());
    }

    /**
     * 본인이 쓴 글만 수정 가능. 비밀번호는 수정 폼 페이지가 그대로 값으로 보여주길래(로그인한 본인 글이라 그런 듯)
     * 그걸 그대로 읽어서 재사용함 — 사용자가 따로 입력할 필요 없음.
     */
    public RepairDetailDto update(Long userId, long no, RepairUpdateReqDto dto) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        RepairDetailDto current = getDetail(userId, no);
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
        formData.put("visit", Boolean.TRUE.equals(dto.getVisitAllowed()) ? "1" : "0");
        formData.put("content", normalizeLineBreaks(dto.getContent()));

        dormSessionManager.postAuthenticated(
                userId, EDIT_SUBMIT_PATH, formData, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        RepairDetailDto updated = getDetail(userId, no);
        if (!dto.getTitle().equals(updated.title())) {
            log.warn("고쳐주세요 수정 후 제목이 반영 안 됨 (userId={}, no={})", userId, no);
            throw new DormException(DormErrorCode.REPAIR_EDIT_UNCONFIRMED);
        }
        return updated;
    }

    /**
     * 삭제는 되돌릴 수 없는 작업이라 confirm=true를 명시적으로 받았을 때만 실행함.
     * 본인이 쓴 글만 삭제 가능.
     */
    public void delete(Long userId, long no, boolean confirm) {
        if (!confirm) {
            throw new DormException(DormErrorCode.REPAIR_DELETE_CONFIRM_REQUIRED);
        }

        DormAccount dormAccount = getDormAccountOrThrow(userId);

        RepairDetailDto current = getDetail(userId, no);
        assertOwner(userId, current);

        String path = String.format(DELETE_PATH_TEMPLATE, no);
        dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        RepairDetailDto after = getDetail(userId, no);
        if (!after.title().isBlank()) {
            log.warn("고쳐주세요 삭제 후에도 상세조회에 데이터가 남아있음 (userId={}, no={})", userId, no);
            throw new DormException(DormErrorCode.REPAIR_DELETE_UNCONFIRMED);
        }
    }

    private void assertOwner(Long userId, RepairDetailDto detail) {
        RepairFormDefaultsDto profile = getFormDefaults(userId);
        if (!profile.writerName().equals(detail.writer())) {
            throw new DormException(DormErrorCode.REPAIR_NOT_OWNER);
        }
    }

    private String normalizeLineBreaks(String content) {
        return content.replace("\r\n", "\n").replace("\n", "<br>");
    }

    private String encodeEucKr(String value) {
        try {
            return URLEncoder.encode(value, EUC_KR.name());
        } catch (UnsupportedEncodingException e) {
            // EUC-KR은 JVM에 항상 존재하는 표준 charset이라 사실상 발생하지 않음
            throw new IllegalStateException(e);
        }
    }

    private RepairCreateResDto confirmSubmission(Long userId, String expectedTitle) {
        List<RepairListItemDto> latest = getList(userId, 0);
        RepairListItemDto matched = latest.stream()
                .filter(item -> expectedTitle.equals(item.title()))
                .findFirst()
                .orElse(null);

        if (matched == null) {
            log.warn("고쳐주세요 제출 후 목록에서 일치하는 제목을 찾지 못함 (userId={}, title={})", userId, expectedTitle);
            throw new DormException(DormErrorCode.REPAIR_SUBMIT_UNCONFIRMED);
        }

        return new RepairCreateResDto(true, matched);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private List<RepairListItemDto> parseList(Document doc) {
        try {
            Elements titleLinks = doc.select("a.board");
            return titleLinks.stream()
                    .map(this::toRepairListItem)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("고쳐주세요 목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private RepairListItemDto toRepairListItem(Element titleLink) {
        Element row = titleLink.closest("tr");
        if (row == null) {
            return null;
        }

        Elements tds = row.select("td");
        if (tds.size() < 5) {
            return null; // 예상 못한 행 구조는 조용히 스킵
        }

        long displayNo;
        try {
            displayNo = Long.parseLong(tds.get(0).text().trim());
        } catch (NumberFormatException e) {
            return null;
        }

        // 상세조회용 내부 ID는 href="javascript:viewContent('3','11135');" 안에 있음 (onclick 아님!)
        Long no = extractDetailNo(titleLink.attr("href"));
        if (no == null) {
            return null; // 상세조회용 ID를 못 뽑으면 목록에 의미가 없으니 스킵
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

        return new RepairListItemDto(displayNo, no, title, writer, viewCount, writtenDate, isNew);
    }

    private RepairDetailDto parseDetail(Document doc, long no) {
        try {
            String title = extractTitle(doc);
            String writer = extractLabeledValue(doc, "작성자:");
            String viewCountStr = extractLabeledValue(doc, "조회수:");
            String writtenAt = extractLabeledValue(doc, "작성일:");
            String visitAllowed = extractLabeledValue(doc, "방문허용여부:");
            String content = extractContent(doc);

            int viewCount;
            try {
                viewCount = Integer.parseInt(viewCountStr.trim());
            } catch (NumberFormatException e) {
                viewCount = 0;
            }

            return new RepairDetailDto(no, title, writer, viewCount, writtenAt, visitAllowed, content);
        } catch (Exception e) {
            log.error("고쳐주세요 상세 파싱 실패 (no={})", no, e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private RepairFormDefaultsDto parseFormDefaults(Document doc) {
        try {
            String writerName = doc.select("input[name=guestname]").attr("value");
            String writerEmail = doc.select("input[name=guestemail]").attr("value");
            return new RepairFormDefaultsDto(writerName, writerEmail);
        } catch (Exception e) {
            log.error("고쳐주세요 글쓰기 폼 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    /**
     * 상세페이지 제목은 <td height="34" bgcolor="#edf8fc" ...><b>제목</b>&nbsp;</td> 형태로만 존재해서 이 조합으로 특정함.
     */
    private String extractTitle(Document doc) {
        Element titleTd = doc.selectFirst("td[height=34][bgcolor=#edf8fc]");
        return titleTd != null ? titleTd.text().trim() : "";
    }

    /**
     * "작성자: 김지원" 처럼 한 셀 안에 "라벨: 값" 형태로 들어있는 텍스트에서 라벨 뒤의 값만 뽑아냄.
     *
     * ⚠️ 이 4개 항목(작성자/조회수/작성일/방문허용여부)을 담은 작은 표가 바깥쪽 <td> 하나에 통째로 감싸여 있어서,
     * text()(자손 텍스트까지 다 포함)로 검사하면 바깥쪽 td가 먼저 걸려서 4개 값이 전부 뭉쳐서 나옴.
     * ownText()(그 요소에 직접 속한 텍스트만)로 검사해야 "작성자: 신예은"처럼 딱 원하는 셀만 걸림.
     */
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
