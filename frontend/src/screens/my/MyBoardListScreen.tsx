import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { errorMessage } from '../../api/client';
import type { Board, BoardPage } from '../../api/types';
import { userApi } from '../../api/user';
import { CompactBoardCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, HeaderAddButton, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

function usePagedBoards(fetchPage: (page: number) => Promise<BoardPage>) {
  const toast = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, mode: 'initial' | 'refresh' | 'more' | 'silent') => {
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setMore(true);
      try {
        const res = await fetchPage(p);
        setBoards((prev) => (p === 0 ? res.boards : [...prev, ...res.boards]));
        setPage(res.currentPage);
        setTotalPages(res.totalPages);
        setError(null);
      } catch (e) {
        if (mode === 'more') toast(errorMessage(e));
        else if (mode !== 'silent') setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setMore(false);
      }
    },
    [fetchPage, toast],
  );

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      load(0, first.current ? 'initial' : 'silent');
      first.current = false;
    }, [load]),
  );

  return {
    boards,
    setBoards,
    loading,
    refreshing,
    more,
    error,
    reload: () => load(0, 'initial'),
    refresh: () => load(0, 'refresh'),
    loadMore: () => {
      if (!more && page + 1 < totalPages) load(page + 1, 'more');
    },
  };
}

function BoardListScreen({ mode, navigation }: { mode: 'liked' | 'mine'; navigation: ScreenProps<'LikedBoards'>['navigation'] }) {
  const paged = usePagedBoards(mode === 'liked' ? userApi.likedBoards : userApi.myBoards);
  const toggleLike = useLikeToggle((patch) =>
    // 좋아요 해제하면 목록에서 바로 빠지도록
    paged.setBoards((prev) => (patch.liked ? prev.map((b) => (b.id === patch.id ? { ...b, ...patch } : b)) : prev.filter((b) => b.id !== patch.id))),
  );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title={mode === 'liked' ? '좋아요한 글' : '내가 쓴 글'}
        subtitle={mode === 'liked' ? '관심 있는 공동구매를 모았어요' : '내가 만든 공동구매를 관리해요'}
        action={mode === 'mine' ? <HeaderAddButton label="글쓰기" onPress={() => navigation.navigate('BoardWrite')} /> : undefined}
      />
      {paged.loading ? (
        <LoadingView />
      ) : paged.error && !paged.boards.length ? (
        <ErrorView message={paged.error} onRetry={paged.reload} />
      ) : (
        <FlatList
          data={paged.boards}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={paged.refreshing} onRefresh={paged.refresh} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={paged.loadMore}
          ListFooterComponent={paged.more ? <ActivityIndicator color={colors.primary} /> : null}
          ListEmptyComponent={
            <EmptyState icon={mode === 'liked' ? 'heart' : 'doc'} title={mode === 'liked' ? '좋아요한 글이 없어요' : '아직 작성한 글이 없어요'} />
          }
          renderItem={({ item }) => (
            <CompactBoardCard
              board={item}
              onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })}
              right={
                mode === 'liked' ? (
                  <Pressable onPress={() => toggleLike(item)} hitSlop={8}>
                    <Icon name="heart" size={19} color={colors.heart} filled={item.liked} />
                  </Pressable>
                ) : undefined
              }
              footer={
                mode === 'mine' && item.status === 'IN_PROGRESS' && item.waitingCount > 0 ? (
                  <Pressable style={styles.requestLink} onPress={() => navigation.navigate('ReservationManage', { boardId: item.id })}>
                    <Text style={styles.requestLinkText}>요청 {item.waitingCount}건 보기</Text>
                    <Icon name="chevron" size={13} color={colors.primaryDark} />
                  </Pressable>
                ) : undefined
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

export function LikedBoardsScreen({ navigation }: ScreenProps<'LikedBoards'>) {
  return <BoardListScreen mode="liked" navigation={navigation} />;
}

export function MyPostsScreen({ navigation }: ScreenProps<'MyPosts'>) {
  return <BoardListScreen mode="mine" navigation={navigation as ScreenProps<'LikedBoards'>['navigation']} />;
}

const styles = StyleSheet.create({
  requestLink: { alignSelf: 'flex-start', marginTop: 7, height: 26, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 8, backgroundColor: colors.primarySoft2 },
  requestLinkText: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '700' },
});
