package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.dto.IpsaDetailDto;
import com.soongsil.soongpal.dorm.dto.IpsaListItemDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 마이페이지 - 입사신청/선발내역. 읽기전용.
 *
 * ⚠️ 상세조회는 "번호"가 아니라 mozip_code(학기/모집 코드)로 함 — 다른 게시판들의 no와는 다른 값.
 * ⚠️ 원본 페이지의 주민등록번호(JUMIN1/JUMIN2) hidden input에는 전체 숫자가 그대로 들어있지만,
 *    우리는 그 hidden input을 절대 긁지 않고 화면에 실제로 "보이는" 마스킹된 텍스트만 가져옴.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormIpsaService {

    private static final String LIST_PATH = "/SShostel/mall_main.php?viewform=B0001_ipsaform_list";
    private static final String DETAIL_PATH_TEMPLATE = "/SShostel/mall_main.php?viewform=B0001_ipsaform_view&mozip_code=%d";

    private static final Pattern MOZIP_CODE_PATTERN = Pattern.compile("mozip_code=(\\d+)");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public List<IpsaListItemDto> getList(Long userId) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, LIST_PATH, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseList(doc);
    }

    public IpsaDetailDto getDetail(Long userId, long mozipCode) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = String.format(DETAIL_PATH_TEMPLATE, mozipCode);
        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parseDetail(doc, mozipCode);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }

    private List<IpsaListItemDto> parseList(Document doc) {
        try {
            List<IpsaListItemDto> result = new java.util.ArrayList<>();
            for (Element row : doc.select("tr")) {
                Elements tds = row.select("> td");
                if (tds.size() != 5) {
                    continue;
                }
                Element link = tds.get(1).selectFirst("a");
                if (link == null) {
                    continue; // 헤더 행 등은 링크가 없어서 자연히 걸러짐
                }

                int displayNo;
                try {
                    displayNo = Integer.parseInt(tds.get(0).text().trim());
                } catch (NumberFormatException e) {
                    continue;
                }

                Long mozipCode = extractMozipCode(link.attr("href"));
                if (mozipCode == null) {
                    continue;
                }

                String recruitType = link.text().trim();
                String selectionStatus = tds.get(2).text().trim();
                String residencePeriod = tds.get(3).text().trim();
                String roommateInfo = tds.get(4).text().trim();

                result.add(new IpsaListItemDto(displayNo, mozipCode, recruitType, selectionStatus, residencePeriod, roommateInfo));
            }
            return result;
        } catch (Exception e) {
            log.error("입사신청 목록 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    /**
     * 라벨(<b>/<strong> + bgcolor=#edf8fc인 td) 바로 다음 td를 값으로 잡아서 라벨→값 맵을 만듦.
     * 항목 종류가 페이지마다 조금씩 달라서 고정된 필드 목록 대신 이 방식으로 유연하게 받음.
     */
    private IpsaDetailDto parseDetail(Document doc, long mozipCode) {
        try {
            Map<String, String> fields = new LinkedHashMap<>();

            for (Element row : doc.select("tr")) {
                Elements tds = row.select("> td");
                for (int i = 0; i < tds.size() - 1; i++) {
                    Element cell = tds.get(i);
                    Element label = cell.selectFirst("strong, b");
                    boolean isLabelCell = label != null
                            && "edf8fc".equalsIgnoreCase(cell.attr("bgcolor").replace("#", ""));
                    if (isLabelCell) {
                        String key = label.text().trim();
                        String value = tds.get(i + 1).text().trim();
                        if (!key.isEmpty() && !fields.containsKey(key)) {
                            fields.put(key, value);
                        }
                    }
                }
            }

            return new IpsaDetailDto(mozipCode, fields);
        } catch (Exception e) {
            log.error("입사신청 상세 파싱 실패 (mozipCode={})", mozipCode, e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private Long extractMozipCode(String hrefAttr) {
        if (hrefAttr == null) {
            return null;
        }
        Matcher matcher = MOZIP_CODE_PATTERN.matcher(hrefAttr);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }
}
