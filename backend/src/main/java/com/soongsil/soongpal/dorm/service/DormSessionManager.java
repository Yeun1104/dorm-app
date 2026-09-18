package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 숭실대 기숙사 사이트(ssudorm)에 로그인해서 세션(쿠키)을 유지해주는 모듈.
 *
 * ssudorm은 EUC-KR 인코딩을 쓰는 구형 PHP 사이트라, 폼 전송 시 인코딩을 명시적으로 맞춰줘야 함.
 * 로그인 성공 여부는 응답에 세션 쿠키가 오는지 + 로그인 후 페이지에만 있는 "로그아웃" 링크(act_logout.php)로
 * 판별함 (아이디/비번이 틀려도 사이트가 200 OK + 로그인폼을 그대로 돌려주기 때문에, HTTP status만으로는 판별 불가).
 *
 * Phase 0(개인 검증) 기준: 세션은 서버 메모리에만 유지하고(재시작하면 날아감, DB에는 저장 안 함),
 * 사용자당 하나의 쿠키 세트만 캐싱함.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DormSessionManager {

    private static final String LOGIN_ACTION_PATH = "/SShostel/main/act_login.php";
    // 로그인 여부 판별용으로 쓰는, 로그인해야만 접근 가능한 페이지 (마이페이지 - 외박신청)
    private static final String PROBE_PATH = "/SShostel/mall_main.php?viewform=B0001_bbs_night";
    private static final String LOGOUT_LINK_MARKER = "act_logout.php";

    @Value("${dorm.base-url}")
    private String baseUrl;

    // userId -> 로그인 세션 쿠키. 서버 재시작하면 초기화됨 (의도된 동작).
    private final Map<Long, Map<String, String>> sessionCookies = new ConcurrentHashMap<>();

    /**
     * 기숙사 사이트에 로그인 시도. 성공하면 세션 쿠키를 캐싱하고 반환, 실패하면 DormException 던짐.
     */
    public Map<String, String> login(Long userId, String dormUsername, String dormPassword) {
        try {
            Connection.Response loginRes = Jsoup.connect(baseUrl + LOGIN_ACTION_PATH)
                    .data("url", "")
                    .data("ID", dormUsername)
                    .data("PASSWORD", dormPassword)
                    .method(Connection.Method.POST)
                    .postDataCharset("EUC-KR")
                    .followRedirects(true)
                    .timeout(10_000)
                    .execute();

            Map<String, String> cookies = loginRes.cookies();

            if (cookies.isEmpty()) {
                log.warn("기숙사 로그인 시도 - 세션 쿠키가 발급되지 않음 (userId={})", userId);
                throw new DormException(DormErrorCode.DORM_LOGIN_FAILED);
            }

            if (!probeIsLoggedIn(cookies)) {
                log.warn("기숙사 로그인 시도 - 로그인 상태 확인 실패 (userId={})", userId);
                throw new DormException(DormErrorCode.DORM_LOGIN_FAILED);
            }

            sessionCookies.put(userId, cookies);
            log.info("기숙사 로그인 성공 (userId={})", userId);
            return cookies;

        } catch (IOException e) {
            log.error("기숙사 사이트 연결 실패 (userId={})", userId, e);
            throw new DormException(DormErrorCode.DORM_CONNECTION_FAILED, e);
        }
    }

    /**
     * 캐싱된 세션으로 지정 경로(path)를 GET해서 Document로 돌려줌.
     * 세션이 없거나 만료됐으면 전달받은 자격증명으로 자동 재로그인 후 1회 재시도함.
     *
     * @param path "/SShostel/..." 형태의 base-url 뒤 경로 (쿼리스트링 포함 가능)
     */
    public Document fetchAuthenticated(Long userId, String path, String dormUsername, String dormPassword) {
        Map<String, String> cookies = sessionCookies.get(userId);

        if (cookies == null) {
            cookies = login(userId, dormUsername, dormPassword);
        }

        try {
            Connection.Response res = Jsoup.connect(baseUrl + path)
                    .cookies(cookies)
                    .method(Connection.Method.GET)
                    .timeout(10_000)
                    .execute();

            if (!containsLogoutMarker(res.body())) {
                // 세션 만료로 추정 -> 재로그인 후 1회만 재시도
                log.info("기숙사 세션 만료로 추정, 재로그인 시도 (userId={})", userId);
                cookies = login(userId, dormUsername, dormPassword);

                res = Jsoup.connect(baseUrl + path)
                        .cookies(cookies)
                        .method(Connection.Method.GET)
                        .timeout(10_000)
                        .execute();
            }

            return res.parse();

        } catch (IOException e) {
            log.error("기숙사 페이지 조회 실패 (userId={}, path={})", userId, path, e);
            throw new DormException(DormErrorCode.DORM_CONNECTION_FAILED, e);
        }
    }

    /**
     * 캐싱된 세션으로 지정 경로에 폼 데이터를 POST함. 세션 만료 시 재로그인 후 1회 재시도.
     */
    public Document postAuthenticated(Long userId, String path, Map<String, String> formData,
                                       String dormUsername, String dormPassword) {
        Map<String, String> cookies = sessionCookies.get(userId);

        if (cookies == null) {
            cookies = login(userId, dormUsername, dormPassword);
        }

        try {
            Connection.Response res = Jsoup.connect(baseUrl + path)
                    .cookies(cookies)
                    .data(formData)
                    .postDataCharset("EUC-KR")
                    .method(Connection.Method.POST)
                    .followRedirects(true)
                    .timeout(10_000)
                    .execute();

            if (!containsLogoutMarker(res.body())) {
                log.info("기숙사 세션 만료로 추정, 재로그인 후 재시도 (userId={}, path={})", userId, path);
                cookies = login(userId, dormUsername, dormPassword);

                res = Jsoup.connect(baseUrl + path)
                        .cookies(cookies)
                        .data(formData)
                        .postDataCharset("EUC-KR")
                        .method(Connection.Method.POST)
                        .followRedirects(true)
                        .timeout(10_000)
                        .execute();
            }

            return res.parse();

        } catch (IOException e) {
            log.error("기숙사 폼 제출 실패 (userId={}, path={})", userId, path, e);
            throw new DormException(DormErrorCode.DORM_CONNECTION_FAILED, e);
        }
    }

    private boolean probeIsLoggedIn(Map<String, String> cookies) throws IOException {
        Connection.Response res = Jsoup.connect(baseUrl + PROBE_PATH)
                .cookies(cookies)
                .method(Connection.Method.GET)
                .timeout(10_000)
                .execute();
        return containsLogoutMarker(res.body());
    }

    private boolean containsLogoutMarker(String html) {
        return html != null && html.contains(LOGOUT_LINK_MARKER);
    }
}
