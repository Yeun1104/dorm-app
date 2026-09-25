package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.dorm.dto.NoticeContentBlockDto;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 공지 본문 HTML(td.descript)을 줄바꿈이 살아있는 텍스트 블록 + 표 블록으로 변환함.
 * Element.text()는 줄바꿈/표 구조를 전부 한 줄로 뭉개서 앱에서 읽기 어려웠음.
 *
 * 표는 "안에 다른 표가 없고 2칸 이상인 행이 있는" 것만 데이터 표로 봄.
 * (본문 전체를 감싸는 레이아웃용 1칸짜리 표는 그냥 텍스트로 풀어서 처리)
 */
final class NoticeContentParser {

    private static final Set<String> BLOCK_TAGS = Set.of(
            "p", "div", "li", "ul", "ol", "tr", "table", "tbody", "thead", "blockquote", "pre", "center",
            "h1", "h2", "h3", "h4", "h5", "h6", "dl", "dt", "dd", "hr"
    );
    private static final Set<String> SKIP_TAGS = Set.of("script", "style", "head", "title");

    private final List<NoticeContentBlockDto> blocks = new ArrayList<>();
    private final StringBuilder buffer = new StringBuilder();

    private NoticeContentParser() {
    }

    static List<NoticeContentBlockDto> parse(Element root) {
        NoticeContentParser parser = new NoticeContentParser();
        if (root != null) {
            root.childNodes().forEach(parser::walk);
        }
        parser.flushText();
        return parser.blocks;
    }

    /** 블록 목록을 예전 content 필드용 평문으로 합침 (줄바꿈 유지) */
    static String toPlainText(List<NoticeContentBlockDto> blocks) {
        return blocks.stream()
                .map(b -> "TABLE".equals(b.type())
                        ? b.rows().stream().map(row -> String.join(" | ", row)).collect(Collectors.joining("\n"))
                        : b.text())
                .collect(Collectors.joining("\n\n"));
    }

    private void walk(Node node) {
        if (node instanceof TextNode textNode) {
            buffer.append(textNode.text().replace(' ', ' '));
            return;
        }
        if (!(node instanceof Element el)) {
            return;
        }

        String tag = el.normalName();
        if (SKIP_TAGS.contains(tag)) {
            return;
        }
        if ("br".equals(tag)) {
            buffer.append('\n');
            return;
        }
        if ("table".equals(tag) && isDataTable(el)) {
            flushText();
            blocks.add(NoticeContentBlockDto.table(extractRows(el)));
            return;
        }

        boolean block = BLOCK_TAGS.contains(tag);
        if (block) buffer.append('\n');
        el.childNodes().forEach(this::walk);
        if (block) buffer.append('\n');
    }

    private void flushText() {
        String text = cleanup(buffer.toString());
        if (!text.isEmpty()) {
            blocks.add(NoticeContentBlockDto.text(text));
        }
        buffer.setLength(0);
    }

    private static boolean isDataTable(Element table) {
        // select는 자기 자신도 포함하므로 1개면 중첩 표 없음
        if (table.select("table").size() > 1) {
            return false;
        }
        return table.select("tr").stream().anyMatch(tr -> tr.select("th, td").size() >= 2);
    }

    private static List<List<String>> extractRows(Element table) {
        List<List<String>> rows = new ArrayList<>();
        for (Element tr : table.select("tr")) {
            List<String> cells = tr.select("th, td").stream()
                    .map(NoticeContentParser::cellText)
                    .toList();
            if (cells.stream().anyMatch(c -> !c.isEmpty())) {
                rows.add(cells);
            }
        }
        return rows;
    }

    private static String cellText(Element cell) {
        NoticeContentParser inner = new NoticeContentParser();
        cell.childNodes().forEach(inner::walk);
        return cleanup(inner.buffer.toString());
    }

    /** 각 줄 앞뒤 공백 제거 + 빈 줄은 최대 1줄까지만 */
    private static String cleanup(String raw) {
        String joined = raw.lines()
                .map(String::strip)
                .collect(Collectors.joining("\n"));
        return joined.replaceAll("\n{3,}", "\n\n").strip();
    }
}
