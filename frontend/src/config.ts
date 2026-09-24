// Expo는 EXPO_PUBLIC_ 접두사가 붙은 환경변수를 빌드 시점에 인라인해줌 (.env 참고)
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** SockJS 엔드포인트(/ws/chat)의 raw WebSocket 경로. RN에는 SockJS 클라이언트 대신 이걸 씀 */
export const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/chat/websocket`;

export const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_DEV_LOGIN === 'true';
