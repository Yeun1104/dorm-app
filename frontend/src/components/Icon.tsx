import { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Figma 시안의 Icon 컴포넌트 path를 그대로 옮김 (+ 앱에 필요한 몇 개 추가)
export type IconName =
  | 'home' | 'chat' | 'dorm' | 'user' | 'search' | 'bell' | 'heart' | 'back' | 'plus' | 'send'
  | 'chevron' | 'chevronDown' | 'calendar' | 'tools' | 'notice' | 'meal' | 'star' | 'check'
  | 'lock' | 'up' | 'down' | 'camera' | 'close' | 'doc' | 'inbox';

const paths: Record<IconName, ReactNode> = {
  home: <><Path d="m3 11 9-7 9 7" /><Path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  chat: <><Path d="M20 15a4 4 0 0 1-4 4H8l-5 3 1.4-4.3A7.8 7.8 0 0 1 3 13V8a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z" /><Path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
  dorm: <><Path d="M4 21V7l8-4 8 4v14" /><Path d="M2 21h20M8 10h2M14 10h2M8 14h2M14 14h2M10 21v-4h4v4" /></>,
  user: <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>,
  search: <><Circle cx="11" cy="11" r="7" /><Path d="m20 20-4-4" /></>,
  bell: <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  heart: <Path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  back: <Path d="m15 18-6-6 6-6" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  send: <><Path d="m22 2-7 20-4-9-9-4Z" /><Path d="M22 2 11 13" /></>,
  chevron: <Path d="m9 18 6-6-6-6" />,
  chevronDown: <Path d="m6 9 6 6 6-6" />,
  calendar: <><Rect x="3" y="5" width="18" height="16" rx="3" /><Path d="M16 3v4M8 3v4M3 10h18" /></>,
  tools: <Path d="m14.7 6.3 3-3a4 4 0 0 1-5 5l-7.4 7.4a2.1 2.1 0 0 0 3 3l7.4-7.4a4 4 0 0 1 5-5l-3 3Z" />,
  notice: <><Path d="m3 11 18-5v12L3 13Z" /><Path d="m11.6 15.4.7 4.1-4 .7-1-5.7" /></>,
  meal: <Path d="M6 2v8M3 2v5a3 3 0 0 0 6 0V2M6 10v12M17 2v20M17 2c4 3 4 9 0 11" />,
  star: <Path d="m12 2 3 6 6.5.9-4.7 4.6 1.1 6.5-5.9-3-5.9 3 1.1-6.5L2.5 9 9 8Z" />,
  check: <Path d="m5 12 4 4L19 6" />,
  lock: <><Rect x="4" y="11" width="16" height="10" rx="2" /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  up: <Path d="m6 15 6-6 6 6" />,
  down: <Path d="m6 9 6 6 6-6" />,
  camera: <><Path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><Circle cx="12" cy="13" r="3.5" /></>,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  doc: <><Path d="M6 3h8l4 4v14H6Z" /><Path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  inbox: <><Path d="M22 12h-6l-2 3h-4l-2-3H2" /><Path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" /></>,
};

export default function Icon({
  name,
  size = 24,
  color = colors.text,
  filled = false,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}
