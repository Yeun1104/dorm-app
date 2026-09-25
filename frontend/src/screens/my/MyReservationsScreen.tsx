import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { reservationApi } from '../../api/trade';
import type { Reservation, ReservationStatus } from '../../api/types';
import { useConfirm, useToast } from '../../components/Feedback';
import { Chip, EmptyState, ErrorView, FilterPills, LoadingView, Screen, SubHeader, Thumb } from '../../components/ui';
import { RESERVATION_STATUS_LABEL } from '../../constants';
import { useBoards } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { formatDate, won } from '../../utils/format';
import { STATUS_TONE } from '../home/ReservationManageScreen';

type Filter = 'ALL' | ReservationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '대기중' },
  { value: 'ACCEPTED', label: '수락됨' },
  { value: 'REJECTED', label: '거절됨' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' },
];

export default function MyReservationsScreen({ navigation }: ScreenProps<'MyReservations'>) {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, error, loading, refreshing, reload, refresh } = useFetch(
    async () => (await reservationApi.mine()).sort((a, b) => b.id - a.id),
    [],
    { refetchOnFocus: true },
  );
  const boards = useBoards((data ?? []).map((r) => r.boardId));
  const list = (data ?? []).filter((r) => filter === 'ALL' || r.status === filter);

  const withdraw = async (r: Reservation) => {
    if (!(await confirm({ title: '참여 요청을 취소할까요?', confirmText: '요청 취소', danger: true }))) return;
    try {
      await reservationApi.withdraw(r.id);
      toast('참여 요청을 취소했어요');
    } catch (e) {
      toast(errorMessage(e));
    }
    reload();
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const board = boards[item.boardId];
    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('BoardDetail', { boardId: item.boardId })}>
        <View style={styles.top}>
          <Chip label={RESERVATION_STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.product}>
          <Thumb uri={board?.images[0]?.imageUrl} size={66} radius={13} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.title} numberOfLines={1}>{board?.title ?? (board === null ? '삭제된 게시글' : '불러오는 중…')}</Text>
            <Text style={styles.price}>{item.quantity}개 · {won(item.subtotal)}</Text>
            {!!board?.location && <Text style={styles.place}>{board.location}</Text>}
          </View>
        </View>
        {item.status === 'PENDING' && (
          <Pressable style={styles.action} onPress={() => withdraw(item)}>
            <Text style={styles.actionText}>요청 취소</Text>
          </Pressable>
        )}
        {(item.status === 'ACCEPTED' || item.status === 'COMPLETED') && item.chatRoomId != null && (
          <Pressable style={[styles.action, styles.actionGreen]} onPress={() => navigation.navigate('ChatRoom', { roomId: item.chatRoomId! })}>
            <Text style={[styles.actionText, { color: colors.primaryDark }]}>{item.status === 'COMPLETED' ? '채팅방에서 매너 평가하기' : '채팅방으로 이동'}</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="내 참여 신청 내역" />
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      {loading && !data ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="doc" title="참여 신청 내역이 없어요" message="홈에서 마음에 드는 공동구매에 참여해보세요." />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 11, padding: 15, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 17, backgroundColor: 'white' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: '#9ca4a1', fontSize: font.xs },
  product: { marginVertical: 12, flexDirection: 'row', gap: 11 },
  title: { fontSize: font.md, fontWeight: '700', color: colors.text },
  price: { marginTop: 4, marginBottom: 1, fontSize: font.sm, fontWeight: '700', color: colors.text },
  place: { color: '#89938f', fontSize: font.xs },
  action: { height: 40, borderWidth: 1, borderColor: '#dfe5e2', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionGreen: { borderColor: '#badde7', backgroundColor: '#eef7f9' },
  actionText: { color: '#65716c', fontSize: font.sm, fontWeight: '700' },
});
