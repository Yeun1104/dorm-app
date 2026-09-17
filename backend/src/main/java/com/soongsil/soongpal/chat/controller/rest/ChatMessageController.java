package com.soongsil.soongpal.chat.controller.rest;

import com.soongsil.soongpal.chat.dto.ChatMessageResDto;
import com.soongsil.soongpal.chat.dto.ChatPageResDto;
import com.soongsil.soongpal.chat.service.ChatMessageService;
import com.soongsil.soongpal.common.dto.CommonErrorDto;
import com.soongsil.soongpal.common.dto.CommonResDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


@Tag(name = "채팅 메시지 API", description = "채팅 메시지 관련 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/messages")
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    @Operation(summary = "채팅 메시지 조회", description = "특정 채팅방의 메시지 목록을 페이지별로 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "메시지 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "403", description = "채팅방에 접근할 수 없습니다.", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @GetMapping
    public ResponseEntity<CommonResDto<ChatPageResDto<ChatMessageResDto>>> getMessages(
            @Parameter(description = "채팅방 ID") @RequestParam Long roomId,
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page
    ) {
        Long userId = getUserId();
        ChatPageResDto<ChatMessageResDto> messages = chatMessageService.getMessages(roomId, userId, page);
        return new ResponseEntity<>(new CommonResDto<>("메시지 목록을 조회했습니다.", messages), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            return 0L;
        }

        return Long.parseLong(authentication.getName());
    }
}