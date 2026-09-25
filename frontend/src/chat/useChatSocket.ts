import { Client, IMessage } from '@stomp/stompjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../api/tokenStorage';
import type { ChatMessage } from '../api/types';
import { WS_URL } from '../config';

/**
 * 백엔드 ChattingConfig 기준
 *  - 엔드포인트: /ws/chat (SockJS) → RN에서는 raw WebSocket 경로 /ws/chat/websocket 사용
 *  - 구독: /topic/{roomId}
 *  - 발행: /send/{roomId}  body: { content }
 *
 * ⚠️ 서버에 STOMP ChannelInterceptor가 없어서 CONNECT 헤더의 토큰은 읽지 않음.
 *    발신자 식별은 핸드셰이크 HTTP 요청의 Authorization 헤더(JwtAuthenticationFilter)에 의존하므로,
 *    RN WebSocket의 3번째 인자(headers)로 토큰을 핸드셰이크에 실어 보냄.
 */
export function useChatSocket(roomId: number, onMessage: (msg: ChatMessage) => void) {
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await tokenStorage.get();
      if (cancelled) return;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const client = new Client({
        webSocketFactory: () =>
          // RN 전용 시그니처: new WebSocket(url, protocols, { headers })
          new (WebSocket as unknown as new (url: string, protocols: string[], options: { headers: Record<string, string> }) => WebSocket)(
            WS_URL,
            ['v12.stomp', 'v11.stomp', 'v10.stomp'],
            { headers: authHeaders },
          ),
        connectHeaders: authHeaders,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        // RN WebSocket 관련 권장 설정 (stompjs 문서 "React Native" 항목)
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        onConnect: () => {
          setConnected(true);
          client.subscribe(`/topic/${roomId}`, (frame: IMessage) => {
            try {
              onMessageRef.current(JSON.parse(frame.body) as ChatMessage);
            } catch {
              // 파싱 불가한 프레임은 무시
            }
          });
        },
        onWebSocketClose: () => setConnected(false),
        onStompError: () => setConnected(false),
      });

      clientRef.current = client;
      client.activate();
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [roomId]);

  const send = useCallback(
    (content: string) => {
      const client = clientRef.current;
      if (!client?.connected) return false;
      client.publish({ destination: `/send/${roomId}`, body: JSON.stringify({ content }) });
      return true;
    },
    [roomId],
  );

  return { connected, send };
}
