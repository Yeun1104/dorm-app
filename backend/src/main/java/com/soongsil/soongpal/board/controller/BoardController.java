package com.soongsil.soongpal.board.controller;

import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.dto.*;
import com.soongsil.soongpal.board.service.BoardService;
import com.soongsil.soongpal.common.dto.CommonErrorDto;
import com.soongsil.soongpal.common.dto.CommonResDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@RequiredArgsConstructor
@RequestMapping("/api/board")
@RestController
@Tag(name = "Board Controller", description = "게시글 관련 CRUD 로직을 수행하는 Controller 입니다")
public class BoardController {

    private final BoardService boardService;

    @PostMapping(consumes = {"multipart/form-data"})
    @ApiResponse(responseCode = "200", description = "게시글 생성 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @ApiResponse(responseCode = "500", description = "파일 업로드 개수 초과", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Operation(method = "POST", summary = "새 게시글 생성", description = "사용자가 게시글 생성하기 위한 API")
    public ResponseEntity<CommonResDto<BoardResDto>> createBoard(
            @Valid @RequestPart(value = "board") BoardCreateReqDto boardCreateReqDto,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        Long userId = getUserId();
        BoardResDto dto = boardService.createBoard(boardCreateReqDto, images, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 생성", dto), HttpStatus.CREATED);
    }

    @GetMapping
    @ApiResponse(responseCode = "200", description = "게시글 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @Operation(method = "GET", summary = "게시글 목록 조회 및 필터링", description = "모든 게시글 또는 'keyword', 'category', 'status' 파라미터를 조합해 게시글을 조회합니다. 파라미터가 없으면 모든 게시글을 조회합니다.")
    @Parameter(name = "keyword", description = "조회할 게시글의 제목 (선택 사항)", required = false)
    @Parameter(name = "category", description = "조회할 게시글의 카테고리 (GROUP 또는 USED) (선택 사항)", required = false)
    @Parameter(name = "status", description = "조회할 게시글의 거래 상태 (IN_PROGRESS 또는 COMPLETED) (선택 사항)", required = false)
    @Parameter(name = "page", description = "조회할 페이지 번호 (0부터 시작, 기본값: 0)", example = "0")
    public ResponseEntity<CommonResDto<BoardPageResDto>> getBoards(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BoardCategory category,
            @RequestParam(required = false) BoardStatus status,
            @RequestParam(defaultValue = "0") int page
    ) {
        Long userId = getUserId();
        BoardPageResDto dto = boardService.getFilteredBoards(keyword, userId, category, status, page);
        return new ResponseEntity<>(new CommonResDto<>("게시글 조회 성공", dto), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @ApiResponse(responseCode = "200", description = "게시글 상세 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "조회할 게시글의 ID", required = true)
    @Operation(method = "GET", summary = "게시글 상세 조회", description = "id를 통해 특정 게시글을 조회하기 위한 API")
    public ResponseEntity<CommonResDto<BoardResDto>> getBoardById(@PathVariable Long id) {
        Long userId = getUserId();
        BoardResDto dto = boardService.getBoardById(id, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 상세 조회", dto), HttpStatus.OK);
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    @ApiResponse(responseCode = "200", description = "게시글 수정 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "403", description = "게시글 수정 권한 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글 또는 사용자", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @ApiResponse(responseCode = "500", description = "파일 업로드 개수 초과", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "조회할 게시글의 ID", required = true)
    @Operation(method = "PUT", summary = "게시글 수정", description = "게시글의 데이터를 수정하기 위한 API")
    public ResponseEntity<CommonResDto<BoardResDto>> updateBoard(
            @PathVariable Long id,
            @Valid @RequestPart(value = "board") BoardUpdateReqDto boardUpdateReqDto,
            @RequestPart(value = "newImages", required = false) List<MultipartFile> newImages,
            @RequestPart(value = "deleteImageIds", required = false) List<Long> deleteImageIds ) {
        Long userId = getUserId();
        BoardResDto dto = boardService.updateBoard(id, boardUpdateReqDto, newImages, deleteImageIds, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 수정", dto), HttpStatus.OK);
    }

    @PatchMapping("/{id}/status")
    @ApiResponse(responseCode = "200", description = "게시글 상태 변경 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "403", description = "게시글 수정 권한 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글 또는 사용자", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "상태를 변경할 게시글의 ID", required = true)
    @Operation(summary = "게시글 거래 상태 변경", description = "게시글의 거래 상태(IN_PROGRESS 또는 COMPLETED)를 변경하기 위한 API")
    public ResponseEntity<CommonResDto<BoardResDto>> updateBoardStatus(
            @PathVariable Long id,
            @Valid @RequestBody BoardStatusUpdateDto statusUpdateDto) {
        Long userId = getUserId();
        BoardResDto dto = boardService.updateBoardStatus(id, statusUpdateDto, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 상태 변경", dto), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @ApiResponse(responseCode = "200", description = "게시글 삭제 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "403", description = "게시글 삭제 권한 없음", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글 또는 사용자", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "조회할 게시글의 ID", required = true)
    @Operation(method = "DELETE", summary = "게시글 삭제", description = "게시글을 삭제하기 위한 API")
    public ResponseEntity<CommonResDto<BoardResDto>> deleteBoard(@PathVariable Long id) {
        Long userId = getUserId();
        boardService.deleteBoard(id, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 삭제", null), HttpStatus.OK);
    }

    @PostMapping("/{id}/like")
    @ApiResponse(responseCode = "200", description = "게시글 좋아요 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 게시글 또는 사용자", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "좋아요할 게시글의 ID", required = true)
    @Operation(method = "POST", summary = "게시글 좋아요 생성", description = "게시글 좋아요 생성하기 위한 API")
    public ResponseEntity<CommonResDto<LikeResDto>> addLike(@PathVariable Long id) {
        Long userId = getUserId();
        LikeResDto dto = boardService.addLike(id, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 좋아요 생성", dto), HttpStatus.OK);
    }

    @DeleteMapping("/{id}/like")
    @ApiResponse(responseCode = "200", description = "게시글 좋아요 삭제 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @ApiResponse(responseCode = "404", description = "존재하지 않는 좋아요", content = @Content(schema = @Schema(implementation = CommonErrorDto.class)))
    @Parameter(name = "id", description = "좋아요 삭제할 게시글의 ID", required = true)
    @Operation(method = "DELETE", summary = "게시글 좋아요 삭제", description = "게시글 좋아요를 삭제하기 위한 API")
    public ResponseEntity<CommonResDto<LikeResDto>> deleteLike(@PathVariable Long id) {
        Long userId = getUserId();
        LikeResDto dto = boardService.deleteLike(id, userId);
        return new ResponseEntity<>(new CommonResDto<>("게시글 좋아요 삭제", dto), HttpStatus.OK);
    }

    @GetMapping("/{id}/like")
    @ApiResponse(responseCode = "200", description = "게시글 좋아요 개수 조회 성공", content = @Content(schema = @Schema(implementation = CommonResDto.class)))
    @Parameter(name = "id", description = "좋아요 개수 조회할 게시글의 ID", required = true)
    @Operation(method = "GET", summary = "게시글 개수 조회", description = "게시글 좋아요 개수를 조회하기 위한 API")
    public ResponseEntity<CommonResDto<LikeResDto>> getLikeCount(@PathVariable Long id) {
        LikeResDto dto = boardService.getLikeCount(id);
        return new ResponseEntity<>(new CommonResDto<>("게시글 좋아요 개수 조회", dto), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            return 0L;
        }

        return Long.parseLong(authentication.getName());
    }


}