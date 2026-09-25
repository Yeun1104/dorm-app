// Figma Make 시안(index.css)에서 뽑은 색/반경 토큰.
// 시안의 7~9px 글씨는 웹 목업을 축소한 값이라 실기기에선 안 읽혀서, 폰트는 최소 11 기준으로 한 단계씩 올려 씀.

export const colors = {
  primary: '#4a9fbe',
  primaryLight: '#4fa6c6',
  primaryDark: '#347e9d',
  primaryDeep: '#2f7898',
  primarySoft: '#dceff4',
  primarySoft2: '#e1f1f5',
  primaryTint: '#edf7fa',

  bg: '#fbfcfb',
  bgSub: '#f7f9f8',
  surface: '#ffffff',
  inputBg: '#f0f3f2',
  chatBg: '#f1f6f7',

  text: '#161d1b',
  textBody: '#46504c',
  textSub: '#6d7974',
  textMuted: '#8b9591',
  textFaint: '#9ca4a1',

  border: '#e7ecea',
  borderLight: '#edf0ef',

  danger: '#e35d61',
  dangerSoft: '#fdeced',
  warning: '#ed6c45',
  warningSoft: '#fff1e7',
  heart: '#ff5b69',
  badge: '#ff5a61',

  pendingText: '#a07923',
  pendingBg: '#fff4d9',
  neutralText: '#8c9491',
  neutralBg: '#edf0ef',

  yellowBg: '#fff8dd',
  yellowText: '#806714',
  yellowIcon: '#e5bc3b',

  blue: '#4f78ce',
  blueSoft: '#e8efff',
  orange: '#df7949',
  orangeSoft: '#fff0e8',

  overlay: 'rgba(16,25,21,0.42)',
  toast: 'rgba(22,29,27,0.9)',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };

export const font = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 21,
  title: 26,
};

export const shadow = {
  card: {
    shadowColor: '#1e4032',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  fab: {
    shadowColor: '#3e8ba9',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
};
