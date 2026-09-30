package com.soongsil.soongpal.chat.controller.rest;

import com.soongsil.soongpal.chat.dto.ChatMessageResDto;
import com.soongsil.soongpal.chat.dto.ChatPageResDto;
import com.soongsil.soongpal.chat.service.ChatMessageService;
import com.soongsil.soongpal.chat.service.ChatService;
import com.soongsil.soongpal.common.dto.CommonErrorDto;
import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
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
    private final ChatService chatService;

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

    @Operation(summary = "채팅 메시지 전송 취소(삭제)", description = "본인이 보낸 메시지만 삭제 가능. 삭제되면 같은 방의 다른 클라이언트에도 실시간으로 반영됨(deleted:true).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(responseCode = "403", description = "본인이 보낸 메시지가 아님", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "404", description = "메시지를 찾을 수 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @DeleteMapping("/{messageId}")
    public ResponseEntity<CommonResDto<ChatMessageResDto>> deleteMessage(@PathVariable Long messageId) {
        Long userId = getStrictUserId();
        ChatMessageResDto result = chatService.deleteMessage(messageId, userId);
        return new ResponseEntity<>(new CommonResDto<>("메시지를 삭제했습니다.", result), HttpStatus.OK);
    }

    /** 조회(GET)는 기존처럼 비로그인 시 0L로 흘려보내 access-check에서 걸러지게 두고, 삭제(DELETE)는 바로 막음. */
    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            return 0L;
        }

        return Long.parseLong(authentication.getName());
    }

    private Long getStrictUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
