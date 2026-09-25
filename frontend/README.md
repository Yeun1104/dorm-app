# 숭팔이 앱 (React Native / Expo)

숭실대 기숙사생 공동구매 + 기숙사생활 앱. Expo SDK 57 · React Navigation 7 · axios · STOMP.

## 실행

```bash
# Node 22.13+ 필요 (SDK 57 / RN 0.86 요구사항)
cd frontend
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL 을 백엔드 주소로
npx expo start               # Expo Go 앱으로 QR 스캔
```

- 실기기에서는 `localhost` 대신 PC의 LAN IP를 써야 함 (`http://192.168.x.x:8080`).
- `EXPO_PUBLIC_DEV_LOGIN=true`면 로그인 화면에 **개발용 로그인** 버튼이 생김 → 백엔드 `/api/dev/auth/token` 사용 (카카오 없이 테스트 가능, 닉네임만 바꾸면 여러 계정으로 방장/구매자 시나리오 테스트 가능).

## 백엔드 쪽에서 맞춰야 하는 설정

| 항목 | 값 | 이유 |
|---|---|---|
| `APP_REDIRECT_URI` | 개발빌드 `soongpal://auth` / Expo Go `exp://<IP>:8081/--/auth` | 카카오 로그인 성공 후 백엔드가 이 주소로 `?access_token=` 또는 `/auth/signup?temp_token=` 을 붙여 리다이렉트 → 앱이 `WebBrowser.openAuthSessionAsync`로 받음 |
| `app.feature.dev-tools.enabled` | 로컬 `true` | 개발용 로그인 |

## 구조

```
App.tsx                     Provider 조립 (SafeArea → Auth → Toast/Confirm → Navigator)
src/
  config.ts                 API/WS 주소 (.env)
  api/
    client.ts               axios 인스턴스 — Bearer 자동 첨부, 401/403 시 /api/auth/refresh 1회 후 재요청,
                            { statusMessage, result } 언래핑, { errorMessage } → ApiError
    types.ts                백엔드 DTO 1:1 타입
    board.ts trade.ts user.ts dorm.ts   도메인별 엔드포인트
  auth/AuthContext.tsx      카카오 OAuth / 회원가입 / 개발용 로그인 / 로그아웃 / 기숙사 연동 상태
  chat/useChatSocket.ts     STOMP: /ws/chat/websocket, 구독 /topic/{roomId}, 발행 /send/{roomId}
  navigation/               하단 탭 4개 + 탭마다 네이티브 스택 (게시글 상세·채팅방·프로필·신고는 모든 스택에 공유 등록)
  components/               Figma 시안 컴포넌트 (Icon, 헤더, 바텀시트, 확인 다이얼로그, 토스트, 캘린더 …)
  screens/{auth,home,chat,common,dorm,my}
  theme/                    시안 CSS에서 뽑은 색/반경 토큰
```

## 화면 ↔ API

| 화면 | API |
|---|---|
| 홈 | `GET /api/board?page=&keyword=&status=` · 좋아요 `POST/DELETE /api/board/{id}/like` |
| 글쓰기 | `POST /api/board` (multipart: `board` JSON 파트 + `images`) |
| 게시글 상세 | `GET /api/board/{id}` · `GET /api/reservations/mine` · `POST /api/board/{id}/reservations` · `DELETE /api/reservations/{id}` · `PATCH /api/board/{id}/status` |
| 참여 요청 관리 | `GET /api/board/{id}/reservations` · `PATCH /api/reservations/{id}/status` |
| 채팅 목록 / 채팅방 | `GET /api/chat/rooms` · `GET /api/chat/rooms/{id}` · `GET /api/chat/messages?roomId=&page=` · STOMP · `DELETE /api/chat/rooms/{id}/leave` |
| 매너 평가 | `GET /api/manner-keywords` · `POST /api/reservations/{id}/manner-review` |
| 프로필 / 마이페이지 | `GET /api/users/{id}/profile` · `GET /api/users/me` · `GET /api/my-page/like` · `GET /api/my-page/posts` |
| 신고 | `POST /api/reports` |
| 기숙사생활 | `/api/dorm/account(/verify)` · `/api/dorm/outing/**` · `/api/dorm/long-term-absence/**` · `/api/dorm/repair/**` · `/api/dorm/notice/**` · `/api/dorm/inquiry/**` · `/api/dorm/spoint` · `/api/dorm/ipsa/**` · `/api/dorm/food-menu` |

## 알려진 백엔드 이슈 / 프론트 우회

- **일반문의 비밀글 플래그가 저장 안 됨** — `InquiryCreateReqDto`/`InquiryUpdateReqDto`의 `private boolean isSecret` + Lombok `@Getter`만으로는 Jackson이 JSON `isSecret`(또는 `secret`)을 바인딩하지 못해 항상 `false`. (Jackson 2.17로 재현 확인) 필드에 `@JsonProperty("isSecret")` 추가 필요. 프론트는 `isSecret` 키로 보냄.
- **`BoardResDto`에 `authorId` 없음** — 작성자 판별은 닉네임(unique)으로 하고 있고, 게시글 상세에서 작성자 프로필로 이동이 불가. `authorId`를 추가하면 프론트는 코드 수정 없이 자동으로 켜짐(`Board.authorId?`).
- **채팅 안읽음 수 / 메시지 ID 없음** — `ChatRoomResDto`에 unreadCount, `ChatMessageResDto`에 id가 없어서 목록의 빨간 뱃지와 `PATCH /api/chat/rooms/{id}/read` 읽음 처리를 못 붙임.
- **STOMP 인증** — 서버에 `ChannelInterceptor`가 없어 발신자 식별이 WebSocket 핸드셰이크의 `Authorization` 헤더에 의존. 앱은 RN WebSocket 헤더로 토큰을 실어 보내지만, 실제 연결에서 senderId가 제대로 찍히는지 확인 필요. 안 되면 CONNECT 프레임 헤더를 읽는 인터셉터 추가 권장.
- **리프레시 토큰** — 카카오 로그인 시 refreshToken 쿠키는 인앱 브라우저에 저장되어 앱 axios에는 없음 → 액세스 토큰 만료(1시간) 시 재로그인 필요. 모바일용으로 refreshToken을 응답 바디/리다이렉트 파라미터로 주는 방식 검토 필요.
- **기숙사 계정 연동 해제 API 없음**, 연동 상태 조회 API 없음(→ `verify`로 대체, 세션당 1회).
- 기숙사 게시판의 "본인 글" 판별은 상세 `writer` == 폼 기본값 `writerName` 비교. 사이트가 이름을 마스킹해서 내려주면 수정/삭제 버튼이 안 보일 수 있음.
- `ReportCreateReqDto.reason`이 `@NotBlank`라 신고 사유 입력은 필수로 처리.
