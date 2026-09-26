import { useFocusEffect } from '@react-navigation/native';
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

/** 페이지 번호를 몇 개씩 묶어 보여줄지 (1~5, 6~10 …) */
export const PAGE_BLOCK = 5;

/**
 * 서버(=기숙사 사이트)는 한 페이지에 serverSize개씩 주는데, 폰 한 화면에 스크롤 없이 들어오도록
 * uiSize개씩 다시 잘라서 보여주는 페이징. 사이트가 전체 개수를 안 알려줘서 번호 묶음(PAGE_BLOCK개) 단위로 파악함.
 * 1) 지금 페이지를 보여줄 만큼만 먼저 받아 바로 표시
 * 2) 이어서 같은 묶음의 나머지(+다음 묶음 존재 여부 확인용 1개)를 뒤에서 받아 번호 개수를 채움
 * - 받은 서버 페이지는 캐시. deps(검색어 등)가 바뀌거나 화면에 다시 들어오면 캐시를 비움
 */
export function useSlicedPages<T>(
  fetchPage: (serverPage: number) => Promise<T[]>,
  serverSize: number,
  uiSize: number,
  deps: DependencyList,
  /** true면 번호 묶음(1~5) 개수까지 뒤에서 채움. false면 현재 페이지 + 다음 존재 여부만 (SimplePager용) */
  countBlock = false,
) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[] | null>(null);
  const [pagesInBlock, setPagesInBlock] = useState(1);
  const [hasNextBlock, setHasNextBlock] = useState(false);
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

      const blockSize = PAGE_BLOCK * uiSize;
      const blockStart = Math.floor(uiPage / PAGE_BLOCK) * blockSize;
      const first = Math.floor(blockStart / serverSize);
      const base = first * serverSize; // collected[0]의 전체 기준 위치
      const collected: T[] = [];
      let sp = first;
      let ended = false;
      /** 전체 기준 upTo개(미만)까지 모일 때까지 서버 페이지를 차례로 받음 */
      const fillUntil = async (upTo: number) => {
        while (!ended && base + collected.length < upTo) {
          const list = await serverPage(sp);
          collected.push(...list);
          if (list.length < serverSize) ended = true; // 마지막 서버 페이지
          sp++;
        }
      };
      const apply = () => {
        const inBlock = Math.max(0, Math.min(collected.length - (blockStart - base), blockSize));
        setPagesInBlock(Math.max(1, Math.ceil(inBlock / uiSize)));
        // 묶음 끝 다음 1개까지 받아두므로, 그게 있으면 다음 묶음이 있음
        setHasNextBlock(collected.length - (blockStart - base) > blockSize);
      };

      try {
        // 1) 현재 페이지 (+ 다음 페이지 존재 확인용 1개)
        const start = uiPage * uiSize;
        await fillUntil(start + uiSize + 1);
        if (id !== reqId.current) return;
        setItems(collected.slice(start - base, start - base + uiSize));
        setHasNext(collected.length > start - base + uiSize);
        setPage(uiPage);
        apply();
        setError(null);
      } catch (e) {
        if (id === reqId.current && mode !== 'silent') setError(errorMessage(e));
        return;
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }

      // 2) 같은 묶음의 나머지는 뒤에서 (번호 개수·다음 묶음 여부)
      if (!countBlock) return;
      try {
        await fillUntil(blockStart + blockSize + 1);
        if (id === reqId.current) apply();
      } catch {
        // 번호 채우기 실패는 조용히 무시 (지금 페이지는 이미 표시됨)
      }
    },
    [serverPage, serverSize, uiSize, countBlock],
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
    /** 현재 번호 묶음(1~5 등)에 실제로 있는 페이지 수 */
    pagesInBlock,
    hasNextBlock,
    /** 현재 페이지 다음 페이지가 있는지 */
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
