import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { chatApi, reservationApi } from '../../api/trade';
import type { ChatMessage, Reservation } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { useChatSocket } from '../../chat/useChatSocket';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import MannerReviewSheet from '../../components/MannerReviewSheet';
import { Avatar, ErrorView, LoadingView, Screen, Thumb } from '../../components/ui';
import { RESERVATION_STATUS_LABEL } from '../../constants';
import { fetchBoardCached, invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { clockTime, parseServerDate, won } from '../../utils/format';
import { isMyBoard } from '../home/BoardDetailScreen';

export default function ChatRoomScreen({ navigation, route }: ScreenProps<'ChatRoom'>) {
  const { roomId } = route.params;
  const me = useMe();
  const toast = useToast();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();

  // 방 정보 + 연결된 게시글 + 이 방에 연결된 예약(수량/상태)
  const info = useFetch(
    async () => {
      const room = await chatApi.room(roomId);
      const board = await fetchBoardCached(room.productId, true);
      const seller = board ? isMyBoard(board, me) : false;
      const list = seller ? await reservationApi.listByBoard(room.productId) : await reservationApi.mine();
      const reservation = list.find((r) => r.chatRoomId === roomId) ?? null;
      return { room, board, seller, reservation };
    },
    [roomId],
    { refetchOnFocus: true },
  );

  // 메시지: 서버가 최신순(desc)으로 주므로 inverted FlatList에 그대로 사용
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [review, setReview] = useState(false);

  const loadPage = useCallback(
    async (p: number) => {
      setLoadingMore(true);
      try {
        const res = await chatApi.messages(roomId, p);
        setMessages((prev) => (p === 0 ? res.content : [...prev, ...res.content]));
        setPage(res.currentPage);
        setLastPage(res.last);
      } catch (e) {
        toast(errorMessage(e));
      } finally {
        setLoadingMore(false);
      }
    },
    [roomId, toast],
  );

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  const { connected, send } = useChatSocket(roomId, (msg) => setMessages((prev) => [msg, ...prev]));

  // 읽음 처리: 개별 메시지엔 id가 없어서 방의 lastMessageId 기준으로 처리.
  // 들어올 때(+포커스 복귀 시 방 정보 재조회됨) 한 번, 나갈 때 그 사이 받은 메시지까지 한 번 더.
  const lastMessageId = info.data?.room.lastMessageId;
  useEffect(() => {
    if (lastMessageId) chatApi.markRead(roomId, lastMessageId).catch(() => {});
  }, [roomId, lastMessageId]);
  useEffect(
    () => () => {
      chatApi
        .room(roomId)
        .then((r) => (r.lastMessageId ? chatApi.markRead(roomId, r.lastMessageId) : null))
        .catch(() => {});
    },
    [roomId],
  );

  const onSend = () => {
    const content = text.trim();
    if (!content) return;
    if (send(content)) setText('');
    else toast('채팅 서버에 연결 중이에요. 잠시 후 다시 보내주세요');
  };

  if (info.loading && !info.data) return <LoadingView />;
  if (info.error || !info.data) return <ErrorView message={info.error ?? '채팅방을 불러오지 못했어요'} onRetry={info.reload} />;

  const { room, board, seller, reservation } = info.data;
  const other = room.users.find((u) => u.userId !== me.userId);
  const readOnly = reservation?.status === 'CANCELLED';

  const setReservation = (r: Reservation) => {
    info.setData((d) => (d ? { ...d, reservation: { ...d.reservation, ...r } } : d));
    invalidateBoard(room.productId);
  };

  const complete = async () => {
    if (!reservation) return;
    const ok = await confirm({ title: '거래를 완료할까요?', message: `${reservation.buyerNickname}님 · ${reservation.quantity}개 · ${won(reservation.subtotal)}`, confirmText: '거래완료' });
    if (!ok) return;
    try {
      setReservation(await reservationApi.updateStatus(reservation.id, 'COMPLETED'));
      toast('거래를 완료했어요');
      setReview(true);
    } catch (e) {
      toast(errorMessage(e));
      info.reload();
    }
  };

  const cancel = async () => {
    if (!reservation) return;
    const ok = await confirm({ title: '거래를 취소할까요?', message: '취소하면 수량이 복구돼요.', confirmText: '거래취소', danger: true });
    if (!ok) return;
    try {
      setReservation(await reservationApi.updateStatus(reservation.id, 'CANCELLED'));
      toast('거래를 취소했어요');
    } catch (e) {
      toast(errorMessage(e));
      info.reload();
    }
  };

  const leave = async () => {
    setMenu(false);
    const ok = await confirm({ title: '채팅방을 나갈까요?', message: '대화 내용은 복구할 수 없어요.', confirmText: '나가기', danger: true });
    if (!ok) return;
    try {
      await chatApi.leave(roomId);
      toast('채팅방을 나갔어요');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  // ───────── 상단 거래 카드 ─────────
  let dealActions: ReactNode = null;
  if (reservation?.status === 'ACCEPTED' && seller) {
    dealActions = (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable style={[styles.dealBtn, styles.dealBtnSoft]} onPress={cancel}>
          <Text style={[styles.dealBtnText, { color: '#67726e' }]}>거래취소</Text>
        </Pressable>
        <Pressable style={styles.dealBtn} onPress={complete}>
          <Text style={styles.dealBtnText}>거래완료</Text>
        </Pressable>
      </View>
    );
  } else if (reservation?.status === 'COMPLETED') {
    dealActions = (
      <Pressable style={styles.dealBtn} onPress={() => setReview(true)}>
        <Text style={styles.dealBtnText}>매너 평가</Text>
      </Pressable>
    );
  }

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = item.senderId === me.userId;
    const d = parseServerDate(item.createdAt);
    // inverted 리스트라 index+1이 "이전(더 오래된)" 메시지 → 날짜가 바뀌는 지점에 구분선
    const older = messages[index + 1];
    const olderDate = older ? parseServerDate(older.createdAt)?.toDateString() : null;
    const showDivider = d && d.toDateString() !== olderDate;
    return (
      <View>
        {showDivider && <Text style={styles.divider}>{`${d!.getMonth() + 1}월 ${d!.getDate()}일`}</Text>}
        <View style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
          {mine && <Text style={styles.bubbleTime}>{d ? clockTime(d) : ''}</Text>}
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, mine && { color: 'white' }]}>{item.content}</Text>
          </View>
          {!mine && <Text style={styles.bubbleTime}>{d ? clockTime(d) : ''}</Text>}
        </View>
      </View>
    );
  };

  return (
    <Screen bg="white">
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="back" />
        </Pressable>
        <Pressable style={styles.person} onPress={() => other && navigation.navigate('UserProfile', { userId: other.userId })}>
          <Avatar name={other?.userName ?? room.name} size={31} />
          <View>
            <Text style={styles.personName}>{other?.userName ?? room.name}</Text>
            <Text style={styles.personSub}>{connected ? '연결됨' : '연결 중…'}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu((v) => !v)} hitSlop={8}>
          <Text style={{ fontWeight: '800', letterSpacing: 1, color: colors.text }}>•••</Text>
        </Pressable>
      </View>
      {menu && (
        <View style={styles.menu}>
          {other && (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenu(false);
                navigation.navigate('Report', { userId: other.userId, nickname: other.userName, boardId: room.productId });
              }}
            >
              <Text style={styles.menuText}>신고하기</Text>
            </Pressable>
          )}
          <Pressable style={styles.menuItem} onPress={leave}>
            <Text style={[styles.menuText, { color: colors.danger }]}>채팅방 나가기</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.deal} onPress={() => navigation.navigate('BoardDetail', { boardId: room.productId })}>
        <Thumb uri={board?.images[0]?.imageUrl} size={45} radius={10} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.dealTitle} numberOfLines={1}>{board?.title ?? room.productTitle}</Text>
          <Text style={styles.dealSub}>
            {reservation ? `${RESERVATION_STATUS_LABEL[reservation.status]} · ${reservation.quantity}개 · ${won(reservation.subtotal)}` : board ? `개당 ${won(board.unitPrice)}` : ''}
          </Text>
        </View>
        {dealActions}
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        <FlatList
          style={{ flex: 1, backgroundColor: colors.chatBg }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}
          data={messages}
          inverted
          keyExtractor={(m, i) => `${m.createdAt}-${m.senderId}-${i}`}
          renderItem={renderMessage}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (!lastPage && !loadingMore) loadPage(page + 1);
          }}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            ) : lastPage ? (
              <View style={styles.system}>
                <Icon name="check" size={15} color="#668178" />
                <Text style={styles.systemText}>참여 요청이 수락되어 채팅방이 열렸어요</Text>
              </View>
            ) : null
          }
        />

        {readOnly ? (
          <View style={[styles.readOnly, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.readOnlyText}>거래가 취소되어 더 이상 메시지를 보낼 수 없어요</Text>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="메시지를 입력하세요"
              placeholderTextColor="#9aa5a1"
              style={styles.input}
              multiline
            />
            <Pressable style={[styles.send, !text.trim() && { opacity: 0.5 }]} onPress={onSend} disabled={!text.trim()}>
              <Icon name="send" size={18} color="white" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {reservation && (
        <MannerReviewSheet
          visible={review}
          onClose={() => setReview(false)}
          reservationId={reservation.id}
          target={seller ? 'BUYER' : 'ORGANIZER'}
          targetName={other?.userName ?? (seller ? reservation.buyerNickname : board?.authorNickname ?? '')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personName: { fontSize: font.base, fontWeight: '700', color: colors.text },
  personSub: { fontSize: font.xs, color: '#84939a' },
  menu: { position: 'absolute', zIndex: 20, right: 12, top: 64, width: 140, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e1e7e9', backgroundColor: 'white', elevation: 6, shadowColor: '#1f414e', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  menuItem: { paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf1f2' },
  menuText: { fontSize: font.md, color: colors.text },
  deal: { minHeight: 67, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#e9eeec' },
  dealTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  dealSub: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '600' },
  dealBtn: { height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.primaryLight, justifyContent: 'center' },
  dealBtnSoft: { backgroundColor: '#eef2f0' },
  dealBtnText: { color: 'white', fontSize: font.xs, fontWeight: '700' },
  divider: { textAlign: 'center', marginVertical: 12, color: '#8a9490', fontSize: font.xs },
  system: { alignSelf: 'center', marginBottom: 18, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 16, backgroundColor: '#dcebed' },
  systemText: { color: '#668178', fontSize: font.xs },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: 10 },
  bubble: { maxWidth: '75%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 15 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: font.base, lineHeight: 20, color: colors.text },
  bubbleTime: { color: '#98a09d', fontSize: 10 },
  inputBar: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: 'white' },
  input: { flex: 1, minHeight: 40, maxHeight: 110, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20, backgroundColor: colors.inputBg, fontSize: font.base, color: colors.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  readOnly: { paddingTop: 14, paddingHorizontal: 16, backgroundColor: '#f5f7f6', alignItems: 'center' },
  readOnlyText: { color: colors.textMuted, fontSize: font.sm },
});
