import { ReactNode, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import { reservationApi } from '../../api/trade';
import type { Reservation, ReservationStatus } from '../../api/types';
import { userApi } from '../../api/user';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Avatar, ChipTone, EmptyState, ErrorView, LoadingView, PageHeader, Screen, SegmentedTabs, SubHeader, Thumb } from '../../components/ui';
import { invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import { useWebDragScroll } from '../../hooks/useWebDragScroll';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { won } from '../../utils/format';

type Tab = 'PENDING' | 'ACCEPTED' | 'REJECTED';

const TAB_OF: Record<ReservationStatus, Tab> = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'ACCEPTED',
  CANCELLED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

export const STATUS_TONE: Record<ReservationStatus, ChipTone> = {
  PENDING: 'pending',
  ACCEPTED: 'primary',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'neutral',
};

/** 하단 '요청' 탭 루트: 내 모든 모집중 글의 요청을 게시글 선택 후 관리 */
export function RequestsScreen(props: ScreenProps<'Requests'>) {
  return <ReservationManageScreen {...(props as unknown as ScreenProps<'ReservationManage'>)} asTab />;
}

type Selection = 'ALL' | number;

/**
 * 참여 요청 관리
 * - 위: 대기중/수락됨/거절됨 탭 (고정)
 * - 목록 머리: [전체] + 내 모집중 글 카드를 옆으로 넘기며(스냅) 고름. 처음엔 '전체'(모든 글의 요청)
 * - boardId로 들어오면(알림·내가 쓴 글의 '참여 요청 관리') 그 글 하나의 요청 목록만
 */
export default function ReservationManageScreen({ navigation, route, asTab }: ScreenProps<'ReservationManage'> & { asTab?: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('PENDING');
  const paramId = route.params?.boardId ?? null;
  const [selected, setSelected] = useState<Selection>(paramId ?? 'ALL');

  // 탭: 내 모집중 글 전체 + 각 글의 요청 / 특정 글로 들어오면: 그 글 하나 (들어올 때마다 새로)
  const all = useFetch(
    async () => {
      const boards =
        paramId != null ? [await boardApi.detail(paramId)] : (await userApi.myBoards(0)).boards.filter((b) => b.status === 'IN_PROGRESS');
      const lists = await Promise.all(boards.map((b) => reservationApi.listByBoard(b.id)));
      return { boards, reservations: lists.flat() };
    },
    [paramId],
    { refetchOnFocus: true },
  );
  const boards = all.data?.boards ?? [];
  const boardTitle = useMemo(() => new Map(boards.map((b) => [b.id, b.title])), [boards]);

  const inSelection = (all.data?.reservations ?? []).filter((r) => selected === 'ALL' || r.boardId === selected);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
    inSelection.forEach((r) => c[TAB_OF[r.status]]++);
    return c;
  }, [inSelection]);
  const visible = inSelection.filter((r) => TAB_OF[r.status] === tab).sort((a, b) => b.id - a.id);

  const applyUpdate = (updated: Reservation) => {
    all.setData((d) =>
      d
        ? {
            ...d,
            reservations: d.reservations.map((r) =>
              r.id === updated.id ? { ...r, ...updated, buyerTradeCount: r.buyerTradeCount, buyerNoShowReportCount: r.buyerNoShowReportCount } : r,
            ),
          }
        : d,
    );
    invalidateBoard(updated.boardId);
    all.silentReload();
  };

  const accept = async (r: Reservation) => {
    const ok = await confirm({
      title: '정말 수락하시겠어요?',
      message: `${r.buyerNickname}님 · ${r.quantity}개\n수락하면 수량이 차감되고 채팅방이 열려요`,
      confirmText: '수락하기',
    });
    if (!ok) return;
    try {
      const updated = await reservationApi.updateStatus(r.id, 'ACCEPTED');
      applyUpdate(updated);
      // 수락하면 안내 없이 바로 그 채팅방으로
      if (updated.chatRoomId != null) navigation.navigate('ChatRoom', { roomId: updated.chatRoomId });
    } catch (e) {
      toast(errorMessage(e));
      all.reload();
    }
  };

  const reject = async (r: Reservation) => {
    try {
      applyUpdate(await reservationApi.updateStatus(r.id, 'REJECTED'));
      toast('참여 요청을 거절했어요');
    } catch (e) {
      toast(errorMessage(e));
      all.reload();
    }
  };

  // ───── 게시글 카드 캐러셀 ─────
  const cardW = width - 36 - 34; // 다음 카드가 살짝 보이게
  const interval = cardW + CARD_GAP;
  const pages: Selection[] = ['ALL', ...boards.map((b) => b.id)];
  const carousel = useRef<FlatList<Selection>>(null);
  const drag = useWebDragScroll({
    scrollTo: (x, animated) => carousel.current?.scrollToOffset({ offset: x, animated }),
    snap: interval,
    count: pages.length,
    onSettle: (i) => setSelected(pages[i]),
  });
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectIndex = (i: number) => {
    setSelected(pages[i]);
    carousel.current?.scrollToOffset({ offset: i * interval, animated: true });
  };

  // 특정 글로 들어온 경우: 그 글 카드만 (넘기기 없음)
  const single = paramId != null ? boards[0] : null;
  const renderSingle = () =>
    single && (
      <Pressable style={[styles.pickCard, { marginBottom: 6 }]} onPress={() => navigation.navigate('BoardDetail', { boardId: single.id })}>
        <Thumb uri={single.images[0]?.imageUrl} size={52} radius={12} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.pickTitle} numberOfLines={1}>{single.title}</Text>
          <Text style={styles.pickMeta} numberOfLines={1}>
            대기 {single.waitingCount}건 · {single.remainingQuantity}개 남음 · {won(single.unitPrice)}
          </Text>
        </View>
        <Icon name="chevron" size={17} color={colors.textFaint} />
      </Pressable>
    );

  const renderCarousel = () => (
    <View style={{ marginBottom: 6 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>내 공동구매</Text>
        <Pressable style={styles.sectionLink} onPress={() => navigation.navigate('MyPosts')} hitSlop={8}>
          <Text style={styles.sectionLinkText}>게시글 목록</Text>
          <Icon name="chevron" size={13} color={colors.textMuted} />
        </Pressable>
      </View>
      <View {...drag.panHandlers} style={drag.style}>
      <FlatList
        ref={carousel}
        horizontal
        data={pages}
        keyExtractor={(p) => String(p)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18, gap: CARD_GAP }}
        initialScrollIndex={Math.max(0, pages.indexOf(selected))}
        getItemLayout={(_, i) => ({ length: interval, offset: interval * i, index: i })}
        // 스크롤이 멈추면 가운데 온 카드를 선택 (웹은 momentum 이벤트가 없어서 onScroll + 잠깐 대기로 판단)
        scrollEventThrottle={50}
        onScroll={(e) => {
          drag.onScroll(e);
          const x = e.nativeEvent.contentOffset.x;
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => {
            const i = Math.max(0, Math.min(pages.length - 1, Math.round(x / interval)));
            setSelected((cur) => (pages[i] !== cur ? pages[i] : cur));
          }, 160);
        }}
        renderItem={({ item, index }) => {
          const active = item === selected;
          if (item === 'ALL') {
            const waiting = (all.data?.reservations ?? []).filter((r) => r.status === 'PENDING').length;
            return (
              <Pressable style={[styles.pickCard, { width: cardW }, active && styles.pickCardActive]} onPress={() => selectIndex(index)}>
                <View style={styles.allIcon}>
                  <Icon name="inbox" size={22} color={colors.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pickTitle}>전체 요청</Text>
                  <Text style={styles.pickMeta}>게시글 {boards.length}개 · 대기 {waiting}건</Text>
                </View>
              </Pressable>
            );
          }
          const b = boards.find((x) => x.id === item)!;
          return (
            <Pressable style={[styles.pickCard, { width: cardW }, active && styles.pickCardActive]} onPress={() => selectIndex(index)}>
              <Thumb uri={b.images[0]?.imageUrl} size={52} radius={12} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pickTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.pickMeta} numberOfLines={1}>
                  대기 {b.waitingCount}건 · {b.remainingQuantity}개 남음 · {won(b.unitPrice)}
                </Text>
              </View>
              <Pressable onPress={() => navigation.navigate('BoardDetail', { boardId: b.id })} hitSlop={8} accessibilityLabel="게시글 보기">
                <Icon name="chevron" size={17} color={colors.textFaint} />
              </Pressable>
            </Pressable>
          );
        }}
      />
      </View>
      {pages.length > 1 && (
        <View style={styles.dots}>
          {pages.map((p) => (
            <View key={String(p)} style={[styles.dotItem, p === selected && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );

  let body: ReactNode;
  if (all.loading && !all.data) body = <LoadingView />;
  else if (all.error && !all.data) body = <ErrorView message={all.error} onRetry={all.reload} />;
  else if (!boards.length) body = <EmptyState icon="doc" title="모집 중인 내 공동구매가 없어요" message="글을 올리면 참여 요청을 여기서 관리할 수 있어요." />;
  else
    body = (
      <FlatList
        showsVerticalScrollIndicator={false}
        data={visible}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={all.refreshing} onRefresh={all.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={single ? renderSingle() : renderCarousel()}
        ListEmptyComponent={<EmptyState title={`${{ PENDING: '대기중인', ACCEPTED: '수락된', REJECTED: '거절된' }[tab]} 요청이 없어요`} message="새로운 요청이 오면 여기에 표시돼요." />}
        renderItem={({ item }) => (
          <RequestCard
            r={item}
            boardTitle={selected === 'ALL' ? boardTitle.get(item.boardId) : undefined}
            onProfile={() => navigation.navigate('UserProfile', { userId: item.buyerId })}
            onAccept={() => accept(item)}
            onReject={() => reject(item)}
            onChat={item.chatRoomId != null ? () => navigation.navigate('ChatRoom', { roomId: item.chatRoomId! }) : undefined}
          />
        )}
      />
    );

  return (
    <Screen bg={colors.bgSub}>
      {asTab ? (
        <PageHeader title="참여 요청 관리" />
      ) : (
        <SubHeader title="참여 요청 관리" subtitle="내 게시글에 도착한 참여 요청이에요" />
      )}
      <SegmentedTabs
        tabs={[
          { value: 'PENDING', label: '대기중' },
          { value: 'ACCEPTED', label: '수락됨' },
          { value: 'REJECTED', label: '거절됨' },
        ]}
        value={tab}
        onChange={setTab}
        badges={{ PENDING: counts.PENDING }}
      />
      {body}
    </Screen>
  );
}

const CARD_GAP = 10;

/** 수락됨 탭의 끝난 요청 안내 (칩 대신 문장으로 — 버튼처럼 보이지 않게) */
const DONE_NOTE: Partial<Record<ReservationStatus, string>> = {
  COMPLETED: '거래완료된 요청이에요',
  CANCELLED: '거래가 취소된 요청이에요',
  REJECTED: '거절한 요청이에요',
};

function RequestCard({
  r,
  boardTitle,
  onProfile,
  onAccept,
  onReject,
  onChat,
}: {
  r: Reservation;
  /** '전체'에서 볼 때 어느 글의 요청인지 */
  boardTitle?: string;
  onProfile: () => void;
  onAccept: () => void;
  onReject: () => void;
  onChat?: () => void;
}) {
  const noShow = r.buyerNoShowReportCount ?? 0;
  return (
    <View style={styles.card}>
      {!!boardTitle && (
        <Text style={styles.cardBoard} numberOfLines={1}>
          {boardTitle}
        </Text>
      )}
      <Pressable style={styles.person} onPress={onProfile}>
        <Avatar name={r.buyerNickname} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{r.buyerNickname}</Text>
          <Text style={styles.meta}>
            거래횟수 {r.buyerTradeCount ?? 0}회 ·{' '}
            <Text style={noShow > 0 ? styles.warning : undefined}>노쇼 신고이력 {noShow}건</Text>
          </Text>
        </View>
      </Pressable>
      {noShow > 0 && r.status === 'PENDING' && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>노쇼 신고 이력이 있는 신청자예요. 신중하게 판단해주세요.</Text>
        </View>
      )}
      <View style={styles.qty}>
        <Text style={styles.qtyLabel}>신청 수량</Text>
        <Text style={styles.qtyValue}>{r.quantity}개</Text>
        <Text style={styles.qtyLabel}>소계 {won(r.subtotal)}</Text>
      </View>
      {r.status === 'PENDING' && (
        <>
          <View style={styles.actions}>
            <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={onReject}>
              <Text style={styles.actionText}>거절</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { flex: 2, backgroundColor: colors.primary }]} onPress={onAccept}>
              <Text style={[styles.actionText, { color: 'white' }]}>수락하기</Text>
            </Pressable>
          </View>
          <Text style={styles.rejectNote}>거절은 확인 없이 바로 처리되며 되돌릴 수 없어요</Text>
        </>
      )}
      {!!DONE_NOTE[r.status] && <Text style={styles.doneNote}>{DONE_NOTE[r.status]}</Text>}
      {r.status === 'ACCEPTED' && onChat && (
        <Pressable style={styles.chatBtn} onPress={onChat}>
          <Text style={styles.chatText}>채팅방으로 이동</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: font.base, fontWeight: '800', color: colors.text },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLinkText: { fontSize: font.xs, color: colors.textMuted },
  pickCard: { minHeight: 76, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: '#e6ebe9', backgroundColor: 'white' },
  pickCardActive: { borderColor: colors.text },
  allIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#f1f3f2', alignItems: 'center', justifyContent: 'center' },
  pickTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  pickMeta: { marginTop: 4, fontSize: font.xs, color: colors.textMuted },
  dots: { marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dotItem: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d5dbd9' },
  dotActive: { width: 14, backgroundColor: colors.text },
  cardBoard: { marginBottom: 10, fontSize: font.xs, fontWeight: '600', color: colors.textMuted },
  doneNote: { marginTop: 2, fontSize: font.sm, color: colors.textMuted },
  card: { marginTop: 12, padding: 16, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 18, backgroundColor: 'white' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text },
  meta: { marginTop: 2, color: '#89938f', fontSize: font.xs },
  warning: { color: colors.warning, fontWeight: '700' },
  warnBox: { marginTop: 10, padding: 9, borderRadius: 9, backgroundColor: colors.warningSoft },
  warnText: { color: colors.warning, fontSize: font.xs, fontWeight: '600' },
  qty: { marginTop: 14, marginBottom: 11, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, backgroundColor: '#f5f7f6' },
  qtyLabel: { fontSize: font.xs, color: '#78837f' },
  qtyValue: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { height: 42, borderRadius: 11, backgroundColor: '#eef2f0', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: font.md, fontWeight: '700', color: '#67726e' },
  rejectNote: { marginTop: 7, fontSize: 10.5, color: colors.textFaint },
  chatBtn: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#badde7', backgroundColor: '#eef7f9', alignItems: 'center', justifyContent: 'center' },
  chatText: { color: colors.primaryDark, fontSize: font.sm, fontWeight: '700' },
});
