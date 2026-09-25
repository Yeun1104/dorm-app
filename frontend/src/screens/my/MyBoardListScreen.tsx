import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, GestureResponderEvent, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import type { Board, BoardPage } from '../../api/types';
import { userApi } from '../../api/user';
import { CompactBoardCard } from '../../components/BoardCard';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, Fab, LoadingView, Screen, SegmentedTabs, SubHeader } from '../../components/ui';
import { invalidateBoard } from '../../hooks/useBoards';
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

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

function BoardListScreen({ mode, navigation }: { mode: 'liked' | 'mine'; navigation: ScreenProps<'LikedBoards'>['navigation'] }) {
  const paged = usePagedBoards(mode === 'liked' ? userApi.likedBoards : userApi.myBoards);
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  // ••• 누른 글과 말풍선 위치(누른 지점 바로 아래)
  const [menu, setMenu] = useState<{ board: Board; top: number } | null>(null);
  const mine = mode === 'mine';
  const boards = mine && filter !== 'ALL' ? paged.boards.filter((b) => (filter === 'IN_PROGRESS' ? b.status === 'IN_PROGRESS' : b.status !== 'IN_PROGRESS')) : paged.boards;

  const openMenu = (board: Board, e: GestureResponderEvent) => setMenu({ board, top: e.nativeEvent.pageY + 14 });

  const editBoard = (b: Board) => {
    setMenu(null);
    navigation.navigate('BoardWrite', { boardId: b.id });
  };

  const deleteBoard = async (b: Board) => {
    setMenu(null);
    // 말풍선(Modal)이 닫히는 중에 확인창(Modal)을 띄우면 iOS에서 안 뜰 수 있어서 닫힌 뒤에 띄움
    await new Promise((r) => setTimeout(r, 350));
    const ok = await confirm({ title: '게시글을 삭제할까요?', message: '삭제하면 되돌릴 수 없어요.', confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      await boardApi.remove(b.id);
      invalidateBoard(b.id);
      paged.setBoards((prev) => prev.filter((x) => x.id !== b.id));
      toast('게시글을 삭제했어요');
    } catch (e) {
      toast(errorMessage(e));
    }
  };
  const toggleLike = useLikeToggle((patch) =>
    // 좋아요 해제하면 목록에서 바로 빠지도록
    paged.setBoards((prev) => (patch.liked ? prev.map((b) => (b.id === patch.id ? { ...b, ...patch } : b)) : prev.filter((b) => b.id !== patch.id))),
  );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title={mode === 'liked' ? '좋아요한 글' : '내가 쓴 글'}
        subtitle={mode === 'liked' ? '관심 있는 공동구매를 모았어요' : '내가 만든 공동구매를 관리해요'}
      />
      {mine && (
        <SegmentedTabs
          tabs={[
            { value: 'ALL', label: '전체' },
            { value: 'IN_PROGRESS', label: '모집중' },
            { value: 'COMPLETED', label: '모집완료' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      )}
      {paged.loading ? (
        <LoadingView />
      ) : paged.error && !paged.boards.length ? (
        <ErrorView message={paged.error} onRetry={paged.reload} />
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 18, paddingBottom: mode === 'mine' ? 100 : 40 }}
          refreshControl={<RefreshControl refreshing={paged.refreshing} onRefresh={paged.refresh} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={paged.loadMore}
          ListFooterComponent={paged.more ? <ActivityIndicator color={colors.primary} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={mode === 'liked' ? 'heart' : 'doc'}
              title={mode === 'liked' ? '좋아요한 글이 없어요' : filter === 'IN_PROGRESS' ? '모집중인 글이 없어요' : filter === 'COMPLETED' ? '모집완료된 글이 없어요' : '아직 작성한 글이 없어요'}
            />
          }
          renderItem={({ item }) => (
            <CompactBoardCard
              board={item}
              onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })}
              top={
                mine ? (
                  <View style={styles.cardTop}>
                    <Text style={[styles.status, item.status !== 'IN_PROGRESS' && styles.statusDone]}>{item.status === 'IN_PROGRESS' ? '모집중' : '모집완료'}</Text>
                    <Pressable onPress={(e) => openMenu(item, e)} hitSlop={10} style={styles.more}>
                      <Text style={styles.moreText}>•••</Text>
                    </Pressable>
                  </View>
                ) : undefined
              }
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
      {mine && <Fab label="글쓰기" onPress={() => navigation.navigate('BoardWrite')} />}

      <Modal transparent visible={!!menu} animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
        {menu && (
          <View style={[styles.bubble, { top: menu.top }]}>
            <View style={styles.bubbleTail} />
            <Pressable style={styles.bubbleItem} onPress={() => editBoard(menu.board)}>
              <Text style={styles.bubbleText}>수정</Text>
            </Pressable>
            <View style={styles.bubbleDivider} />
            <Pressable style={styles.bubbleItem} onPress={() => deleteBoard(menu.board)}>
              <Text style={[styles.bubbleText, { color: colors.danger }]}>삭제</Text>
            </Pressable>
          </View>
        )}
      </Modal>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: font.sm, fontWeight: '800', color: colors.text },
  statusDone: { color: colors.textFaint },
  more: { paddingHorizontal: 4 },
  moreText: { color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  bubble: { position: 'absolute', right: 26, width: 110, paddingVertical: 4, borderRadius: 12, backgroundColor: 'white', shadowColor: '#1f414e', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  bubbleTail: { position: 'absolute', top: -6, right: 12, width: 12, height: 12, backgroundColor: 'white', transform: [{ rotate: '45deg' }] },
  bubbleItem: { paddingHorizontal: 16, paddingVertical: 11 },
  bubbleText: { fontSize: font.md, fontWeight: '600', color: colors.text },
  bubbleDivider: { height: 1, marginHorizontal: 10, backgroundColor: colors.borderLight },
  requestLink: { alignSelf: 'flex-start', marginTop: 7, height: 26, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 8, backgroundColor: colors.primarySoft2 },
  requestLinkText: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '700' },
});
