import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { mannerApi, reservationApi } from '../../api/trade';
import type { Reservation } from '../../api/types';
import { userApi } from '../../api/user';
import { EmptyState, ErrorView, LoadingView, Screen, SegmentedTabs, SubHeader, Thumb } from '../../components/ui';
import { fetchBoardCached } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { formatDate, won } from '../../utils/format';

/** 매너 평가를 보낼(보낸) 거래 한 건 */
interface ReviewItem {
  reservation: Reservation;
  /** 평가받는 사람의 역할: 내가 구매자였으면 총대(ORGANIZER), 내가 총대였으면 구매자(BUYER) */
  target: 'BUYER' | 'ORGANIZER';
  otherName: string;
  boardTitle: string;
  imageUrl: string | null;
  reviewed: boolean;
}

/**
 * 매너 평가 관리: 거래완료된 거래를 모아 '보낼 평가 / 보낸 평가'로 보여줌
 * - 내가 참여한 공구(구매자) + 내가 올린 공구(총대) 양쪽
 * - 보냈는지는 서버(GET /manner-review/status) 기준
 */
export default function MannerReviewsScreen({ navigation }: ScreenProps<'MannerReviews'>) {
  const [tab, setTab] = useState<'todo' | 'done'>('todo');

  const list = useFetch(
    async () => {
      // 구매자로서 완료한 거래
      const asBuyer = (await reservationApi.mine()).filter((r) => r.status === 'COMPLETED');
      // 총대로서 완료한 거래 (내 글마다 요청 목록)
      const myBoards = (await userApi.myBoards(0)).boards;
      const asOrganizer = (await Promise.all(myBoards.map((b) => reservationApi.listByBoard(b.id).catch(() => [] as Reservation[]))))
        .flat()
        .filter((r) => r.status === 'COMPLETED');

      const build = async (r: Reservation, target: ReviewItem['target']): Promise<ReviewItem> => {
        const [board, reviewed] = await Promise.all([fetchBoardCached(r.boardId), mannerApi.reviewed(r.id).catch(() => false)]);
        return {
          reservation: r,
          target,
          otherName: target === 'BUYER' ? r.buyerNickname : (board?.authorNickname ?? '방장'),
          boardTitle: board?.title ?? '삭제된 게시글',
          imageUrl: board?.images[0]?.imageUrl ?? null,
          reviewed,
        };
      };
      const items = await Promise.all([...asBuyer.map((r) => build(r, 'ORGANIZER')), ...asOrganizer.map((r) => build(r, 'BUYER'))]);
      return items.sort((a, b) => b.reservation.id - a.reservation.id);
    },
    [],
    { refetchOnFocus: true },
  );

  const items = list.data ?? [];
  const todo = items.filter((i) => !i.reviewed);
  const done = items.filter((i) => i.reviewed);
  const shown = tab === 'todo' ? todo : done;

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="매너 평가" subtitle="거래를 마친 상대에게 매너 평가를 남겨요" />
      <SegmentedTabs
        tabs={[
          { value: 'todo', label: `보낼 평가 ${todo.length}` },
          { value: 'done', label: `보낸 평가 ${done.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {list.loading && !list.data ? (
        <LoadingView />
      ) : list.error && !list.data ? (
        <ErrorView message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(i) => String(i.reservation.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="star"
              title={tab === 'todo' ? '보낼 매너 평가가 없어요' : '아직 보낸 매너 평가가 없어요'}
              message={tab === 'todo' ? '거래를 마치면 여기서 상대에게 평가를 남길 수 있어요.' : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('BoardDetail', { boardId: item.reservation.boardId })}>
              <Thumb uri={item.imageUrl} size={56} radius={12} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.otherName}
                  <Text style={styles.role}> · {item.target === 'ORGANIZER' ? '총대' : '구매자'}</Text>
                </Text>
                <Text style={styles.board} numberOfLines={1}>{item.boardTitle}</Text>
                <Text style={styles.meta}>
                  {item.reservation.quantity}개 · {won(item.reservation.subtotal)} · {formatDate(item.reservation.createdAt)}
                </Text>
              </View>
              {item.reviewed ? (
                <Text style={styles.doneText}>보냄</Text>
              ) : (
                <Pressable
                  style={styles.sendBtn}
                  onPress={() => navigation.navigate('MannerReview', { reservationId: item.reservation.id, target: item.target, targetName: item.otherName })}
                  hitSlop={6}
                >
                  <Text style={styles.sendText}>평가하기</Text>
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text },
  role: { fontSize: font.xs, fontWeight: '500', color: colors.textMuted },
  board: { marginTop: 2, fontSize: font.sm, color: colors.textBody },
  meta: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
  sendBtn: { height: 34, paddingHorizontal: 13, borderRadius: 17, backgroundColor: colors.text, justifyContent: 'center' },
  sendText: { fontSize: font.sm, fontWeight: '700', color: 'white' },
  doneText: { fontSize: font.sm, fontWeight: '600', color: colors.textFaint },
});
