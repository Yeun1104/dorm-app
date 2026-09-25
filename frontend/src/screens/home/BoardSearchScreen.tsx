import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../../api/board';
import { errorMessage } from '../../api/client';
import type { Board, BoardStatus } from '../../api/types';
import { ProductCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { EmptyState, ErrorView, LoadingView, Screen, SearchBox, Thumb } from '../../components/ui';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import type { ScreenProps } from '../../navigation/types';
import { colors, font, shadow } from '../../theme';
import { won } from '../../utils/format';
import { prefs } from '../../utils/prefs';
import { RecentBoard, recentBoards } from '../../utils/recentBoards';

type StatusFilter = 'ALL' | BoardStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'IN_PROGRESS', label: '모집중' },
  { value: 'COMPLETED', label: '모집완료' },
];

const HISTORY_KEY = 'recentSearches';
const HISTORY_MAX = 10;

/** 이만큼 내려가면 '맨 위로' 버튼 노출 */
const SCROLL_TOP_FROM = 400;

/** 공동구매 검색 결과만 보여주는 화면 */
export default function BoardSearchScreen({ navigation }: ScreenProps<'BoardSearch'>) {
  const toast = useToast();
  const listRef = useRef<FlatList<Board>>(null);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [boards, setBoards] = useState<Board[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const reqId = useRef(0);

  const [recent, setRecent] = useState<RecentBoard[]>([]);

  useEffect(() => {
    prefs.get<string[]>(HISTORY_KEY, []).then(setHistory);
  }, []);

  // 상세 보고 돌아오면 최근 본 글이 바뀌어 있으니 포커스마다 다시 읽음
  useFocusEffect(
    useCallback(() => {
      recentBoards.get().then(setRecent);
    }, []),
  );

  // 탭바는 검색 결과를 보는 동안 숨김 (RootNavigator가 이 값을 봄)
  useEffect(() => {
    navigation.setParams({ searched });
  }, [navigation, searched]);

  const saveHistory = (next: string[]) => {
    setHistory(next);
    prefs.set(HISTORY_KEY, next).catch(() => {});
  };
  // 입력 중인 검색어와 구분해서, 실제 조회에 쓴 조건을 기억 (더보기/탭 전환 시 같은 검색어 유지)
  const queryRef = useRef<{ keyword: string; status?: BoardStatus }>({ keyword: '' });

  const load = useCallback(
    async (targetPage: number) => {
      const { keyword: kw, status } = queryRef.current;
      const id = ++reqId.current;
      if (targetPage === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await boardApi.list({ page: targetPage, keyword: kw, status });
        if (id !== reqId.current) return;
        setBoards((prev) => (targetPage === 0 ? res.boards : [...prev, ...res.boards]));
        setPage(res.currentPage);
        setTotalPages(res.totalPages);
        setError(null);
      } catch (e) {
        if (id !== reqId.current) return;
        if (targetPage === 0) setError(errorMessage(e));
        else toast(errorMessage(e));
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [toast],
  );

  const search = (text = keyword) => {
    const kw = text.trim();
    if (!kw) return;
    setKeyword(kw);
    saveHistory([kw, ...history.filter((h) => h !== kw)].slice(0, HISTORY_MAX));
    queryRef.current = { ...queryRef.current, keyword: kw };
    setSearched(true);
    setBoards([]);
    load(0);
  };

  /** 검색어 지우고 최근 검색 기록 화면으로 */
  const clear = () => {
    reqId.current++;
    setKeyword('');
    setSearched(false);
    setBoards([]);
    setError(null);
    setLoading(false);
    setShowTop(false);
  };

  const changeFilter = (next: StatusFilter) => {
    if (next === filter) return;
    setFilter(next);
    queryRef.current = { ...queryRef.current, status: next === 'ALL' ? undefined : next };
    if (queryRef.current.keyword) load(0);
  };

  const toggleLike = useLikeToggle((updated) => setBoards((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > SCROLL_TOP_FROM;
    if (next !== showTop) setShowTop(next);
  };

  let body;
  if (!searched)
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}>
        <View style={styles.historyHead}>
          <Text style={styles.historyTitle}>최근 검색</Text>
          {history.length > 0 && (
            <Pressable onPress={() => saveHistory([])} hitSlop={8}>
              <Text style={styles.historyClear}>전체 삭제</Text>
            </Pressable>
          )}
        </View>
        {history.length === 0 ? (
          <Text style={styles.historyEmpty}>최근 검색 기록이 없어요</Text>
        ) : (
          history.map((h) => (
            <Pressable key={h} style={styles.historyRow} onPress={() => search(h)}>
              <Icon name="search" size={16} color={colors.textFaint} />
              <Text style={styles.historyText} numberOfLines={1}>{h}</Text>
              <Pressable onPress={() => saveHistory(history.filter((x) => x !== h))} hitSlop={10} accessibilityLabel={`${h} 삭제`}>
                <Icon name="close" size={15} color={colors.textFaint} />
              </Pressable>
            </Pressable>
          ))
        )}

        {recent.length > 0 && (
          <>
            <Text style={[styles.historyTitle, { marginTop: 28, marginBottom: 12 }]}>최근 본 게시글</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}>
              {recent.map((b) => (
                <Pressable key={b.id} style={styles.recentCard} onPress={() => navigation.navigate('BoardDetail', { boardId: b.id })}>
                  <Thumb uri={b.imageUrl} size={116} radius={14} />
                  <Text style={styles.recentTitle} numberOfLines={1}>{b.title}</Text>
                  <Text style={styles.recentPrice}>
                    {won(b.unitPrice)}
                    {b.status !== 'IN_PROGRESS' && <Text style={styles.recentDone}>  모집완료</Text>}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    );
  else if (loading && boards.length === 0) body = <LoadingView />;
  else if (error && boards.length === 0) body = <ErrorView message={error} onRetry={() => load(0)} />;
  else
    body = (
      <FlatList
        ref={listRef}
        data={boards}
        keyExtractor={(b) => String(b.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<EmptyState icon="search" title="검색 결과가 없어요" message="다른 검색어로 찾아보세요." />}
        renderItem={({ item }) => (
          <ProductCard board={item} onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })} onToggleLike={() => toggleLike(item)} />
        )}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && !loadingMore && page + 1 < totalPages) load(page + 1);
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} /> : null}
      />
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="뒤로가기">
          <Icon name="back" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <SearchBox value={keyword} onChangeText={setKeyword} onSubmit={() => search()} placeholder="필요한 물건을 검색해보세요" autoFocus />
        </View>
        <Pressable style={styles.close} onPress={clear} hitSlop={8} accessibilityLabel="검색어 지우기">
          <Icon name="close" size={20} />
        </Pressable>
      </View>
      {searched && (
        <View style={styles.pills}>
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Pressable key={f.value} style={[styles.pill, active && styles.pillActive]} onPress={() => changeFilter(f.value)}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {body}

      {showTop && (
        <Pressable style={styles.toTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} accessibilityLabel="맨 위로">
          <Icon name="up" size={20} color={colors.text} />
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingLeft: 8, paddingRight: 10, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  close: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  pills: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', gap: 7 },
  pill: { height: 34, paddingHorizontal: 15, borderRadius: 17, borderWidth: 1, borderColor: '#e0e6e3', backgroundColor: 'white', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.text, borderColor: colors.text },
  pillText: { fontSize: font.sm, fontWeight: '600', color: '#77827e' },
  pillTextActive: { color: 'white', fontWeight: '700' },
  historyHead: { marginTop: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { fontSize: font.base, fontWeight: '800', color: colors.text },
  historyClear: { fontSize: font.sm, color: colors.textMuted },
  historyEmpty: { marginTop: 18, textAlign: 'center', fontSize: font.sm, color: colors.textMuted },
  historyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  recentCard: { width: 116 },
  recentTitle: { marginTop: 7, fontSize: font.sm, fontWeight: '600', color: colors.text },
  recentPrice: { marginTop: 2, fontSize: font.sm, fontWeight: '800', color: colors.text },
  recentDone: { fontSize: font.xs, fontWeight: '600', color: colors.textFaint },
  historyText: { flex: 1, fontSize: font.base, color: colors.textBody },
  toTop: { position: 'absolute', right: 20, bottom: 28, width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#e4e9e7', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.card },
});
