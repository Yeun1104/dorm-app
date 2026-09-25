import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import { reservationApi } from '../../api/trade';
import type { Board, Reservation, ReservationStatus } from '../../api/types';
import { userApi } from '../../api/user';
import { useConfirm, useToast } from '../../components/Feedback';
import { Avatar, Chip, ChipTone, CountBadge, EmptyState, ErrorView, LoadingView, PageHeader, Screen, SegmentedTabs, SubHeader, Thumb } from '../../components/ui';
import { RESERVATION_STATUS_LABEL } from '../../constants';
import { invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
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

export default function ReservationManageScreen({ navigation, route, asTab }: ScreenProps<'ReservationManage'> & { asTab?: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('PENDING');

  // boardId 없이 들어온 경우(알림/채팅탭 인박스): 내 모집중 글 목록에서 고름
  const myBoards = useFetch(
    async () => (await userApi.myBoards(0)).boards.filter((b) => b.status === 'IN_PROGRESS'),
    [],
    { enabled: route.params?.boardId == null, refetchOnFocus: true },
  );
  const [selectedId, setSelectedId] = useState<number | null>(route.params?.boardId ?? null);

  useEffect(() => {
    if (selectedId != null || !myBoards.data?.length) return;
    const withWaiting = myBoards.data.find((b) => b.waitingCount > 0);
    setSelectedId((withWaiting ?? myBoards.data[0]).id);
  }, [myBoards.data, selectedId]);

  const detail = useFetch(
    async () => {
      if (selectedId == null) return null;
      const [board, reservations] = await Promise.all([boardApi.detail(selectedId), reservationApi.listByBoard(selectedId)]);
      return { board, reservations };
    },
    [selectedId],
    { enabled: selectedId != null, refetchOnFocus: true },
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
    detail.data?.reservations.forEach((r) => c[TAB_OF[r.status]]++);
    return c;
  }, [detail.data]);

  const visible = (detail.data?.reservations ?? []).filter((r) => TAB_OF[r.status] === tab).sort((a, b) => b.id - a.id);

  const applyUpdate = (updated: Reservation) => {
    detail.setData((d) => (d ? { ...d, reservations: d.reservations.map((r) => (r.id === updated.id ? { ...r, ...updated, buyerTradeCount: r.buyerTradeCount, buyerNoShowReportCount: r.buyerNoShowReportCount } : r)) } : d));
    if (selectedId != null) invalidateBoard(selectedId);
    detail.silentReload();
    myBoards.silentReload();
  };

  const accept = async (r: Reservation) => {
    const ok = await confirm({
      title: '정말 수락하시겠어요?',
      message: `${r.buyerNickname}님 · ${r.quantity}개\n수락하면 수량이 차감되고 채팅방이 열려요`,
      confirmText: '수락하기',
    });
    if (!ok) return;
    try {
      applyUpdate(await reservationApi.updateStatus(r.id, 'ACCEPTED'));
      toast('수락했어요. 채팅방이 열렸습니다');
    } catch (e) {
      toast(errorMessage(e));
      detail.reload();
    }
  };

  const reject = async (r: Reservation) => {
    try {
      applyUpdate(await reservationApi.updateStatus(r.id, 'REJECTED'));
      toast('참여 요청을 거절했어요');
    } catch (e) {
      toast(errorMessage(e));
      detail.reload();
    }
  };

  const board = detail.data?.board;

  const renderBoardPicker = () =>
    route.params?.boardId == null && (myBoards.data?.length ?? 0) > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
        {myBoards.data!.map((b) => (
          <Pressable key={b.id} style={[styles.pickerItem, b.id === selectedId && styles.pickerItemActive]} onPress={() => setSelectedId(b.id)}>
            <Text style={[styles.pickerText, b.id === selectedId && { color: 'white' }]} numberOfLines={1}>{b.title}</Text>
            <CountBadge count={b.waitingCount} style={{ top: -6, right: -6 }} />
          </Pressable>
        ))}
      </ScrollView>
    ) : null;

  let body: ReactNode;
  if (route.params?.boardId == null && myBoards.loading) body = <LoadingView />;
  else if (route.params?.boardId == null && !myBoards.data?.length)
    body = <EmptyState icon="doc" title="모집 중인 내 공동구매가 없어요" message="글을 올리면 참여 요청을 여기서 관리할 수 있어요." />;
  else if (detail.loading && !detail.data) body = <LoadingView />;
  else if (detail.error && !detail.data) body = <ErrorView message={detail.error} onRetry={detail.reload} />;
  else
    body = (
      <FlatList
        data={visible}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={detail.refreshing} onRefresh={detail.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {board && <BoardHeader board={board} onPress={() => navigation.navigate('BoardDetail', { boardId: board.id })} />}
            <SafeNote />
          </>
        }
        ListEmptyComponent={<EmptyState title={`${{ PENDING: '대기중', ACCEPTED: '수락된', REJECTED: '거절된' }[tab]} 요청이 없어요`} message="새로운 요청이 오면 여기에 표시돼요." />}
        renderItem={({ item }) => (
          <RequestCard
            r={item}
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
      {renderBoardPicker()}
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

function BoardHeader({ board, onPress }: { board: Board; onPress: () => void }) {
  return (
    <Pressable style={styles.board} onPress={onPress}>
      <Thumb uri={board.images[0]?.imageUrl} size={54} radius={11} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.boardEyebrow}>진행 중인 공동구매</Text>
        <Text style={styles.boardTitle} numberOfLines={1}>{board.title}</Text>
        <Text style={styles.boardEyebrow}>{board.remainingQuantity}개 남음 · 개당 {won(board.unitPrice)}</Text>
      </View>
    </Pressable>
  );
}

function SafeNote() {
  return (
    <View style={styles.safeNote}>
      <Text style={styles.safeTitle}>안심하고 거래하세요</Text>
      <Text style={styles.safeText}>채팅은 방장이 참여 요청을 수락한 뒤 열려요.</Text>
    </View>
  );
}

function RequestCard({ r, onProfile, onAccept, onReject, onChat }: { r: Reservation; onProfile: () => void; onAccept: () => void; onReject: () => void; onChat?: () => void }) {
  const noShow = r.buyerNoShowReportCount ?? 0;
  return (
    <View style={styles.card}>
      <Pressable style={styles.person} onPress={onProfile}>
        <Avatar name={r.buyerNickname} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{r.buyerNickname}</Text>
          <Text style={styles.meta}>
            거래횟수 {r.buyerTradeCount ?? 0}회 ·{' '}
            <Text style={noShow > 0 ? styles.warning : undefined}>노쇼 신고이력 {noShow}건</Text>
          </Text>
        </View>
        <Chip label={RESERVATION_STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
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
      {r.status === 'ACCEPTED' && onChat && (
        <Pressable style={styles.chatBtn} onPress={onChat}>
          <Text style={styles.chatText}>채팅방으로 이동</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { paddingHorizontal: 18, paddingVertical: 12, gap: 8, backgroundColor: 'white' },
  pickerItem: { maxWidth: 180, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: '#e0e6e3', justifyContent: 'center' },
  pickerItemActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  pickerText: { fontSize: font.sm, color: '#77827e', fontWeight: '600' },
  board: { flexDirection: 'row', gap: 11, padding: 10, borderRadius: 15, backgroundColor: colors.primarySoft2 },
  boardEyebrow: { color: '#6e837a', fontSize: font.xs },
  boardTitle: { marginVertical: 2, fontSize: font.md, fontWeight: '700', color: colors.text },
  safeNote: { marginTop: 12, padding: 15, borderRadius: 14, backgroundColor: '#fff9e9' },
  safeTitle: { fontSize: font.sm, fontWeight: '700', color: '#9b751d' },
  safeText: { marginTop: 3, color: '#95865f', fontSize: font.xs },
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
