import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import type { Board, BoardStatus } from '../../api/types';
import { ProductCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, LoadingView, PageHeader, Screen, SearchBox } from '../../components/ui';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font, shadow } from '../../theme';

type StatusFilter = 'ALL' | BoardStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string; title: string; sub: string }[] = [
  { value: 'ALL', label: '전체보기', title: '전체 공동구매', sub: '모집중 · 거래완료 글을 모두 보여줘요' },
  { value: 'IN_PROGRESS', label: '모집중', title: '지금 모집 중', sub: '내 주변의 따끈한 공동구매예요' },
  { value: 'COMPLETED', label: '거래완료', title: '거래완료', sub: '모집이 끝난 공동구매예요' },
];

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('IN_PROGRESS');
  const [boards, setBoards] = useState<Board[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // 입력 중인 검색어와 구분해서, 실제로 조회에 쓰인 조건을 기억 (재조회/더보기 시 동일 조건 유지)
  const queryRef = useRef<{ keyword: string; status?: BoardStatus }>({ keyword: '', status: 'IN_PROGRESS' });

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more' | 'silent') => {
      const { keyword: kw, status } = queryRef.current;
      const id = ++reqId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const res = await boardApi.list({ page: targetPage, keyword: kw.trim(), status });
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

  const changeStatusFilter = (next: StatusFilter) => {
    if (next === statusFilter) return;
    setStatusFilter(next);
    queryRef.current = { ...queryRef.current, status: next === 'ALL' ? undefined : next };
    load(0, 'initial');
  };

  const search = () => {
    queryRef.current = { ...queryRef.current, keyword };
    load(0, 'initial');
  };

  const toggleSearch = () => {
    if (searchOpen) {
      // 검색창을 닫으면 검색 조건도 초기화
      setKeyword('');
      if (queryRef.current.keyword) {
        queryRef.current = { ...queryRef.current, keyword: '' };
        load(0, 'initial');
      }
    }
    setSearchOpen((v) => !v);
  };

  const filter = STATUS_FILTERS.find((f) => f.value === statusFilter)!;

  const header = (
    <View>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>당신의 기숙사 생활을{'\n'}보다 편리하게 돕습니다.</Text>
        <Text style={styles.bannerSign}>- 숭편한세상</Text>
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => {
          const active = f.value === statusFilter;
          return (
            <Pressable key={f.value} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => changeStatusFilter(f.value)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{filter.title}</Text>
        <Text style={styles.sectionSub}>{filter.sub}</Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <PageHeader
        title="공동구매"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.iconButton, searchOpen && styles.iconButtonActive]} onPress={toggleSearch} accessibilityLabel="검색">
              <Icon name={searchOpen ? 'close' : 'search'} color={searchOpen ? 'white' : undefined} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => toast('새로운 알림이 없어요')} accessibilityLabel="알림">
              <Icon name="bell" />
            </Pressable>
          </View>
        }
      />
      {searchOpen && (
        <View style={styles.searchWrap}>
          <SearchBox value={keyword} onChangeText={setKeyword} onSubmit={search} placeholder="필요한 물건을 검색해보세요" autoFocus />
        </View>
      )}

      {loading && boards.length === 0 ? (
        <LoadingView />
      ) : error && boards.length === 0 ? (
        <ErrorView message={error} onRetry={() => load(0, 'initial')} />
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="search" title={queryRef.current.keyword ? '검색 결과가 없어요' : statusFilter === 'COMPLETED' ? '거래완료된 공동구매가 없어요' : '아직 모집 중인 공동구매가 없어요'} message={statusFilter === 'COMPLETED' ? undefined : '첫 공동구매를 열어보세요!'} />}
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

      <Pressable style={styles.fab} onPress={() => navigation.navigate('BoardWrite')}>
        <Icon name="plus" color="white" />
        <Text style={styles.fabText}>글쓰기</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0f4f2', alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: colors.primary },
  searchWrap: { paddingHorizontal: 18, paddingBottom: 8 },

  banner: { marginTop: 8, marginBottom: 18, paddingVertical: 20, paddingHorizontal: 22, borderRadius: 20, backgroundColor: '#dcf0f5' },
  bannerText: { fontSize: 17, lineHeight: 25, fontWeight: '700', color: '#244e61', letterSpacing: -0.5 },
  bannerSign: { marginTop: 8, alignSelf: 'flex-end', fontSize: font.sm, fontWeight: '600', color: colors.primaryDeep },

  filters: { marginBottom: 16, flexDirection: 'row', gap: 7 },
  filterPill: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#e0e6e3', backgroundColor: 'white', justifyContent: 'center' },
  filterPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  filterText: { fontSize: font.sm, color: '#77827e' },
  filterTextActive: { color: 'white', fontWeight: '700' },

  sectionHeading: { marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 3 },
  sectionSub: { fontSize: font.xs, color: '#86908c' },

  fab: { position: 'absolute', right: 20, bottom: 20, height: 50, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 25, backgroundColor: colors.primary, ...shadow.fab },
  fabText: { color: 'white', fontSize: font.md, fontWeight: '700' },
});
