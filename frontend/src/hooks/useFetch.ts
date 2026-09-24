import { useFocusEffect } from '@react-navigation/native';
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

interface Options {
  /** 화면에 다시 돌아올 때마다 조용히 재조회 (다른 화면에서 상태가 바뀌는 경우) */
  refetchOnFocus?: boolean;
  enabled?: boolean;
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList, { refetchOnFocus = false, enabled = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    const id = ++requestId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      // 조용한 재조회 실패는 기존 데이터를 유지
      if (mode !== 'silent') setError(errorMessage(e));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (refetchOnFocus && enabled) run('silent');
    }, [refetchOnFocus, enabled, run]),
  );

  return {
    data,
    setData,
    error,
    loading,
    refreshing,
    reload: useCallback(() => run('initial'), [run]),
    refresh: useCallback(() => run('refresh'), [run]),
    silentReload: useCallback(() => run('silent'), [run]),
  };
}
