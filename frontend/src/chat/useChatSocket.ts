import { Client, IMessage } from '@stomp/stompjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../api/tokenStorage';
import type { ChatMessage } from '../api/types';
import { WS_URL } from '../config';

/**
 * 백엔드 ChattingConfig 기준
 *  - 엔드포인트: /ws/chat (SockJS) → RN에서는 raw WebSocket 경로 /ws/chat/websocket 사용
 *  - 인증: CONNECT 프레임의 Authorization 헤더 (StompAuthInterceptor). 없거나 만료면 연결 거부
 *  - 구독: /topic/{roomId}
 *  - 발행: /send/{roomId}  body: { content }
 */
export function useChatSocket(roomId: number, onMessage: (msg: ChatMessage) => void) {
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // RN WebSocket 관련 권장 설정 (stompjs 문서 "React Native" 항목)
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      // (재)연결할 때마다 최신 토큰을 읽음 — 그 사이 axios 인터셉터가 토큰을 재발급했을 수 있음
      beforeConnect: async () => {
        const token = await tokenStorage.get();
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
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

    return () => {
      setConnected(false);
      client.deactivate();
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
