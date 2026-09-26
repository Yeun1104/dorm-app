import { prefs } from './prefs';

/** 설정 > 기록: 최근 검색어 / 최근 본 게시글을 기기에 남길지 */
export const HISTORY_SETTINGS_DEFAULTS = { search: true, viewed: true };
export type HistorySettings = typeof HISTORY_SETTINGS_DEFAULTS;

const KEY = 'historySettings';

export const historySettings = {
  get: () => prefs.get<HistorySettings>(KEY, HISTORY_SETTINGS_DEFAULTS),
  set: (value: HistorySettings) => prefs.set(KEY, value),
};
