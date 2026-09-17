package com.soongsil.soongpal.chat.controller.rest;

import com.soongsil.soongpal.chat.dto.ChatRoomCreateReqDto;
import com.soongsil.soongpal.chat.dto.ChatRoomResDto;
import com.soongsil.soongpal.chat.service.ChatRoomService;
import com.soongsil.soongpal.common.dto.CommonErrorDto;
import com.soongsil.soongpal.common.dto.CommonResDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@Tag(name = "채팅방 API", description = "채팅방 관련 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/rooms")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;


    @Operation(summary = "채팅방 생성", description = "새로운 채팅방을 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "채팅방 생성 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "404", description = "존재하지 않는 사용자 또는 게시글", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @PostMapping
    public ResponseEntity<CommonResDto<ChatRoomResDto>> createChatRoom(
            @Parameter(description = "채팅방 생성 요청 정보") @Valid @RequestBody ChatRoomCreateReqDto dto
    ) {
        Long userId = getUserId();
        ChatRoomResDto chatRoom = chatRoomService.createPrivateChatRoom(dto, userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방이 생성되었습니다.", chatRoom), HttpStatus.OK);
    }

    @Operation(summary = "채팅방 조회", description = "특정 채팅방의 정보를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "채팅방 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "403", description = "해당 채팅방에 접근할 수 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @GetMapping("/{roomId}")
    public ResponseEntity<CommonResDto<ChatRoomResDto>> getChatRoom(
            @Parameter(description = "채팅방 ID") @PathVariable Long roomId
    ) {
        Long userId = getUserId();
        ChatRoomResDto chatRoom = chatRoomService.getChatRoom(roomId, userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방 정보를 조회했습니다.", chatRoom), HttpStatus.OK);
    }

    @Operation(summary = "채팅방 목록 조회", description = "사용자가 참여한 채팅방 목록을 조회합니다.")
    @ApiResponse(responseCode = "200", description = "채팅방 목록 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @GetMapping
    public ResponseEntity<CommonResDto<List<ChatRoomResDto>>> getChatRooms() {
        Long userId = getUserId();
        List<ChatRoomResDto> chatRooms = chatRoomService.getChatRoomsByUser(userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방 목록을 조회했습니다.", chatRooms), HttpStatus.OK);
    }

    @Operation(summary = "채팅방 참가", description = "특정 채팅방에 참가합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "채팅방 참가 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "403", description = "일대일 채팅방에 접근할 수 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "404", description = "존재하지 않는 채팅방, 게시글 또는 사용자", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @PostMapping("/{boardId}/join")
    public ResponseEntity<CommonResDto<ChatRoomResDto>> joinChatRoom(
            @Parameter(description = "게시글 ID") @PathVariable Long boardId) {
        Long userId = getUserId();
        ChatRoomResDto dto = chatRoomService.joinChatRoom(boardId, userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방에 참가했습니다.", dto), HttpStatus.OK);
    }

    @Operation(summary = "채팅방 나가기", description = "특정 채팅방에서 나갑니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "채팅방 나가기 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "400", description = "참가하지 않은 채팅방", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "403", description = "일대일 채팅방에 접근할 수 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "404", description = "존재하지 않는 채팅방 또는 게시글", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<CommonResDto<ChatRoomResDto>> leaveChatRoom(
            @Parameter(description = "채팅방 ID") @PathVariable Long roomId) {
        Long userId = getUserId();
        ChatRoomResDto dto = chatRoomService.leaveChatRoom(roomId, userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방을 나갔습니다.", dto), HttpStatus.OK);
    }

    @Operation(summary = "채팅방 삭제", description = "특정 채팅방을 삭제합니다. (방장만 가능)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "채팅방 삭제 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "400", description = "참가하지 않은 채팅방", content = @Content(schema = @Schema(implementation = CommonErrorDto.class))),
            @ApiResponse(responseCode = "403", description = "채팅방을 삭제할 권한이 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @DeleteMapping("/{roomId}")
    public ResponseEntity<CommonResDto<String>> deleteChatRoom(
            @Parameter(description = "채팅방 ID") @PathVariable Long roomId) {
        Long userId = getUserId();
        chatRoomService.deleteChatRoom(roomId, userId);
        return new ResponseEntity<>(new CommonResDto<>("채팅방이 삭제되었습니다.", "성공"), HttpStatus.OK);
    }

    @Operation(summary = "메시지 읽음 처리", description = "특정 메시지까지 읽음 처리합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "읽음 처리 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class))),
            @ApiResponse(responseCode = "400", description = "참가하지 않은 채팅방", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    })
    @PatchMapping("/{roomId}/read")
    public ResponseEntity<CommonResDto<String>> updateLastReadMessage(
            @Parameter(description = "채팅방 ID") @PathVariable Long roomId,
            @Parameter(description = "마지막으로 읽은 메시지 ID") @RequestParam Long messageId) {
        Long userId = getUserId();
        chatRoomService.updateLastReadMessage(roomId, userId, messageId);
        return new ResponseEntity<>(new CommonResDto<>("읽음 처리되었습니다.", "성공"), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            return 0L;
        }

        return Long.parseLong(authentication.getName());
    }
}