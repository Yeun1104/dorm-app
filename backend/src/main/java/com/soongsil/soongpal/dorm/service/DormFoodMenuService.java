package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.dto.FoodMenuDayDto;
import com.soongsil.soongpal.dorm.dto.FoodMenuResDto;
import com.soongsil.soongpal.dorm.dto.FoodMenuWeekNavDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 자료실 - 식단. 읽기전용, 한 주 단위로 보여줌. gyear/gmonth/gday를 주면 그 날짜가 포함된 주로 이동.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormFoodMenuService {

    private static final String PATH_BASE = "/SShostel/mall_main.php?viewform=B0001_foodboard_list&board_no=1";

    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})\\s*\\(([^)]+)\\)");
    private static final Pattern WEEK_LABEL_PATTERN = Pattern.compile("\\d{4}년\\s*\\d{1,2}월\\s*\\d+주차");
    private static final Pattern NAV_PATTERN = Pattern.compile("gyear=(\\d{4}).*?gmonth=(\\d{2}).*?gday=(\\d{2})");

    private final DormAccountRepository dormAccountRepository;
    private final DormSessionManager dormSessionManager;

    public FoodMenuResDto getMenu(Long userId, String gyear, String gmonth, String gday) {
        DormAccount dormAccount = getDormAccountOrThrow(userId);

        String path = PATH_BASE;
        if (gyear != null && gmonth != null && gday != null) {
            path += "&gyear=" + gyear + "&gmonth=" + gmonth + "&gday=" + gday;
        }

        Document doc = dormSessionManager.fetchAuthenticated(
                userId, path, dormAccount.getDormUsername(), dormAccount.getDormPassword());

        return parse(doc);
    }

    private FoodMenuResDto parse(Document doc) {
        try {
            List<FoodMenuDayDto> days = new ArrayList<>();
            for (Element row : doc.select("table.boxstyle02 tbody > tr")) {
                FoodMenuDayDto day = toDay(row);
                if (day != null) {
                    days.add(day);
                }
            }

            String weekLabel = extractWeekLabel(doc);
            FoodMenuWeekNavDto prevWeek = null;
            FoodMenuWeekNavDto nextWeek = null;

            for (Element a : doc.select("a[href*=gyear]")) {
                Matcher matcher = NAV_PATTERN.matcher(a.attr("href"));
                if (!matcher.find()) {
                    continue;
                }
                FoodMenuWeekNavDto nav = new FoodMenuWeekNavDto(matcher.group(1), matcher.group(2), matcher.group(3));
                if (a.select("img[src*=icon_prev]").first() != null) {
                    prevWeek = nav;
                } else if (a.select("img[src*=icon_next]").first() != null) {
                    nextWeek = nav;
                }
            }

            return new FoodMenuResDto(weekLabel, days, prevWeek, nextWeek);
        } catch (Exception e) {
            log.error("식단 파싱 실패", e);
            throw new DormException(DormErrorCode.DORM_PARSING_FAILED, e);
        }
    }

    private FoodMenuDayDto toDay(Element row) {
        Element th = row.selectFirst("th");
        Elements tds = row.select("td");
        if (th == null || tds.size() < 4) {
            return null;
        }

        Matcher matcher = DATE_PATTERN.matcher(th.text());
        if (!matcher.find()) {
            return null;
        }
        String date = matcher.group(1);
        String dayOfWeek = matcher.group(2);

        List<String> breakfast = extractMenuItems(tds.get(0));
        List<String> lunch = extractMenuItems(tds.get(1));
        List<String> dinner = extractMenuItems(tds.get(2));
        List<String> combinedMeal = extractMenuItems(tds.get(3));

        return new FoodMenuDayDto(date, dayOfWeek, breakfast, lunch, dinner, combinedMeal);
    }

    /**
     * 한 셀 안에 메뉴 항목들이 <br>로 구분되어 있어서, <br> 기준으로 쪼개서 각 조각의 텍스트만 뽑아냄.
     */
    private List<String> extractMenuItems(Element cell) {
        String html = cell.html();
        String[] parts = html.split("(?i)<br\\s*/?>");
        List<String> items = new ArrayList<>();
        for (String part : parts) {
            String text = Jsoup.parse(part).text().trim();
            if (!text.isEmpty()) {
                items.add(text);
            }
        }
        return items;
    }

    private String extractWeekLabel(Document doc) {
        for (Element td : doc.select("td")) {
            String text = td.text().trim();
            Matcher matcher = WEEK_LABEL_PATTERN.matcher(text);
            if (matcher.find()) {
                return matcher.group();
            }
        }
        return "";
    }

    private DormAccount getDormAccountOrThrow(Long userId) {
        return dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));
    }
}
