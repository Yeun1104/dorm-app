import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import type { Board, BoardStatus } from '../../api/types';
import { ProductCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, LoadingView, Screen, SearchBox } from '../../components/ui';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font, shadow } from '../../theme';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatus | undefined>('IN_PROGRESS');
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

  const toggleStatusFilter = () => {
    const next = statusFilter ? undefined : 'IN_PROGRESS';
    setStatusFilter(next);
    queryRef.current = { ...queryRef.current, status: next };
    load(0, 'initial');
  };

  const search = () => {
    queryRef.current = { ...queryRef.current, keyword };
    load(0, 'initial');
  };

  const header = (
    <View>
      <SearchBox value={keyword} onChangeText={setKeyword} onSubmit={search} placeholder="필요한 물건을 검색해보세요" />

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>오늘의 공동구매</Text>
          </View>
          <Text style={styles.heroTitle}>
            같이 사면{'\n'}
            <Text style={{ color: colors.primaryDeep }}>가격은 반으로!</Text>
          </Text>
          <Text style={styles.heroSub}>기숙사 이웃과 알뜰하게 나눠요</Text>
        </View>
        <View style={styles.bag}>
          <View style={styles.bagHandle} />
          <Text style={styles.bagText}>8</Text>
          <View style={styles.bagDot} />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>{statusFilter ? '지금 모집 중' : '전체 공동구매'}</Text>
          <Text style={styles.sectionSub}>{statusFilter ? '내 주변의 따끈한 공동구매예요' : '모집완료된 글까지 모두 보여줘요'}</Text>
        </View>
        <Pressable onPress={toggleStatusFilter} hitSlop={8}>
          <Text style={styles.sectionBtn}>{statusFilter ? '전체보기' : '모집중만'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>숭실대 기숙사 공동구매</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.brand}>숭팔이</Text>
            <View style={styles.mascot}>
              <Text style={styles.mascotText}>8</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.iconButton} onPress={() => navigation.navigate('ReservationManage', {})} accessibilityLabel="거래 요청">
          <Icon name="bell" />
        </Pressable>
      </View>

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
          ListEmptyComponent={<EmptyState icon="search" title={queryRef.current.keyword ? '검색 결과가 없어요' : '아직 모집 중인 공동구매가 없어요'} message="첫 공동구매를 열어보세요!" />}
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
  header: { height: 78, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.textSub, fontSize: font.xs, fontWeight: '600', marginBottom: 2 },
  brand: { fontSize: font.title, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  mascot: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  mascotText: { color: 'white', fontSize: 16, fontWeight: '800' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0f4f2', alignItems: 'center', justifyContent: 'center' },

  hero: { marginTop: 17, marginBottom: 24, minHeight: 164, overflow: 'hidden', borderRadius: 24, padding: 22, backgroundColor: '#dcf0f5', flexDirection: 'row' },
  heroChip: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: 'white' },
  heroChipText: { fontSize: font.xs, color: colors.primaryDeep, fontWeight: '700' },
  heroTitle: { marginTop: 12, marginBottom: 6, fontSize: 23, lineHeight: 31, fontWeight: '800', color: '#244e61', letterSpacing: -0.8 },
  heroSub: { fontSize: font.sm, color: '#5d756d' },
  bag: { position: 'absolute', right: 22, bottom: -8, width: 90, height: 102, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  bagHandle: { position: 'absolute', top: -18, width: 48, height: 35, borderWidth: 7, borderBottomWidth: 0, borderColor: colors.primaryLight, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bagText: { color: 'white', fontSize: 39, fontWeight: '900', transform: [{ rotate: '-5deg' }] },
  bagDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffd675', top: 20, right: 17 },

  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 3 },
  sectionSub: { fontSize: font.xs, color: '#86908c' },
  sectionBtn: { color: '#75807c', fontSize: font.sm },

  fab: { position: 'absolute', right: 20, bottom: 20, height: 50, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 25, backgroundColor: colors.primary, ...shadow.fab },
  fabText: { color: 'white', fontSize: font.md, fontWeight: '700' },
});
