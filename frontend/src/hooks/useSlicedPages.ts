import { useFocusEffect } from '@react-navigation/native';
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

/**
 * 서버(=기숙사 사이트)는 한 페이지에 serverSize개씩 주는데, 폰 한 화면에 스크롤 없이 들어오도록
 * uiSize개씩 다시 잘라서 보여주는 페이징.
 * - 필요한 서버 페이지만 받아서 캐시하고, 화면 페이지 경계가 서버 페이지 끝에 걸리면 다음 서버 페이지를 미리 받아
 *   '다음' 버튼 활성 여부를 정확히 판단함
 * - deps(검색어 등)가 바뀌면 캐시를 비우고 첫 페이지부터
 * - 화면에 다시 들어오면(글 작성 후 등) 캐시를 비우고 현재 페이지를 조용히 다시 받음
 */
export function useSlicedPages<T>(fetchPage: (serverPage: number) => Promise<T[]>, serverSize: number, uiSize: number, deps: DependencyList) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[] | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<number, T[]>());
  const reqId = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const serverPage = useCallback(async (sp: number) => {
    const hit = cache.current.get(sp);
    if (hit) return hit;
    const list = await fetchRef.current(sp);
    cache.current.set(sp, list);
    return list;
  }, []);

  const load = useCallback(
    async (uiPage: number, mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++reqId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const start = uiPage * uiSize;
        const end = start + uiSize;
        const first = Math.floor(start / serverSize);
        const collected: T[] = [];
        // 이 화면 페이지 + (다음이 있는지 알 수 있을 만큼) 서버 페이지를 차례로 받음
        let sp = first;
        while (first * serverSize + collected.length < end + 1) {
          const list = await serverPage(sp);
          collected.push(...list);
          if (list.length < serverSize) break; // 마지막 서버 페이지
          sp++;
        }
        if (id !== reqId.current) return;
        const offset = start - first * serverSize;
        setItems(collected.slice(offset, offset + uiSize));
        // 루프가 페이지 끝 다음 1개까지 받아두므로, 그게 있으면 다음 페이지가 있음
        setHasNext(collected.length > offset + uiSize);
        setPage(uiPage);
        setError(null);
      } catch (e) {
        if (id === reqId.current && mode !== 'silent') setError(errorMessage(e));
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [serverPage, serverSize, uiSize],
  );

  // 조건이 바뀌면 처음부터
  useEffect(() => {
    cache.current.clear();
    load(0, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // 다시 들어오면 최신 목록으로 (첫 진입은 위 effect가 처리)
  const pageRef = useRef(page);
  pageRef.current = page;
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) {
        cache.current.clear();
        load(pageRef.current, 'silent');
      }
      focused.current = true;
    }, [load]),
  );

  return {
    items,
    page,
    hasNext,
    loading,
    refreshing,
    error,
    goTo: (p: number) => load(p, 'initial'),
    reload: () => load(page, 'initial'),
    refresh: () => {
      cache.current.clear();
      load(page, 'refresh');
    },
  };
}
