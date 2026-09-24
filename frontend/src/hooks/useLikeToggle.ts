import { useCallback, useRef } from 'react';
import { boardApi } from '../api/board';
import { errorMessage } from '../api/client';
import type { Board } from '../api/types';
import { useToast } from '../components/Feedback';
import { invalidateBoard } from './useBoards';

type LikePatch = Pick<Board, 'id' | 'liked' | 'likeCount'>;

/** 좋아요 낙관적 업데이트 → 서버 count로 보정, 실패 시 롤백 */
export function useLikeToggle(apply: (patch: LikePatch) => void) {
  const toast = useToast();
  const inFlight = useRef(new Set<number>());

  return useCallback(
    async (board: LikePatch) => {
      if (inFlight.current.has(board.id)) return;
      inFlight.current.add(board.id);
      const nextLiked = !board.liked;
      apply({ id: board.id, liked: nextLiked, likeCount: board.likeCount + (nextLiked ? 1 : -1) });
      try {
        const res = nextLiked ? await boardApi.like(board.id) : await boardApi.unlike(board.id);
        apply({ id: board.id, liked: nextLiked, likeCount: res.count });
        invalidateBoard(board.id);
      } catch (e) {
        apply(board);
        toast(errorMessage(e));
      } finally {
        inFlight.current.delete(board.id);
      }
    },
    [apply, toast],
  );
}
