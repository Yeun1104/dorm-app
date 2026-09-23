package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.domain.DormBoardType;
import com.soongsil.soongpal.dorm.dto.OutingCreateReqDto;
import com.soongsil.soongpal.dorm.dto.OutingCreateResDto;
import com.soongsil.soongpal.dorm.dto.OutingDetailDto;
import com.soongsil.soongpal.dorm.dto.OutingFormDefaultsDto;
import com.soongsil.soongpal.dorm.dto.OutingListItemDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.nio.charset.Charset;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 외박신청 / 장기비움신청 조회(목록 / 상세 / 글쓰기 폼 기본값) + 작성/제출/삭제.
 * 두 게시판은 board_no(1=외박신청, 2=장기비움신청)만 다르고 폼 구조가 완전히 동일해서 로직을 공유함.
 * ssudorm 페이지를 긁어와서(Jsoup) 파싱함. 실제 HTML 구조는 view-source로 확보한 원본(외박신청/장기비움신청 둘 다) 기준.
 *
 * 일수 규칙(둘 다 사이트 자체 JS로 확인됨): 외박신청은 1~6일, 장기비움신청은 7일 이상(상한 없음, maxEndDate만 적용).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormOutingService {

    private static final String LIST_PATH_TEMPLATE = "/SShostel/mall_main.php?viewform=B0001_bbs_night&board_no=%d&next=%d";
    private static final String DETAIL_PATH_TEMPLATE = "/SShostel/mall_main.php?viewform=B0001_bbs_night&mode=view&board_no=%d&no=%d";
    private static final String WRITE_FORM_PATH_TEMPLATE =
            "/SShostel/mall_main.php?viewform=B0001_bbs_night&mode=write&formpath=&board_type=&board_no=%d&next=0&W=&Q=";
    // 원본 HTML의 <form action="...act_bbs_night.php" ...> 그대로. board_no는 폼 바디(hidden input)로만 전달됨.
    private static final String SUBMIT_PATH = "/SShostel/main/act_bbs_night.php";
    // 상세페이지의 삭제 버튼이 그냥 이 URL로 GET 이동하는 방식이라 그대로 재현함.
    private static final String DELETE_PATH_TEMPLATE = "/SShostel/main/act_bbs_night.php?viewform=B0001_bbs_night&act=del&board_no=%d&next=0&no=%d";

    private static final int PAGE_SIZE = 10;
    private static final int MAX_MEMO_BYTES = 255;
    private static final int OUTING_MAX_DURATION_DAYS = 6; // 외박신청 상한 (사이트 JS: tx > 6이면 거부)
    private static final int LONG_TERM_ABSENCE_MIN_DURATION_DAYS = 7; // 장기비움신청 하한 (사이트 JS: tx < 7이면 거부)
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final Charset EUC_KR = Charset.forName("EUC-KR");

    // 스크린샷/HTML에서 실제로 확인된 매핑은 이것 하나뿐. 나머지 상태 아이콘은 추측하지 않고 원본 파일명을 그대로 내려줌.
    private static final Map<String, String> STATUS_LABELS = Map.of(
            "ing_1.gif", "승인"
    );

    private static final Pattern DETAIL_NO_PATTERN = Pattern.compile("[?&]no=(\\d+)");
    private static final Pattern MAX_END_DATE_PATTERN = Pattern.compile("enddate\\.value\\s*>\\s*'(\\d{4}-\\d{2}-\\d{2})'");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    // ===== 외박신청 (board_no=1) =====

    public List<OutingListItemDto> getOutingList(Long userId, int page) {
        return getList(userId, DormBoardType.OUTING, page);
    }

    public OutingDetailDto getOutingDetail(Long userId, long no) {
        return getDetail(userId, DormBoardType.OUTING, no);
    }

    public OutingFormDefaultsDto getOutingFormDefaults(Long userId) {
        return getFormDefaults(userId, DormBoardType.OUTING);
    }

    public OutingCreateResDto createOuting(Long userId, OutingCreateReqDto dto) {
        return create(userId, DormBoardType.OUTING, dto);
    }

    public void deleteOuting(Long userId, long no, boolean confirm) {
        delete(userId, DormBoardType.OUTING, no, confirm);
    }

    // ===== 장기비움신청 (board_no=2, 폼 구조 동일) =====

    public List<OutingListItemDto> getLongTermAbsenceList(Long userId, int page) {
        return getList(userId, DormBoardType.LONG_TERM_ABSENCE, page);
    }

    public OutingDetailDto getLongTermAbsenceDetail(Long userId, long no) {
        return getDetail(userId, DormBoardType.LONG_TERM_ABSENCE, no);
    }

    public OutingFormDefaultsDto getLongTermAbsenceFormDefaults(Long userId) {
        return getFormDefaults(userId, DormBoardType.LONG_TERM_ABSENCE);
    }

    public OutingCreateResDto createLongTermAbsence(Long userId, OutingCreateReqDto dto) {
        return create(userId, DormBoardType.LONG_TERM_ABSENCE, dto);
    }

    public void deleteLongTermAbsence(Long userId, long no, boolean confirm) {
        delete(userId, DormBoardType.LONG_TERM_ABSENCE, no, confirm);
    }

    // ===== 공용 구현 =====

    private List<OutingListItemDto> getList(Long userId, DormBoardType boardType, int page) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        int next = Math.max(page, 0) * PAGE_SIZE;
        String path = String.format(LIST_PATH_TEMPLATE, boardType.getBoardNo(), next);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseList(doc);
    }

    private OutingDetailDto getDetail(Long userId, DormBoardType boardType, long no) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DETAIL_PATH_TEMPLATE, boardType.getBoardNo(), no);
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseDetail(doc, no);
    }

    private OutingFormDefaultsDto getFormDefaults(Long userId, DormBoardType boardType) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(WRITE_FORM_PATH_TEMPLATE, boardType.getBoardNo());
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseFormDefaults(doc);
    }

    /**
     * ssudorm은 제출 성공 시 명확한 "성공" 응답을 주지 않는(구형 사이트라 리다이렉트/얼럿 위주) 편이라,
     * 제출 직후 목록을 다시 조회해서 방금 넣은 기간과 일치하는 항목이 새로 생겼는지로 성공 여부를 확인함.
     *
     * getFormDefaults()가 내부적으로 GET을 하면서 세션을 항상 최신 상태로 검증/갱신해두기 때문에,
     * 그 바로 다음에 하는 POST(postAuthenticated)는 재시도 로직 없이 딱 1번만 제출함 (중복 제출 방지).
     */
    private OutingCreateResDto create(Long userId, DormBoardType boardType, OutingCreateReqDto dto) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        OutingFormDefaultsDto formDefaults = getFormDefaults(userId, boardType);
        validate(boardType, dto, formDefaults);

        Map<String, String> formData = new LinkedHashMap<>();
        formData.put("act", "add");
        formData.put("no", "");
        formData.put("board_no", String.valueOf(boardType.getBoardNo()));
        formData.put("guest_name", formDefaults.applicantName());
        formData.put("mozip_code", formDefaults.moZipCode());
        formData.put("handphone1", formDefaults.phone1());
        formData.put("handphone2", formDefaults.phone2());
        formData.put("handphone3", formDefaults.phone3());
        formData.put("sindate", dto.getStartDate().format(DATE_FORMAT));
        formData.put("enddate", dto.getEndDate().format(DATE_FORMAT));
        formData.put("usermemo", dto.getMemo());

        dormSessionManager.postAuthenticated(
                userId, SUBMIT_PATH, formData, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return confirmSubmission(userId, boardType, dto);
    }

    /**
     * 삭제는 되돌릴 수 없는 작업이라 confirm=true를 명시적으로 받았을 때만 실행함 (프론트의 확인 다이얼로그와는 별개로
     * 서버 쪽에서도 한 번 더 막아두는 것).
     * 삭제 자체는 GET 이동이라 재시도해도 안전(이미 지워진 걸 또 지우면 그냥 무효)하지만, 그래도 세션은
     * 이미 getDetail 호출들로 검증돼있어서 별도 재시도 로직은 안 넣음.
     * 삭제 확인은, 삭제 후 상세조회했을 때 신청 관련 데이터(기간/사유)가 비어있는지로 판단함
     * (존재하지 않는 글의 상세페이지는 프로필 정보만 보이고 나머지가 비어있다는 걸 이전에 확인함).
     */
    private void delete(Long userId, DormBoardType boardType, long no, boolean confirm) {
        if (!confirm) {
            throw new DormException(DormErrorCode.OUTING_DELETE_CONFIRM_REQUIRED);
        }

        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DELETE_PATH_TEMPLATE, boardType.getBoardNo(), no);
        dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        OutingDetailDto after = getDetail(userId, boardType, no);
        boolean stillExists = !after.startDate().isBlank() || !after.memo().isBlank();
        if (stillExists) {
            log.warn("{} 삭제 후에도 상세조회에 데이터가 남아있음 (userId={}, no={})", boardType.getLabel(), userId, no);
            throw new DormException(DormErrorCode.OUTING_DELETE_UNCONFIRMED);
        }
    }

    private void validate(DormBoardType boardType, OutingCreateReqDto dto, OutingFormDefaultsDto formDefaults) {
        String memo = dto.getMemo();
        if (memo == null || memo.isBlank()) {
            throw new DormException(DormErrorCode.OUTING_MEMO_REQUIRED);
        }
        if (memo.getBytes(EUC_KR).length > MAX_MEMO_BYTES) {
            throw new DormException(DormErrorCode.OUTING_MEMO_TOO_LONG);
        }

        LocalDate start = dto.getStartDate();
        LocalDate end = dto.getEndDate();

        if (end.isBefore(start)) {
            throw new DormException(DormErrorCode.OUTING_INVALID_DATE_RANGE);
        }

        long durationDays = ChronoUnit.DAYS.between(start, end);

        if (boardType == DormBoardType.OUTING) {
            if (durationDays < 1) {
                throw new DormException(DormErrorCode.OUTING_DURATION_TOO_SHORT);
            }
            if (durationDays > OUTING_MAX_DURATION_DAYS) {
                throw new DormException(DormErrorCode.OUTING_DURATION_TOO_LONG);
            }
        } else { // LONG_TERM_ABSENCE
            if (durationDays < LONG_TERM_ABSENCE_MIN_DURATION_DAYS) {
                throw new DormException(DormErrorCode.LONG_TERM_ABSENCE_DURATION_TOO_SHORT);
            }
            // 상한 없음 (사이트 JS에도 상한 체크 없음, maxEndDate로만 제한됨)
        }

        if (start.isBefore(LocalDate.now())) {
            throw new DormException(DormErrorCode.OUTING_START_DATE_IN_PAST);
        }

        String maxEndDateStr = formDefaults.maxEndDate();
        if (maxEndDateStr != null && !maxEndDateStr.isBlank()) {
            LocalDate maxEndDate = LocalDate.parse(maxEndDateStr, DATE_FORMAT);
            if (end.isAfter(maxEndDate)) {
                throw new DormException(DormErrorCode.OUTING_END_DATE_EXCEEDS_LIMIT);
            }
        }
    }

    private OutingCreateResDto confirmSubmission(Long userId, DormBoardType boardType, OutingCreateReqDto dto) {
        String expectedStart = dto.getStartDate().format(DATE_FORMAT);
        String expectedEnd = dto.getEndDate().format(DATE_FORMAT);

        List<OutingListItemDto> latest = getList(userId, boardType, 0);
        OutingListItemDto matched = latest.stream()
                .filter(item -> expectedStart.equals(item.startDate()) && expectedEnd.equals(item.endDate()))
                .findFirst()
                .orElse(null);

        if (matched == null) {
            log.warn("{} 제출 후 목록에서 일치하는 항목을 찾지 못함 (userId={}, {}~{})",
                    boardType.getLabel(), userId, expectedStart, expectedEnd);
            throw new DormException(DormErrorCode.OUTING_SUBMIT_UNCONFIRMED);
        }

        return new OutingCreateResDto(true, matched);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private List<OutingListItemDto> parseList(Document doc) {
        try {
            Elements rows = doc.select("tr[onclick]");
            return rows.stream()
                    .map(this::toOutingListItem)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private OutingListItemDto toOutingListItem(Element row) {
        Elements tds = row.select("td");
        if (tds.size() < 5) {
            return null; // 예상 못한 행 구조는 조용히 스킵 (페이지 구조가 바뀌었을 가능성 - 로그로 확인 필요)
        }

        long displayNo = Long.parseLong(tds.get(0).text().trim());
        String period = tds.get(2).text().trim();
        String[] parts = period.split("~");
        String startDate = parts.length > 0 ? parts[0].trim() : "";
        String endDate = parts.length > 1 ? parts[1].trim() : "";
        String writtenAt = tds.get(3).text().trim();

        Element statusImg = tds.get(4).selectFirst("img");
        String statusIcon = statusImg != null ? extractFileName(statusImg.attr("src")) : "unknown";
        String status = STATUS_LABELS.getOrDefault(statusIcon, "확인필요");

        Long no = extractDetailId(row.attr("onclick"));

        return new OutingListItemDto(displayNo, startDate, endDate, writtenAt, status, statusIcon, no);
    }

    private OutingDetailDto parseDetail(Document doc, long no) {
        try {
            String applicantName = extractValueAfterLabel(doc, "신청자");
            String room = extractValueAfterLabel(doc, "호실");
            String seat = extractValueAfterLabel(doc, "자리");
            String writtenAt = extractValueAfterLabel(doc, "작성일");
            String phone = extractValueAfterLabel(doc, "휴대폰번호");
            String resultStatus = extractValueAfterLabel(doc, "처리결과");
            String period = extractValueAfterLabel(doc, "신청일");
            String memo = extractValueAfterLabel(doc, "사유");

            String[] parts = period.split("~");
            String startDate = parts.length > 0 ? parts[0].trim() : "";
            String endDate = parts.length > 1 ? parts[1].trim() : "";

            return new OutingDetailDto(no, applicantName, room, seat, writtenAt, phone, resultStatus, startDate, endDate, memo);
        } catch (Exception e) {
            log.error("상세 파싱 실패 (no={})", no, e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private OutingFormDefaultsDto parseFormDefaults(Document doc) {
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
            log.error("글쓰기 폼 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    /**
     * "호실", "자리"처럼 <b>라벨</b>이 들어있는 td 바로 다음 td의 텍스트를 뽑아냄.
     * (ssudorm 테이블 구조가 라벨 td + 값 td가 붙어있는 형태라서, 목록/상세/글쓰기폼 전부 이 패턴)
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
        log.warn("최대 신청가능일(enddate 상한)을 페이지에서 찾지 못함");
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
