import type { Board } from '../api/types';
import { prefs } from './prefs';

/** 최근 본 게시글 (기기에만 저장, 최신순 최대 10개) */
export type RecentBoard = Pick<Board, 'id' | 'title' | 'unitPrice' | 'status'> & { imageUrl: string | null };

const KEY = 'recentBoards';
const MAX = 10;

export const recentBoards = {
  get: () => prefs.get<RecentBoard[]>(KEY, []),

  async add(board: Board) {
    const item: RecentBoard = { id: board.id, title: board.title, unitPrice: board.unitPrice, status: board.status, imageUrl: board.images[0]?.imageUrl ?? null };
    const list = await recentBoards.get();
    await prefs.set(KEY, [item, ...list.filter((b) => b.id !== board.id)].slice(0, MAX));
  },
};
