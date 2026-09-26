import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { notificationApi } from '../../api/notification';
import type { AppNotification, NotificationType } from '../../api/types';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon, { IconName } from '../../components/Icon';
import { EmptyState, ErrorView, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { timeAgo } from '../../utils/format';

const TYPE_ICON: Record<NotificationType, IconName> = {
  RESERVATION_REQUESTED: 'inbox',
  RESERVATION_ACCEPTED: 'chat',
  RESERVATION_REJECTED: 'close',
  BOARD_SOLD_OUT: 'check',
  RESERVATION_COMPLETED: 'star',
  DORM_NOTICE: 'notice',
};

export default function NotificationsScreen(_: ScreenProps<'Notifications'>) {
  // 기숙사 공지처럼 다른 탭으로 가야 하는 알림이 있어서 전역 navigation 사용
  const navigation = useNavigation();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const first = useFetch(
    async () => {
      const res = await notificationApi.list(0);
      setItems(res.content);
      setPage(res.number);
      setLast(res.last);
      return true;
    },
    [],
    { refetchOnFocus: true },
  );

  const loadMore = useCallback(async () => {
    if (last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await notificationApi.list(page + 1);
      setItems((prev) => [...prev, ...res.content.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(res.number);
      setLast(res.last);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [last, loadingMore, page, toast]);

  /** 알림 종류별 이동할 화면 */
  const openTarget = (n: AppNotification) => {
    switch (n.type) {
      case 'RESERVATION_REQUESTED':
        if (n.relatedBoardId != null) return navigation.navigate('ReservationManage', { boardId: n.relatedBoardId });
        return;
      case 'RESERVATION_ACCEPTED':
      case 'RESERVATION_COMPLETED': // 채팅방 상단에 매너 평가 안내가 떠 있음
        if (n.relatedChatRoomId != null) return navigation.navigate('ChatRoom', { roomId: n.relatedChatRoomId });
        if (n.relatedBoardId != null) return navigation.navigate('BoardDetail', { boardId: n.relatedBoardId });
        return;
      case 'RESERVATION_REJECTED':
      case 'BOARD_SOLD_OUT':
        if (n.relatedBoardId != null) return navigation.navigate('BoardDetail', { boardId: n.relatedBoardId });
        return;
      case 'DORM_NOTICE':
        // 공지 목록은 기숙사생활 탭에만 있음 → 그 탭으로 이동 (뒤로가기 시 기숙사 홈)
        return navigation.navigate('DormTab', { screen: 'NoticeList', initial: false });
    }
  };

  const open = (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      notificationApi.markRead(n.id).catch(() => {});
    }
    openTarget(n);
  };

  const remove = async (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    try {
      await notificationApi.remove(n.id);
    } catch (e) {
      toast(errorMessage(e));
      first.reload();
    }
  };

  // 전체 삭제 API가 없어서 불러온 알림을 하나씩 삭제
  const clearAll = async () => {
    const ok = await confirm({ title: '알림을 모두 지울까요?', message: '지운 알림은 되돌릴 수 없어요.', confirmText: '모두 지우기', danger: true });
    if (!ok) return;
    const targets = items;
    setItems([]);
    const results = await Promise.allSettled(targets.map((n) => notificationApi.remove(n.id)));
    if (results.some((r) => r.status === 'rejected')) toast('일부 알림을 지우지 못했어요');
    first.reload();
  };

  let body;
  if (first.loading && !first.data) body = <LoadingView />;
  else if (first.error && !first.data) body = <ErrorView message={first.error} onRetry={first.reload} />;
  else
    body = (
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={first.refreshing} onRefresh={first.refresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} /> : null}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState icon="bell" title="새로운 알림이 없어요" message="참여 요청, 거래 소식이 오면 여기에 모아둘게요." />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => open(item)}>
            <View style={styles.icon}>
              <Icon name={TYPE_ICON[item.type] ?? 'bell'} size={18} color={colors.text} />
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, item.read && styles.titleRead]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel="알림 지우기">
              <Icon name="close" size={16} color={colors.textFaint} />
            </Pressable>
          </Pressable>
        )}
      />
    );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title="알림"
        action={
          items.length > 0 ? (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clearAll}>전체 지우기</Text>
            </Pressable>
          ) : undefined
        }
      />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearAll: { fontSize: font.sm, color: colors.textMuted },
  row: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  rowUnread: { borderColor: '#d6e3ec' },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f3f2', alignItems: 'center', justifyContent: 'center' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: 'white', backgroundColor: colors.badge },
  title: { fontSize: font.md, fontWeight: '800', color: colors.text },
  titleRead: { fontWeight: '600', color: colors.textBody },
  message: { marginTop: 3, fontSize: font.sm, lineHeight: 19, color: colors.textBody },
  time: { marginTop: 5, fontSize: font.xs, color: colors.textFaint },
});
