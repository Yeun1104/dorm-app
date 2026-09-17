package com.soongsil.soongpal.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;


@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
public class ChatPageResDto<T> {

    private List<T> content;

    private int currentPage;
    private int totalPages;

    private boolean first;
    private boolean last;

    public static <T> ChatPageResDto<T> from(Page<T> page) {
        return ChatPageResDto.<T>builder()
                .content(page.getContent())
                .currentPage(page.getNumber())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}