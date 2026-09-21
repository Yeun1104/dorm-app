package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.dto.SpointItemDto;
import com.soongsil.soongpal.dorm.dto.SpointResDto;
import com.soongsil.soongpal.dorm.dto.SpointYearTotalDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 마이페이지 - 상벌점조회. 읽기전용, 페이징 없이 전체 목록 + 연도별 총점을 한 번에 보여줌.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormSpointService {

    private static final String PATH = "/SShostel/mall_main.php?viewform=B0001_spoint_list";
    private static final Pattern YEAR_TOTAL_PATTERN = Pattern.compile("(\\d{4})년\\s*:\\s*(-?\\d+)\\s*점");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public SpointResDto getSpoints(Long userId) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, PATH, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parse(doc);
    }

    private SpointResDto parse(Document doc) {
        try {
            List<SpointItemDto> items = new ArrayList<>();
            for (Element row : doc.select("tr")) {
                Elements boardTds = row.select("> td.board");
                if (boardTds.size() != 4) {
                    continue;
                }
                items.add(toItem(boardTds));
            }

            List<SpointYearTotalDto> yearlyTotals = new ArrayList<>();
            for (Element td : doc.select("td[bgcolor=#FFF6F4]")) {
                Matcher matcher = YEAR_TOTAL_PATTERN.matcher(td.text());
                if (matcher.find()) {
                    yearlyTotals.add(new SpointYearTotalDto(matcher.group(1), Integer.parseInt(matcher.group(2))));
                }
            }

            return new SpointResDto(items, yearlyTotals);
        } catch (Exception e) {
            log.error("상벌점조회 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private SpointItemDto toItem(Elements tds) {
        int no;
        try {
            no = Integer.parseInt(tds.get(0).text().trim());
        } catch (NumberFormatException e) {
            no = 0;
        }
        String date = tds.get(1).text().trim();

        Element reasonTd = tds.get(2);
        String reason = reasonTd.text().trim();
        boolean isBonus = reasonTd.select("img[src*=ico_up]").first() != null;

        int point;
        try {
            point = Integer.parseInt(tds.get(3).text().trim());
        } catch (NumberFormatException e) {
            point = 0;
        }

        return new SpointItemDto(no, date, reason, point, isBonus);
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }
}
