package com.soongsil.soongpal.user.controller;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.dto.DevSeedResDto;
import com.soongsil.soongpal.user.repository.UserRepository;
import com.soongsil.soongpal.user.service.jwt.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * ⚠️ 개발 전용. 혼자 테스트할 때 채팅/프로필/다른사람 글 등을 보려면 "다른 사람" 데이터가 필요해서 만든 시딩 API.
 * app.feature.dev-tools.enabled=false면 이 컨트롤러 자체가 로드 안 됨 (DevAuthController와 동일한 안전장치).
 *
 * 이미 만들어둔 더미 유저(kakaoId가 dev-dummy-1/2/3)가 있으면 새로 안 만들고 그대로 재사용함 —
 * 여러 번 호출해도 계정이 계속 늘어나진 않고, 게시글은 호출할 때마다 6개씩 추가로 생김.
 */
@RestController
@RequestMapping("/api/dev/seed")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.feature.dev-tools", name = "enabled", havingValue = "true")
@Tag(name = "[DEV ONLY] Dev Seed Controller", description = "테스트용 더미 유저/게시글 생성 (운영 환경에서는 반드시 비활성화)")
public class DevSeedController {

    private static final String[] DUMMY_NICKNAMES = {"더미유저하나", "더미유저둘", "더미유저셋"};
    private static final String[][] DUMMY_BOARDS = {
            // {제목, 내용, 총금액, 총수량, 수령장소}
            {"콜라 30개 공동구매", "제로콜라 30캔 같이 사요! 편의점보다 훨씬 싸요.", "15000", "30", "기숙사 1층 로비"},
            {"에어팟 케이스 공구", "예쁜 실리콘 케이스 5개 묶음 공구합니다", "25000", "5", "학생회관 앞"},
            {"라면 박스 나눠요", "농심 신라면 40봉지 박스 나눔 공구", "18000", "40", "기숙사 편의점 앞"},
            {"생수 2L 공동구매", "생수 12병 묶음, 물 무거워서 나눠 들어요", "9600", "12", "기숙사 1층"},
            {"과제용 프린터 잉크 공구", "토너 카트리지 대용량 3개 공구", "36000", "3", "정보관 앞"},
            {"핫팩 공동구매", "겨울 핫팩 100개입 나눔", "12000", "100", "기숙사 2층 라운지"}
    };

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Operation(summary = "[DEV ONLY] 더미 유저 3명 + 게시글 6개(각 2개씩) 생성",
            description = "혼자 테스트할 때 채팅 상대/다른 사람 프로필/다른 사람 글을 보기 위한 용도. 응답의 accessToken으로 그 더미유저인 척 API를 호출할 수 있음.")
    @PostMapping
    @Transactional
    public ResponseEntity<CommonResDto<DevSeedResDto>> seed() {
        List<DevSeedResDto.DevSeedUserDto> userDtos = new ArrayList<>();
        List<User> users = new ArrayList<>();

        for (int i = 0; i < DUMMY_NICKNAMES.length; i++) {
            String kakaoId = "dev-dummy-" + (i + 1);
            String nickname = DUMMY_NICKNAMES[i]; // 람다 안에서 쓰려면 effectively final 이어야 해서 루프변수 i 대신 이걸로 캡처

            User user = userRepository.findByKakaoId(kakaoId)
                    .orElseGet(() -> userRepository.save(
                            User.builder()
                                    .kakaoId(kakaoId)
                                    .nickName(nickname)
                                    .email(kakaoId + "@dev.local")
                                    .build()
                    ));
            if (!user.isSchoolVerified()) {
                user.markSchoolVerified(); // 더미 유저는 바로 글쓰기/참여 가능하게
            }
            users.add(user);

            String accessToken = jwtTokenProvider.createAccessToken(user.getId().toString(), user.getRole());
            userDtos.add(DevSeedResDto.DevSeedUserDto.builder()
                    .userId(user.getId())
                    .nickname(user.getNickName())
                    .accessToken(accessToken)
                    .build());
        }

        List<DevSeedResDto.DevSeedBoardDto> boardDtos = new ArrayList<>();
        for (int i = 0; i < DUMMY_BOARDS.length; i++) {
            User author = users.get(i % users.size()); // 유저당 2개씩 돌아가며 배정
            String[] b = DUMMY_BOARDS[i];

            Board board = Board.builder()
                    .title(b[0])
                    .content(b[1])
                    .totalPrice(Integer.parseInt(b[2]))
                    .totalQuantity(Integer.parseInt(b[3]))
                    .location(b[4])
                    .category(BoardCategory.GROUP)
                    .status(BoardStatus.IN_PROGRESS)
                    .user(author)
                    .build();
            Board saved = boardRepository.save(board);

            boardDtos.add(DevSeedResDto.DevSeedBoardDto.builder()
                    .boardId(saved.getId())
                    .title(saved.getTitle())
                    .authorNickname(author.getNickName())
                    .build());
        }

        DevSeedResDto result = DevSeedResDto.builder()
                .users(userDtos)
                .boards(boardDtos)
                .build();

        return new ResponseEntity<>(new CommonResDto<>("더미 유저 3명 + 게시글 6개 생성 완료", result), HttpStatus.OK);
    }
}
