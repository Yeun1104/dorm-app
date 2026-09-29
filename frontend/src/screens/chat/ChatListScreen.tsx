import { ReactNode, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { chatApi } from '../../api/trade';
import type { ChatRoom } from '../../api/types';
import { userApi } from '../../api/user';
import { useMe } from '../../auth/AuthContext';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, LoadingView, PageHeader, Screen, Thumb } from '../../components/ui';
import { useBoards } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import { useWebDragScroll } from '../../hooks/useWebDragScroll';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { chatListTime } from '../../utils/format';

/** 채팅방을 왼쪽으로 밀면 나오는 버튼 영역 너비 (버튼 2개) */
const SWIPE_ACTIONS_W = 150;
/** 채팅방 내용(날짜 등)과 버튼 사이 여백 */
const SWIPE_GAP = 14;
/** 끝까지 밀었을 때 이동 거리 */
const SWIPE_OPEN = SWIPE_ACTIONS_W + SWIPE_GAP;

/** 왼쪽으로 밀면 버튼이 나오는 채팅방 한 줄 (앱은 터치 스크롤, 웹은 마우스로 끌기) */
function SwipeRow({ onRef, disabled, children }: { onRef: (r: ScrollView | null) => void; disabled: boolean; children: ReactNode }) {
  const ref = useRef<ScrollView | null>(null);
  const drag = useWebDragScroll({ scrollTo: (x, animated) => ref.current?.scrollTo({ x, animated }), snap: SWIPE_OPEN, count: 2 });
  return (
    <View {...(disabled ? {} : drag.panHandlers)} style={drag.style}>
      <ScrollView
        ref={(r) => {
          ref.current = r;
          onRef(r);
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={!disabled}
        snapToOffsets={[0, SWIPE_OPEN]}
        snapToEnd={false}
        decelerationRate="fast"
        onScroll={drag.onScroll}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export default function ChatListScreen({ navigation }: ScreenProps<'ChatList'>) {
  const me = useMe();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const rooms = useFetch(
    async () => (await chatApi.rooms()).sort((a, b) => (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? '')),
    [],
    { refetchOnFocus: true },
  );
  // "새로운 거래 요청" 배너: 내 모집중 글에 쌓인 대기 요청 합계
  const waiting = useFetch(
    async () => (await userApi.myBoards(0)).boards.filter((b) => b.status === 'IN_PROGRESS').reduce((sum, b) => sum + b.waitingCount, 0),
    [],
    { refetchOnFocus: true },
  );
  const boards = useBoards((rooms.data ?? []).map((r) => r.productId));

  const toggle = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allIds = (rooms.data ?? []).map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);

  // ───── 왼쪽으로 밀면 나오는 버튼 (알림 끄기 / 나가기) ─────
  const { width } = useWindowDimensions();
  const rowWidth = width - 36; // 목록 좌우 여백 18씩
  const swipeRefs = useRef(new Map<number, ScrollView | null>());
  const closeSwipe = (id: number) => swipeRefs.current.get(id)?.scrollTo({ x: 0, animated: true });

  const toggleMute = async (room: ChatRoom) => {
    closeSwipe(room.id);
    const muted = !room.notificationMuted;
    rooms.setData((list) => list?.map((r) => (r.id === room.id ? { ...r, notificationMuted: muted } : r)) ?? list);
    try {
      await chatApi.setMuted(room.id, muted);
      toast(muted ? '이 채팅방 알림을 껐어요' : '이 채팅방 알림을 켰어요');
    } catch (e) {
      rooms.setData((list) => list?.map((r) => (r.id === room.id ? { ...r, notificationMuted: !muted } : r)) ?? list);
      toast(errorMessage(e));
    }
  };

  const leaveOne = async (room: ChatRoom) => {
    closeSwipe(room.id);
    const ok = await confirm({ title: '채팅방을 나갈까요?', message: '대화 내용은 복구할 수 없어요.', confirmText: '나가기', danger: true });
    if (!ok) return;
    try {
      await chatApi.leave(room.id);
      rooms.setData((list) => list?.filter((r) => r.id !== room.id) ?? list);
      toast('채팅방을 나갔어요');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const leaveSelected = async () => {
    const ok = await confirm({ title: `채팅방 ${selected.length}개를 삭제할까요?`, message: '대화 내용은 복구할 수 없어요.', confirmText: '삭제', danger: true });
    if (!ok) return;
    const results = await Promise.allSettled(selected.map((id) => chatApi.leave(id)));
    const failed = results.filter((r) => r.status === 'rejected');
    toast(failed.length ? errorMessage((failed[0] as PromiseRejectedResult).reason) : '선택한 채팅방을 삭제했어요');
    setEditing(false);
    setSelected([]);
    rooms.reload();
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const other = item.users.find((u) => u.userId !== me.userId);
    const isSelected = selected.includes(item.id);
    const unread = item.unreadCount ?? 0;
    return (
      <SwipeRow
        onRef={(r) => {
          swipeRefs.current.set(item.id, r);
        }}
        disabled={editing}
      >
      <Pressable
        style={[styles.item, { width: rowWidth }, isSelected && styles.itemSelected]}
        onPress={() => (editing ? toggle(item.id) : navigation.navigate('ChatRoom', { roomId: item.id }))}
      >
        {editing && (
          <View style={[styles.selectCircle, isSelected && styles.selectCircleOn]}>
            {isSelected && <Icon name="check" size={13} color="white" strokeWidth={2.4} />}
          </View>
        )}
        <Thumb uri={boards[item.productId]?.images[0]?.imageUrl} size={60} radius={17} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.row}>
            <View style={styles.nameWrap}>
              <Text style={styles.name} numberOfLines={1}>{other?.userName ?? item.name}</Text>
              {item.notificationMuted && <Icon name="bellOff" size={13} color={colors.textFaint} />}
            </View>
            <Text style={styles.time}>{chatListTime(item.lastMessageTime)}</Text>
          </View>
          <Text style={[styles.preview, (!item.lastMessage || unread === 0) && styles.previewRead]} numberOfLines={1}>
            {item.lastMessage ?? '채팅방이 열렸어요. 먼저 인사해보세요!'}
          </Text>
          <Text style={styles.product} numberOfLines={1}>{item.productTitle}</Text>
        </View>
        {unread > 0 && (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.swipeActions}>
        <Pressable style={[styles.swipeBtn, { backgroundColor: '#8e9895' }]} onPress={() => toggleMute(item)} accessibilityLabel={item.notificationMuted ? '알림 켜기' : '알림 끄기'}>
          <Icon name={item.notificationMuted ? 'bell' : 'bellOff'} size={20} color="white" />
          <Text style={styles.swipeText}>{item.notificationMuted ? '알림 켜기' : '알림 끄기'}</Text>
        </Pressable>
        <Pressable style={[styles.swipeBtn, { backgroundColor: colors.danger }]} onPress={() => leaveOne(item)} accessibilityLabel="나가기">
          <Icon name="exit" size={20} color="white" />
          <Text style={styles.swipeText}>나가기</Text>
        </Pressable>
      </View>
      </SwipeRow>
    );
  };

  return (
    <Screen>
      <PageHeader
        title="채팅"
        right={
          <Pressable
            onPress={() => {
              setEditing((v) => !v);
              setSelected([]);
            }}
            hitSlop={8}
          >
            <Text style={styles.edit}>{editing ? '완료' : '편집'}</Text>
          </Pressable>
        }
      />
      {editing && (
        <View style={styles.editBar}>
          <Text style={styles.editCount}>{selected.length}개 선택</Text>
          <View style={styles.editActions}>
            <Pressable style={[styles.subBtn, !allIds.length && { opacity: 0.4 }]} disabled={!allIds.length} onPress={toggleAll}>
              <Text style={styles.subBtnText}>{allSelected ? '전체 해제' : '전체 선택'}</Text>
            </Pressable>
            <Pressable
              style={styles.subBtn}
              onPress={() => {
                setEditing(false);
                setSelected([]);
              }}
            >
              <Text style={styles.subBtnText}>취소</Text>
            </Pressable>
            <Pressable style={[styles.deleteBtn, !selected.length && { backgroundColor: '#d5dcde' }]} disabled={!selected.length} onPress={leaveSelected}>
              <Text style={styles.deleteText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      )}
      {rooms.loading && !rooms.data ? (
        <LoadingView />
      ) : rooms.error && !rooms.data ? (
        <ErrorView message={rooms.error} onRetry={rooms.reload} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={rooms.data ?? []}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderRoom}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={rooms.refreshing}
              onRefresh={() => {
                rooms.refresh();
                waiting.silentReload();
              }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            (waiting.data ?? 0) > 0 ? (
              <Pressable style={styles.inbox} onPress={() => navigation.navigate('ReservationManage', {})}>
                <View style={styles.inboxIcon}>
                  <Icon name="bell" size={20} color="white" />
                  <View style={styles.inboxBadge}>
                    <Text style={styles.inboxBadgeText}>{waiting.data}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inboxTitle}>새로운 거래 요청</Text>
                  <Text style={styles.inboxSub}>내 공동구매에 {waiting.data}명이 참여를 기다리고 있어요</Text>
                </View>
                <Icon name="chevron" size={17} color="#245f78" />
              </Pressable>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="chat" title="아직 열린 채팅방이 없어요" message="방장이 참여 요청을 수락하면 채팅방이 열려요." />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  edit: { color: '#75807c', fontSize: font.md },
  inbox: { marginTop: 4, marginBottom: 8, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: '#e0f1f5' },
  inboxIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  inboxBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, borderWidth: 2, borderColor: '#e0f1f5', backgroundColor: '#ff6268', alignItems: 'center', justifyContent: 'center' },
  inboxBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  inboxTitle: { fontSize: font.md, fontWeight: '700', color: '#245f78' },
  inboxSub: { marginTop: 2, color: '#66899a', fontSize: font.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemSelected: { backgroundColor: colors.primaryTint, borderRadius: 13 },
  selectCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#b9c8ce', alignItems: 'center', justifyContent: 'center' },
  selectCircleOn: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nameWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  swipeActions: { marginLeft: SWIPE_GAP, flexDirection: 'row' },
  swipeBtn: { width: SWIPE_ACTIONS_W / 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeText: { fontSize: 11, fontWeight: '700', color: 'white' },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  time: { color: '#9da4a1', fontSize: font.xs },
  preview: { marginTop: 4, marginBottom: 3, fontSize: font.md, color: colors.text },
  previewRead: { color: '#939b98' },
  unread: { minWidth: 19, height: 19, paddingHorizontal: 5, marginTop: 18, borderRadius: 10, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  unreadText: { color: 'white', fontSize: 10, fontWeight: '700' },
  product: { color: colors.primaryDark, fontSize: font.xs },
  editBar: { paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editCount: { fontSize: font.md, color: '#6d7b81' },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subBtn: { height: 36, paddingHorizontal: 15, borderRadius: 18, justifyContent: 'center', backgroundColor: '#eef1f0' },
  subBtnText: { color: '#68736f', fontSize: font.md, fontWeight: '600' },
  deleteBtn: { height: 36, paddingHorizontal: 17, borderRadius: 18, justifyContent: 'center', backgroundColor: colors.danger },
  deleteText: { color: 'white', fontSize: font.md, fontWeight: '700' },
});
