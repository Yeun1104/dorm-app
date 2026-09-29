import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { profileApi } from '../../api/trade';
import type { Board } from '../../api/types';
import { ProductCard } from '../../components/BoardCard';
import { Avatar, EmptyState, ErrorView, LoadingView, Screen, SegmentedTabs, SubHeader } from '../../components/ui';
import { useBoards } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { BOARD_FILTERS, BoardFilter, profileBoards } from './UserProfileScreen';

/** 다른 사용자가 쓴 글 전체 — 메인 공동구매 목록과 같은 카드, 위에 프로필 + 'OO님의 판매 글' */
export default function UserBoardsScreen({ navigation, route }: ScreenProps<'UserBoards'>) {
  const { userId } = route.params;
  const { data, error, loading, reload } = useFetch(() => profileApi.get(userId), [userId], { refetchOnFocus: true });
  const [filter, setFilter] = useState<BoardFilter>('ALL');
  const summaries = data ? profileBoards(data, filter) : [];
  const fetched = useBoards(summaries.map((b) => b.id));

  // 좋아요는 화면에서 바로 반영되도록 로컬로 덮어씀
  const [patches, setPatches] = useState<Record<number, Partial<Board>>>({});
  useEffect(() => setPatches({}), [userId]);
  const toggleLike = useLikeToggle((updated) => setPatches((p) => ({ ...p, [updated.id]: { ...p[updated.id], ...updated } })));
  const boards = summaries.map((s) => fetched[s.id]).filter((b): b is Board => !!b).map((b) => ({ ...b, ...patches[b.id] }));
  const pending = summaries.some((s) => fetched[s.id] === undefined);

  return (
    <Screen>
      <SubHeader title="판매 글" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <>
          <View style={styles.head}>
            <Avatar name={data.nickname} uri={data.profileImageUrl} size={44} />
            <Text style={styles.headText} numberOfLines={1}>
              <Text style={styles.headName}>{data.nickname}</Text>님의 판매 글
            </Text>
          </View>
          <SegmentedTabs tabs={BOARD_FILTERS} value={filter} onChange={setFilter} />
          {pending && !boards.length ? (
            <LoadingView />
          ) : (
            <FlatList
              data={boards}
              keyExtractor={(b) => String(b.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListEmptyComponent={<EmptyState icon="doc" title={filter === 'COMPLETED' ? '모집완료된 글이 없어요' : filter === 'IN_PROGRESS' ? '모집 중인 글이 없어요' : '아직 작성한 글이 없어요'} />}
              renderItem={({ item }) => (
                <ProductCard board={item} onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })} onToggleLike={() => toggleLike(item)} />
              )}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, fontSize: 17, color: colors.textBody },
  headName: { fontSize: 18, fontWeight: '800', color: colors.text },
});
