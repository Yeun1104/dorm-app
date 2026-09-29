import { useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, PanResponder, Platform } from 'react-native';

/**
 * 웹에서 가로 스크롤 영역을 마우스로 끌어 넘길 수 있게 함 (브라우저는 마우스 드래그로 스크롤이 안 됨).
 * 앱(터치)은 원래 스크롤이 되므로 아무것도 안 함.
 * - scrollTo: 해당 x로 스크롤 (FlatList면 scrollToOffset, ScrollView면 scrollTo)
 * - snap: 한 칸 너비를 주면 놓았을 때 가장 가까운 칸으로 맞추고 onSettle(칸 번호) 호출
 * 반환한 panHandlers는 감싸는 View에, onScroll은 스크롤 영역에 연결
 */
export function useWebDragScroll({
  scrollTo,
  snap,
  count,
  onSettle,
}: {
  scrollTo: (x: number, animated: boolean) => void;
  snap?: number;
  count?: number;
  onSettle?: (index: number) => void;
}) {
  const x = useRef(0);
  const startX = useRef(0);
  const latest = useRef({ scrollTo, snap, count, onSettle });
  latest.current = { scrollTo, snap, count, onSettle };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // 가로로 확실히 끌 때만 가져감 (세로 스크롤·탭은 그대로)
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          startX.current = x.current;
        },
        onPanResponderMove: (_, g) => latest.current.scrollTo(Math.max(0, startX.current - g.dx), false),
        onPanResponderRelease: (_, g) => {
          const { snap: s, count: n, onSettle: settle, scrollTo: to } = latest.current;
          if (!s) return;
          // 조금만 끌어도 넘어가도록 이동 방향을 반영
          const raw = (startX.current - g.dx) / s;
          const dir = g.dx < -20 ? 0.4 : g.dx > 20 ? -0.4 : 0;
          const i = Math.max(0, Math.min((n ?? Infinity) - 1, Math.round(raw + dir)));
          to(i * s, true);
          settle?.(i);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const web = Platform.OS === 'web';
  return {
    panHandlers: web ? responder.panHandlers : {},
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      x.current = e.nativeEvent.contentOffset.x;
    },
    /** 웹에서 끄는 동안 글자가 선택되지 않도록 */
    style: web ? ({ userSelect: 'none', cursor: 'grab' } as object) : undefined,
  };
}
