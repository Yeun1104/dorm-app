import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { chatApi, mannerApi, profileApi, reservationApi } from '../../api/trade';
import type { ChatMessage, Reservation } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { useChatSocket } from '../../chat/useChatSocket';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import MannerReviewSheet from '../../components/MannerReviewSheet';
import { Avatar, ErrorView, LoadingView, Screen, Thumb } from '../../components/ui';
import { fetchBoardCached, invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { clockTime, parseServerDate, won } from '../../utils/format';
import { isMyBoard } from '../home/BoardDetailScreen';

/** 메시지에 id가 없어서 (보낸 시각, 보낸 사람, 내용)으로 같은 메시지를 식별 */
const msgKey = (m: ChatMessage) => `${m.createdAt}|${m.senderId}|${m.content}`;

/** 입력창: 한 줄 높이 × 최대 6줄까지 늘어나고 그 이상은 입력창 안에서 스크롤 */
const INPUT_LINE = 20;
const INPUT_PAD = 10;
const INPUT_MIN = INPUT_LINE + INPUT_PAD * 2;
const INPUT_MAX = INPUT_LINE * 6 + INPUT_PAD * 2;

// 웹: 입력창(textarea) 스크롤바 숨김 — RN 스타일로는 지정할 수 없어서 CSS 한 줄 주입
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('hide-textarea-scrollbar')) {
  const style = document.createElement('style');
  style.id = 'hide-textarea-scrollbar';
  style.textContent = 'textarea{scrollbar-width:none;-ms-overflow-style:none}textarea::-webkit-scrollbar{display:none}';
  document.head.appendChild(style);
}

/** 안 읽음 숫자를 다시 받아오는 주기 (상대가 읽었는지 반영) */
const UNREAD_REFRESH_MS = 8000;

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

  // 상대방 프로필 사진: 채팅방 응답의 users[].profileImage가 비어 있어서 프로필 API로 받음
  const otherUserId = info.data?.room.users.find((u) => u.userId !== me.userId)?.userId ?? null;
  const otherProfile = useFetch(() => profileApi.get(otherUserId!), [otherUserId], { enabled: otherUserId != null });

  // 메시지: 서버가 최신순(desc)으로 주므로 inverted FlatList에 그대로 사용
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(INPUT_MIN);
  const [menu, setMenu] = useState(false);
  // 내 메시지 꾹 누르기(앱)/우클릭(웹) 메뉴 — 누른 위치 근처에 띄움
  const [msgMenu, setMsgMenu] = useState<{ msg: ChatMessage; top: number } | null>(null);
  const [review, setReview] = useState(false);
  const [reviewed, setReviewed] = useState(true);

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

  /**
   * 읽음 표시(메시지 왼쪽 '1'):
   * 서버의 unreadCount는 '이 메시지 이후를 안 읽은 방 참여자 수'인데 보낸 사람 본인도 포함됨(보내도 내 읽음 위치가 안 움직임).
   * → 방에 있는 동안 내 읽음 위치를 계속 최신으로 올려두면, 이후 받아오는 숫자는 상대방 기준이 됨.
   */
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadLatest = useCallback(async () => {
    const r = await chatApi.room(roomId);
    if (r.lastMessageId) await chatApi.markRead(roomId, r.lastMessageId);
  }, [roomId]);
  const scheduleMarkRead = useCallback(() => {
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(() => markReadLatest().catch(() => {}), 400);
  }, [markReadLatest]);

  // 내 읽음 위치를 먼저 올린 뒤 첫 페이지를 받아야 숫자에 내가 안 섞임
  useEffect(() => {
    markReadLatest()
      .catch(() => {})
      .finally(() => loadPage(0));
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [loadPage, markReadLatest]);

  // 상대가 읽었는지 주기적으로 반영 (소켓에 읽음 이벤트가 없어서)
  useEffect(() => {
    const timer = setInterval(() => {
      chatApi
        .messages(roomId, 0)
        .then((res) => {
          const fresh = new Map(res.content.map((m) => [msgKey(m), m.unreadCount]));
          setMessages((prev) => prev.map((m) => (fresh.has(msgKey(m)) ? { ...m, unreadCount: fresh.get(msgKey(m))! } : m)));
        })
        .catch(() => {});
    }, UNREAD_REFRESH_MS);
    return () => clearInterval(timer);
  }, [roomId]);

  const { connected, send } = useChatSocket(roomId, (msg) => {
    const mineMsg = msg.senderId === me.userId;
    setMessages((prev) => [
      // 내가 보낸 직후엔 서버 숫자에 나도 포함돼 있어서 1 뺌
      mineMsg ? { ...msg, unreadCount: Math.max(0, (msg.unreadCount ?? 0) - 1) } : msg,
      // 상대가 보냈다면 그 전 내 메시지는 다 읽은 것
      ...(mineMsg ? prev : prev.map((m) => (m.senderId === me.userId ? { ...m, unreadCount: 0 } : m))),
    ]);
    scheduleMarkRead();
  });

  // 거래완료된 방이면 내가 이미 매너 평가를 보냈는지 (서버 기준 — 다른 기기에서도 정확)
  const completedReservationId = info.data?.reservation?.status === 'COMPLETED' ? info.data.reservation.id : null;
  useEffect(() => {
    if (completedReservationId == null) return;
    mannerApi.reviewed(completedReservationId).then(setReviewed).catch(() => setReviewed(true));
  }, [completedReservationId]);

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
    if (send(content)) {
      setText('');
      setInputHeight(INPUT_MIN);
    } else toast('채팅 서버에 연결 중이에요. 잠시 후 다시 보내주세요');
  };

  // 웹(키보드): Enter = 전송, Shift+Enter = 줄바꿈. 한글 조합 중 Enter는 무시.
  // 앱(폰 키보드)은 Enter가 줄바꿈이고 전송 버튼으로만 보냄
  const onInputKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const ne = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean; isComposing?: boolean; keyCode?: number };
    if (ne.key === 'Enter' && !ne.shiftKey && !ne.isComposing && ne.keyCode !== 229) {
      e.preventDefault();
      onSend();
    }
  };

  if (info.loading && !info.data) return <LoadingView />;
  if (info.error || !info.data) return <ErrorView message={info.error ?? '채팅방을 불러오지 못했어요'} onRetry={info.reload} />;

  const { room, board, seller, reservation } = info.data;
  const other = room.users.find((u) => u.userId !== me.userId);
  const readOnly = reservation?.status === 'CANCELLED';
  // 신고 대상: 방 참여자 목록의 상대 → 없으면(상대가 나간 방 등) 예약/게시글 정보로
  const reportTarget = other
    ? { userId: other.userId, nickname: other.userName }
    : seller && reservation
      ? { userId: reservation.buyerId, nickname: reservation.buyerNickname }
      : board && !seller
        ? { userId: board.authorId, nickname: board.authorNickname }
        : null;

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

  // 이 채팅방만 알림 끄기/켜기
  const toggleMute = async () => {
    setMenu(false);
    const muted = !room.notificationMuted;
    info.setData((d) => (d ? { ...d, room: { ...d.room, notificationMuted: muted } } : d));
    try {
      await chatApi.setMuted(roomId, muted);
      toast(muted ? '이 채팅방 알림을 껐어요' : '이 채팅방 알림을 켰어요');
    } catch (e) {
      info.setData((d) => (d ? { ...d, room: { ...d.room, notificationMuted: !muted } } : d));
      toast(errorMessage(e));
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
  }

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = item.senderId === me.userId;
    const d = parseServerDate(item.createdAt);
    // inverted 리스트라 index+1이 "이전(더 오래된)" 메시지 → 날짜가 바뀌는 지점에 구분선
    const older = messages[index + 1];
    const olderDate = older ? parseServerDate(older.createdAt)?.toDateString() : null;
    const showDivider = d && d.toDateString() !== olderDate;
    // 상대가 연달아 보낸 메시지는 첫 메시지에만 프로필 사진 + 닉네임 (날짜가 바뀌면 다시 표시)
    const firstOfGroup = !mine && (showDivider || older?.senderId !== item.senderId);
    const openProfile = () => navigation.navigate('UserProfile', { userId: item.senderId });
    return (
      <View>
        {showDivider && <Text style={styles.divider}>{`${d!.getFullYear()}년 ${d!.getMonth() + 1}월 ${d!.getDate()}일`}</Text>}
        {firstOfGroup && (
          <Pressable style={styles.senderRow} onPress={openProfile} hitSlop={4}>
            <Avatar name={item.senderName} uri={otherProfile.data?.profileImageUrl} size={32} />
            <Text style={styles.senderName}>{item.senderName}</Text>
          </Pressable>
        )}
        <View style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start', paddingLeft: 40 }]}>
          {mine && (
            <View style={styles.bubbleMeta}>
              {(item.unreadCount ?? 0) > 0 && <Text style={styles.unread}>{item.unreadCount}</Text>}
              <Text style={styles.bubbleTime}>{d ? clockTime(d) : ''}</Text>
            </View>
          )}
          <Pressable
            style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
            disabled={!mine || item.deleted}
            delayLongPress={350}
            onLongPress={(e) => setMsgMenu({ msg: item, top: e.nativeEvent.pageY })}
            {...(mine && Platform.OS === 'web'
              ? {
                  onContextMenu: (e: { preventDefault: () => void; nativeEvent: { pageY: number } }) => {
                    e.preventDefault();
                    setMsgMenu({ msg: item, top: e.nativeEvent.pageY });
                  },
                }
              : {})}
          >
            {item.deleted ? (
              <View style={styles.deletedRow}>
                <Icon name="alert" size={14} color={mine ? 'rgba(255,255,255,0.85)' : colors.textMuted} />
                <Text style={[styles.deletedText, mine && { color: 'rgba(255,255,255,0.85)' }]}>삭제된 채팅입니다</Text>
              </View>
            ) : (
              <Text style={[styles.bubbleText, mine && { color: 'white' }]}>{item.content}</Text>
            )}
          </Pressable>
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
        {/* 상단은 닉네임만 (알림 꺼둔 방이면 옆에 아이콘) */}
        <Pressable style={styles.person} onPress={() => other && navigation.navigate('UserProfile', { userId: other.userId })}>
          <Text style={styles.personName} numberOfLines={1}>{other?.userName ?? room.name}</Text>
          {room.notificationMuted && <Icon name="bellOff" size={15} color={colors.textMuted} />}
        </Pressable>
        <Pressable onPress={() => setMenu((v) => !v)} hitSlop={8}>
          <Text style={{ fontWeight: '800', letterSpacing: 1, color: colors.text }}>•••</Text>
        </Pressable>
      </View>
      {menu && (
        <View style={styles.menu}>
          {!!reportTarget && (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenu(false);
                navigation.navigate('Report', { userId: reportTarget.userId, nickname: reportTarget.nickname, boardId: room.productId });
              }}
            >
              <Text style={styles.menuText}>신고하기</Text>
            </Pressable>
          )}
          <Pressable style={styles.menuItem} onPress={toggleMute}>
            <Text style={styles.menuText}>{room.notificationMuted ? '알림 켜기' : '알림 끄기'}</Text>
          </Pressable>
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
            {reservation ? `${reservation.quantity}개 · ${won(reservation.subtotal)}` : board ? `개당 ${won(board.unitPrice)}` : ''}
            {/* 끝난 거래만 조용히 상태 표시 */}
            {reservation?.status === 'COMPLETED' && <Text style={styles.dealState}>  ·  거래완료됨</Text>}
            {reservation?.status === 'CANCELLED' && <Text style={styles.dealState}>  ·  취소됨</Text>}
          </Text>
        </View>
        {dealActions}
      </Pressable>

      {/* 거래완료되면 양쪽 모두에게 매너 평가 안내 */}
      {reservation?.status === 'COMPLETED' && !reviewed && (
        <Pressable style={styles.reviewBar} onPress={() => setReview(true)}>
          <View style={styles.reviewIcon}>
            <Icon name="star" size={15} color="white" />
          </View>
          <Text style={styles.reviewText}>거래가 완료됐어요! {other?.userName ?? '상대방'}님에게 매너 평가를 보내주세요</Text>
          <Text style={styles.reviewAction}>보내기</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        <FlatList
          showsVerticalScrollIndicator={false}
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
              style={[styles.input, { height: inputHeight }]}
              multiline
              onKeyPress={onInputKeyPress}
              onContentSizeChange={(e) => setInputHeight(Math.min(INPUT_MAX, Math.max(INPUT_MIN, Math.ceil(e.nativeEvent.contentSize.height))))}
              scrollEnabled={inputHeight >= INPUT_MAX}
            />
            <Pressable style={[styles.send, !text.trim() && { opacity: 0.5 }]} onPress={onSend} disabled={!text.trim()}>
              <Icon name="send" size={18} color="white" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal transparent visible={!!msgMenu} animationType="fade" onRequestClose={() => setMsgMenu(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMsgMenu(null)} />
        {msgMenu && (
          <View style={[styles.msgMenu, { top: Math.max(insets.top + 60, msgMenu.top - 56) }]}>
            <Pressable
              style={styles.msgMenuItem}
              onPress={() => {
                setMsgMenu(null);
                // TODO: 백엔드에 메시지 삭제 API(+메시지 id, 소켓으로 삭제 알림)가 생기면 연결
                toast('전송 취소는 서버 기능이 추가되면 사용할 수 있어요');
              }}
            >
              <Text style={[styles.msgMenuText, { color: colors.danger }]}>전송 취소</Text>
            </Pressable>
          </View>
        )}
      </Modal>

      {reservation && (
        <MannerReviewSheet
          visible={review}
          onClose={() => setReview(false)}
          reservationId={reservation.id}
          target={seller ? 'BUYER' : 'ORGANIZER'}
          targetName={other?.userName ?? (seller ? reservation.buyerNickname : board?.authorNickname ?? '')}
          onReviewed={() => setReviewed(true)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  person: { flex: 1, marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  personName: { flexShrink: 1, fontSize: font.base, fontWeight: '700', color: colors.text },
  menu: { position: 'absolute', zIndex: 20, right: 12, top: 64, width: 140, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e1e7e9', backgroundColor: 'white', elevation: 6, shadowColor: '#1f414e', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  menuItem: { paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf1f2' },
  menuText: { fontSize: font.md, color: colors.text },
  deal: { minHeight: 67, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#e9eeec' },
  dealTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  dealState: { color: colors.textFaint, fontWeight: '500' },
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deletedText: { fontSize: font.md, fontStyle: 'italic', color: colors.textMuted },
  dealSub: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '600' },
  dealBtn: { height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.primaryLight, justifyContent: 'center' },
  dealBtnSoft: { backgroundColor: '#eef2f0' },
  dealBtnText: { color: 'white', fontSize: font.xs, fontWeight: '700' },
  reviewBar: { marginHorizontal: 12, marginTop: 10, marginBottom: 2, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: '#fff8e3' },
  reviewIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f2b84b', alignItems: 'center', justifyContent: 'center' },
  reviewText: { flex: 1, fontSize: font.xs, lineHeight: 16, fontWeight: '600', color: '#7a6128' },
  reviewAction: { fontSize: font.sm, fontWeight: '800', color: '#7a6128' },
  divider: { textAlign: 'center', marginVertical: 12, color: '#8a9490', fontSize: font.xs },
  system: { alignSelf: 'center', marginBottom: 18, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 16, backgroundColor: '#dcebed' },
  systemText: { color: '#668178', fontSize: font.xs },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: 10 },
  bubble: { maxWidth: '75%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 15 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: font.base, lineHeight: 20, color: colors.text },
  bubbleTime: { color: '#98a09d', fontSize: 10 },
  bubbleMeta: { alignItems: 'flex-end' },
  senderRow: { alignSelf: 'flex-start', marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  senderName: { fontSize: font.sm, fontWeight: '600', color: colors.textBody },
  msgMenu: { position: 'absolute', right: 20, minWidth: 120, paddingVertical: 4, borderRadius: 12, backgroundColor: 'white', shadowColor: '#1f414e', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  msgMenuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  msgMenuText: { fontSize: font.md, fontWeight: '600', color: colors.text },
  unread: { color: '#e6a817', fontSize: 11, fontWeight: '800' },
  inputBar: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: 'white' },
  input: { flex: 1, paddingHorizontal: 14, paddingTop: INPUT_PAD, paddingBottom: INPUT_PAD, borderRadius: 20, backgroundColor: colors.inputBg, fontSize: font.base, lineHeight: INPUT_LINE, color: colors.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  readOnly: { paddingTop: 14, paddingHorizontal: 16, backgroundColor: '#f5f7f6', alignItems: 'center' },
  readOnlyText: { color: colors.textMuted, fontSize: font.sm },
});
