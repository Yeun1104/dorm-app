import { ReactNode, useEffect, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import { reservationApi } from '../../api/trade';
import type { Board, Reservation } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { boardProgress, BoardStatusChip } from '../../components/BoardCard';
import { useConfirm, useToast } from '../../components/Feedback';
import SaleCompleteSheet from '../../components/SaleCompleteSheet';
import Icon from '../../components/Icon';
import { Avatar, BottomSheet, Button, CountBadge, ErrorView, LoadingView, ProgressBar, Thumb } from '../../components/ui';
import { invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { timeAgo, won } from '../../utils/format';
import { recentBoards } from '../../utils/recentBoards';

const SCREEN_W = Dimensions.get('window').width;

export const isMyBoard = (board: Pick<Board, 'authorId'>, me: { userId: number }) => board.authorId === me.userId;

/** 같은 글에 여러 번 요청했을 수 있으니(거절 후 재요청 등) 가장 최근 것 */
const latestFor = (list: Reservation[], boardId: number) =>
  list.filter((r) => r.boardId === boardId).sort((a, b) => b.id - a.id)[0] ?? null;

export default function BoardDetailScreen({ navigation, route }: ScreenProps<'BoardDetail'>) {
  const { boardId } = route.params;
  const me = useMe();
  const toast = useToast();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();

  const { data, setData, error, loading, reload, silentReload } = useFetch(
    async () => {
      const board = await boardApi.detail(boardId);
      const mine = isMyBoard(board, me);
      const myReservation = mine ? null : latestFor(await reservationApi.mine(), boardId);
      return { board, mine, myReservation };
    },
    [boardId],
    { refetchOnFocus: true },
  );

  const [sheet, setSheet] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [saleSheet, setSaleSheet] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const toggleLike = useLikeToggle((patch) => setData((d) => (d ? { ...d, board: { ...d.board, ...patch } } : d)));

  const loadedBoard = data?.board;
  useEffect(() => {
    if (loadedBoard) recentBoards.add(loadedBoard).catch(() => {});
  }, [loadedBoard?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <LoadingView />;
  if (error || !data) return <ErrorView message={error ?? '게시글을 불러오지 못했어요'} onRetry={reload} />;

  const { board, mine, myReservation } = data;
  const minQty = board.minPurchaseQuantity ?? 1;
  const collected = board.totalQuantity - board.remainingQuantity;
  const progress = boardProgress(board);
  const recruiting = board.status === 'IN_PROGRESS' && board.remainingQuantity > 0;

  const openSheet = () => {
    setQuantity(Math.min(Math.max(minQty, 1), board.remainingQuantity));
    setSheet(true);
  };

  const sendRequest = async () => {
    setBusy(true);
    try {
      const r = await reservationApi.create(boardId, quantity);
      setData({ ...data, myReservation: r });
      setSheet(false);
      toast('참여 요청을 보냈어요');
      invalidateBoard(boardId);
      silentReload();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!myReservation) return;
    const ok = await confirm({ title: '참여 요청을 취소할까요?', confirmText: '요청 취소', danger: true });
    if (!ok) return;
    try {
      await reservationApi.withdraw(myReservation.id);
      toast('참여 요청을 취소했어요');
    } catch (e) {
      // 방장이 그 사이 수락/거절한 경우(레이스) → 최신 상태로 갱신
      toast(errorMessage(e));
    }
    reload();
  };

  const toggleBoardStatus = async () => {
    const next = board.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
    try {
      const updated = await boardApi.updateStatus(boardId, next);
      setData({ ...data, board: updated });
      invalidateBoard(boardId);
      toast(next === 'COMPLETED' ? '모집완료로 변경했어요' : '다시 모집을 시작했어요');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const deleteBoard = async () => {
    setMenu(false);
    const ok = await confirm({ title: '게시글을 삭제할까요?', message: '삭제하면 되돌릴 수 없어요.', confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      await boardApi.remove(boardId);
      invalidateBoard(boardId);
      toast('게시글을 삭제했어요');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const openAuthorProfile = () => navigation.navigate('UserProfile', { userId: board.authorId });

  // ───────── 하단 액션바 ─────────
  let bottom: ReactNode;
  if (mine) {
    bottom = (
      <View style={styles.ownerActions}>
        <Button
          label={board.status === 'IN_PROGRESS' ? '판매완료' : '다시 모집'}
          variant="soft"
          onPress={board.status === 'IN_PROGRESS' ? () => setSaleSheet(true) : toggleBoardStatus}
          style={{ flex: 1 }}
        />
        <View style={{ flex: 2 }}>
          <Button label="참여 요청 관리" onPress={() => navigation.navigate('ReservationManage', { boardId })} />
          <CountBadge count={board.waitingCount} style={{ top: -6, right: -4 }} />
        </View>
      </View>
    );
  } else if (myReservation?.status === 'PENDING') {
    bottom = (
      <View style={styles.pendingAction}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pendingTitle}>참여 요청을 보냈어요. 방장의 수락을 기다리는 중이에요</Text>
          <Text style={styles.pendingSub}>{myReservation.quantity}개 · {won(myReservation.subtotal)}</Text>
        </View>
        <Pressable style={styles.pendingBtn} onPress={withdraw}>
          <Text style={styles.pendingBtnText}>요청 취소</Text>
        </Pressable>
      </View>
    );
  } else if (myReservation && (myReservation.status === 'ACCEPTED' || myReservation.status === 'COMPLETED')) {
    const done = myReservation.status === 'COMPLETED';
    bottom = (
      <>
        <View style={styles.actionPrice}>
          <Text style={styles.actionPriceLabel}>{done ? '거래가 완료됐어요' : '참여가 수락됐어요'}</Text>
          <Text style={styles.actionPriceValue}>{myReservation.quantity}개 · {won(myReservation.subtotal)}</Text>
        </View>
        {myReservation.chatRoomId != null && (
          <Button label="채팅방으로 이동" onPress={() => navigation.navigate('ChatRoom', { roomId: myReservation.chatRoomId! })} style={{ flex: 1.3 }} />
        )}
      </>
    );
  } else {
    // 요청 전 / 거절됨 / 취소됨 → 다시 참여 가능
    bottom = (
      <View style={{ flex: 1 }}>
        {myReservation?.status === 'REJECTED' && <Text style={styles.rejected}>아쉽게도 참여가 거절됐어요</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <View style={styles.actionPrice}>
            <Text style={styles.actionPriceLabel}>개당 가격</Text>
            <Text style={styles.actionPriceValue}>{won(board.unitPrice)}</Text>
          </View>
          <Button label={recruiting ? '참여하기' : '모집이 마감됐어요'} onPress={openSheet} disabled={!recruiting} style={{ flex: 1.3 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 이미지 */}
        {board.images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            >
              {board.images.map((img) => (
                <Thumb key={img.id} uri={img.imageUrl} size={{ width: SCREEN_W, height: 310 }} radius={0} />
              ))}
            </ScrollView>
            {board.images.length > 1 && (
              <View style={styles.pager}>
                <Text style={styles.pagerText}>{imageIndex + 1} / {board.images.length}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ height: insets.top + 70 }} />
        )}

        <View style={styles.body}>
          <Pressable style={styles.authorRow} onPress={openAuthorProfile}>
            <Avatar name={board.authorNickname} />
            <Text style={[styles.authorName, { flex: 1 }]}>{board.authorNickname}{mine ? ' (나)' : ''}</Text>
            <Icon name="chevron" size={18} color={colors.textFaint} />
          </Pressable>

          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <BoardStatusChip status={board.status} large />
              <Text style={styles.title}>{board.title}</Text>
            </View>
            <Text style={styles.time}>{timeAgo(board.createdAt)}</Text>
          </View>

          <Text style={styles.description}>{board.content}</Text>

          <View style={styles.stats}>
            <Stat label="전체 금액" value={won(board.totalPrice)} />
            <Stat label="전체 수량" value={`${board.totalQuantity}개`} />
            <Stat label="개당 가격" value={won(board.unitPrice)} last />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressTitle}>
                {collected}개 모였어요 <Text style={styles.participants}>· {board.participantCount}명 참여</Text>
              </Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar ratio={progress} />
            <Text style={styles.progressHint}>
              {board.remainingQuantity > 0 ? `${board.remainingQuantity}개만 더 모이면 공동구매가 완료돼요` : '목표 수량이 모두 모였어요'}
            </Text>
            {board.waitingCount > 0 && <Text style={styles.waitingHint}>현재 {board.waitingCount}명 수락 대기중</Text>}
          </View>

          <View style={styles.infoList}>
            <InfoRow label="수령 장소" value={board.location || '채팅으로 협의'} />
            <InfoRow label="최소 구매 수량" value={`${minQty}개부터`} />
            {!!board.url && (
              <Pressable onPress={() => Linking.openURL(board.url!)}>
                <InfoRow label="상품 링크" value="열어보기" link />
              </Pressable>
            )}
          </View>

          {!mine && (
            <View style={styles.safeNote}>
              <Text style={styles.safeTitle}>안심하고 거래하세요</Text>
              <Text style={styles.safeText}>채팅은 방장이 참여 요청을 수락한 뒤 열려요.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 상단 오버레이 버튼 */}
      <View style={[styles.overlayHeader, { top: insets.top + 8 }]}>
        <Pressable style={styles.roundBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" color="white" />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* TODO: 공유 API 생기면 연결 */}
          <Pressable style={styles.roundBtn} onPress={() => toast('공유 기능은 준비 중이에요')}>
            <Icon name="share" color="white" />
          </Pressable>
          {mine && (
            <Pressable style={styles.roundBtn} onPress={() => setMenu((v) => !v)}>
              <Text style={{ color: 'white', fontWeight: '800', letterSpacing: 1 }}>•••</Text>
            </Pressable>
          )}
        </View>
      </View>
      {menu && (
        <View style={[styles.menu, { top: insets.top + 58 }]}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenu(false);
              navigation.navigate('BoardWrite', { boardId });
            }}
          >
            <Text style={{ color: colors.text, fontSize: font.md }}>게시글 수정</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={deleteBoard}>
            <Text style={{ color: colors.danger, fontSize: font.md }}>게시글 삭제</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
        <Pressable style={styles.likeBtn} onPress={() => toggleLike(board)} hitSlop={4}>
          <Icon name="heart" size={24} color={board.liked ? colors.heart : '#8d9692'} filled={board.liked} />
        </Pressable>
        {bottom}
      </View>

      {mine && (
        <SaleCompleteSheet
          board={board}
          visible={saleSheet}
          onClose={() => setSaleSheet(false)}
          onDone={(updated) => setData({ ...data, board: { ...board, ...updated } })}
        />
      )}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <Text style={styles.sheetTitle}>몇 개 참여할까요?</Text>
        <Text style={styles.sheetSub}>1인당 최소 {minQty}개부터 신청할 수 있어요. (남은 수량 {board.remainingQuantity}개)</Text>
        <View style={styles.qtyControl}>
          <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(minQty, q - 1))}>
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>
            {quantity}
            <Text style={{ fontSize: font.base }}>개</Text>
          </Text>
          <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.min(board.remainingQuantity, q + 1))}>
            <Text style={styles.qtyBtnText}>＋</Text>
          </Pressable>
        </View>
        <View style={styles.sheetTotal}>
          <Text style={{ fontSize: font.md, color: colors.textBody }}>예상 결제 금액</Text>
          <Text style={{ fontSize: font.md, fontWeight: '800' }}>{won(board.unitPrice * quantity)}</Text>
        </View>
        <Button label="참여 요청 보내기" onPress={sendRequest} loading={busy} />
      </BottomSheet>
    </View>
  );
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, link && { color: colors.primaryDark, textDecorationLine: 'underline' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { position: 'absolute', right: 14, bottom: 14, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(10,22,18,0.45)' },
  pagerText: { color: 'white', fontSize: font.xs, fontWeight: '600' },
  body: { paddingHorizontal: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: '#eef1ef' },
  authorName: { fontSize: font.base, fontWeight: '700', color: colors.text },
  titleWrap: { paddingTop: 22, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  title: { flexShrink: 1, fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  time: { marginTop: 7, color: '#9aa29f', fontSize: font.xs },
  description: { fontSize: font.base, lineHeight: 24, color: colors.textBody },
  stats: { flexDirection: 'row', marginVertical: 22, paddingVertical: 15, paddingHorizontal: 8, borderRadius: 15, backgroundColor: '#f5f8f6' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { borderRightWidth: 1, borderRightColor: '#dfe6e2' },
  statLabel: { color: '#88928e', fontSize: font.xs },
  statValue: { fontSize: font.md, fontWeight: '700', color: colors.text },
  progressCard: { padding: 18, borderWidth: 1, borderColor: '#d8e8ed', borderRadius: 17 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  participants: { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  progressPct: { fontSize: font.base, fontWeight: '700', color: colors.primaryDark },
  progressHint: { marginTop: 8, color: '#84908b', fontSize: font.xs },
  waitingHint: { marginTop: 4, color: '#e2763f', fontSize: font.xs, fontWeight: '700' },
  infoList: { marginTop: 14, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 16, overflow: 'hidden' },
  infoRow: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { color: '#89928f', fontSize: font.sm },
  infoValue: { color: colors.text, fontSize: font.sm, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  safeNote: { marginTop: 14, padding: 15, borderRadius: 14, backgroundColor: '#fff9e9' },
  safeTitle: { fontSize: font.sm, fontWeight: '700', color: '#9b751d' },
  safeText: { marginTop: 3, color: '#95865f', fontSize: font.xs },

  overlayHeader: { position: 'absolute', left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(10,22,18,0.38)', alignItems: 'center', justifyContent: 'center' },
  menu: { position: 'absolute', right: 15, width: 130, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e1e7e9', backgroundColor: 'white', elevation: 6, shadowColor: '#1f414e', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  menuItem: { paddingHorizontal: 10, paddingVertical: 11 },

  bottomAction: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 13, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e8ecea' },
  likeBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  ownerActions: { flex: 1, flexDirection: 'row', gap: 10 },
  actionPrice: { flex: 1 },
  actionPriceLabel: { fontSize: font.xs, color: '#8d9692' },
  actionPriceValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  pendingAction: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  pendingTitle: { fontSize: font.md, fontWeight: '700', color: '#357c99' },
  pendingSub: { marginTop: 2, color: '#84908b', fontSize: font.xs },
  pendingBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: '#f0f3f2' },
  pendingBtnText: { color: '#68736f', fontSize: font.sm, fontWeight: '600' },
  rejected: { marginBottom: 8, color: colors.warning, fontSize: font.sm, fontWeight: '700' },

  sheetTitle: { fontSize: 21, fontWeight: '800', color: colors.text, marginBottom: 5 },
  sheetSub: { color: '#858f8b', fontSize: font.sm },
  qtyControl: { marginVertical: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 34 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#dfe6e3', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, color: colors.text },
  qtyValue: { minWidth: 60, textAlign: 'center', fontSize: 30, fontWeight: '800', color: colors.text },
  sheetTotal: { marginBottom: 15, padding: 15, borderRadius: 13, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f3f7f5' },
});
