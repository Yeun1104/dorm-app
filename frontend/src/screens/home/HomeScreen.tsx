import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import { notificationApi } from '../../api/notification';
import type { Board } from '../../api/types';
import { ProductCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { CountBadge, EmptyState, ErrorView, Fab, LoadingView, PageHeader, Screen } from '../../components/ui';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const toast = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more' | 'silent') => {
      const id = ++reqId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        // 모집 상태 구분 없이 최근 게시글 순
        const res = await boardApi.list({ page: targetPage });
        if (id !== reqId.current) return;
        setBoards((prev) => (targetPage === 0 ? res.boards : [...prev, ...res.boards]));
        setPage(res.currentPage);
        setTotalPages(res.totalPages);
        setError(null);
      } catch (e) {
        if (id === reqId.current && mode !== 'silent') {
          if (mode === 'more') toast(errorMessage(e));
          else setError(errorMessage(e));
        }
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [toast],
  );

  // 상세에서 참여/좋아요 후 돌아오면 게이지·대기인원이 바뀌어 있으니 첫 페이지를 조용히 갱신
  const loaded = useRef(false);
  // 안 읽은 알림 수 (종 아이콘 배지) — 알림함에서 읽고 돌아오면 줄어들도록 포커스마다 갱신
  const [unread, setUnread] = useState(0);
  useFocusEffect(
    useCallback(() => {
      notificationApi.unreadCount().then(setUnread).catch(() => {});
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      load(0, loaded.current ? 'silent' : 'initial');
      loaded.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const toggleLike = useLikeToggle((updated) =>
    setBoards((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))),
  );

  const header = (
    <View>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>당신의 기숙사 생활을{'\n'}보다 편리하게 돕습니다.</Text>
        <Text style={styles.bannerSign}>- 숭편한세상</Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <PageHeader
        title="공동구매"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.iconButton} onPress={() => navigation.navigate('BoardSearch')} accessibilityLabel="검색">
              <Icon name="search" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => navigation.navigate('Notifications')} accessibilityLabel="알림">
              <Icon name="bell" />
              <CountBadge count={unread} style={{ top: -3, right: -3 }} />
            </Pressable>
          </View>
        }
      />

      {loading && boards.length === 0 ? (
        <LoadingView />
      ) : error && boards.length === 0 ? (
        <ErrorView message={error} onRetry={() => load(0, 'initial')} />
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(b) => String(b.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="doc" title="아직 올라온 공동구매가 없어요" message="첫 공동구매를 열어보세요!" />}
          renderItem={({ item }) => (
            <ProductCard
              board={item}
              onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })}
              onToggleLike={() => toggleLike(item)}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loadingMore && page + 1 < totalPages) load(page + 1, 'more');
          }}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(0, 'refresh')} tintColor={colors.primary} />}
        />
      )}

      <Fab label="글쓰기" onPress={() => navigation.navigate('BoardWrite')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0f4f2', alignItems: 'center', justifyContent: 'center' },

  banner: { marginTop: 8, marginBottom: 18, paddingVertical: 20, paddingHorizontal: 22, borderRadius: 20, backgroundColor: '#dcf0f5' },
  bannerText: { fontSize: 17, lineHeight: 25, fontWeight: '700', color: '#244e61', letterSpacing: -0.5 },
  bannerSign: { marginTop: 8, alignSelf: 'flex-end', fontSize: font.sm, fontWeight: '600', color: colors.primaryDeep },

});
