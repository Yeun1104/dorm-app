import { useEffect, useState } from 'react';
import { boardApi } from '../api/board';
import type { Board } from '../api/types';

// 참여내역/채팅목록 응답엔 boardId만 있어서 게시글 제목/이미지를 따로 조회해야 함.
// 같은 게시글을 여러 화면에서 반복 조회하지 않도록 간단한 메모리 캐시를 둠.
const cache = new Map<number, Promise<Board | null>>();

export function fetchBoardCached(id: number, force = false): Promise<Board | null> {
  if (force || !cache.has(id)) {
    cache.set(
      id,
      boardApi.detail(id).catch(() => {
        cache.delete(id);
        return null;
      }),
    );
  }
  return cache.get(id)!;
}

export function invalidateBoard(id: number) {
  cache.delete(id);
}

export function clearBoardCache() {
  cache.clear();
}

/** ids에 해당하는 게시글 맵. 삭제된 글 등 조회 실패한 건 null */
export function useBoards(ids: number[]): Record<number, Board | null> {
  const [boards, setBoards] = useState<Record<number, Board | null>>({});
  const key = [...new Set(ids)].sort().join(',');

  useEffect(() => {
    let alive = true;
    const unique = key ? key.split(',').map(Number) : [];
    Promise.all(unique.map((id) => fetchBoardCached(id).then((b) => [id, b] as const))).then((entries) => {
      if (alive) setBoards(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return boards;
}
