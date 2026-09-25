import type { Board } from '../api/types';
import { historySettings } from './historySettings';
import { prefs } from './prefs';

/** 최근 본 게시글 (기기에만 저장, 최신순 최대 10개) */
export type RecentBoard = Pick<Board, 'id' | 'title' | 'unitPrice' | 'status'> & { imageUrl: string | null };

const KEY = 'recentBoards';
const MAX = 10;

export const recentBoards = {
  get: () => prefs.get<RecentBoard[]>(KEY, []),

  async add(board: Board) {
    if (!(await historySettings.get()).viewed) return; // 설정에서 기록 끔
    const item: RecentBoard = { id: board.id, title: board.title, unitPrice: board.unitPrice, status: board.status, imageUrl: board.images[0]?.imageUrl ?? null };
    const list = await recentBoards.get();
    await prefs.set(KEY, [item, ...list.filter((b) => b.id !== board.id)].slice(0, MAX));
  },

  async remove(id: number) {
    await prefs.set(KEY, (await recentBoards.get()).filter((b) => b.id !== id));
  },

  clear: () => prefs.set<RecentBoard[]>(KEY, []),
};
