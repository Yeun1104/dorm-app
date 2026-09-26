import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import { ChipTone } from '../../components/ui';
import { PAGE_BLOCK } from '../../hooks/useSlicedPages';
import { colors, font } from '../../theme';

/** 기숙사 사이트 상태 문자열(승인/대기/반려/처리중/완료…) → 칩 색 */
export function dormStatusTone(status: string | null | undefined): ChipTone {
  const s = status ?? '';
  if (/반려|거절|취소|불합격|불가/.test(s)) return 'danger';
  if (/승인|합격|완료|허가/.test(s)) return 'primary';
  if (/처리중|진행/.test(s)) return 'blue';
  if (/대기|접수|신청/.test(s)) return 'pending';
  return 'neutral';
}

/** 기숙사 게시판 목록 한 줄 (.board-item / .repair-item) */
export function BoardRow({
  no,
  title,
  meta,
  date,
  isNew,
  leading,
  onPress,
}: {
  no: number;
  title: ReactNode;
  meta: string;
  date: string;
  isNew?: boolean;
  leading?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.no} numberOfLines={1}>{no}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {leading}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>N</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Text style={styles.date}>{date}</Text>
    </Pressable>
  );
}

/**
 * 페이지네이션: <  1  2  3  4  5  >
 * 번호는 5개씩 묶어서 보여주고, 현재 페이지는 굵은 강조색 글씨. < > 는 이전/다음 묶음으로 이동
 * (사이트가 전체 개수를 안 줘서 번호 개수는 useSlicedPages가 묶음 단위로 파악한 값)
 */
export function Pager({
  page,
  pagesInBlock,
  hasNextBlock,
  loading,
  onChange,
}: {
  page: number;
  pagesInBlock: number;
  hasNextBlock: boolean;
  loading?: boolean;
  onChange: (p: number) => void;
}) {
  const blockStart = Math.floor(page / PAGE_BLOCK) * PAGE_BLOCK;
  const hasPrevBlock = blockStart > 0;
  if (!hasPrevBlock && !hasNextBlock && pagesInBlock <= 1) return null;
  return (
    <View style={styles.pager}>
      <Pressable
        style={[styles.pagerArrow, !hasPrevBlock && styles.pagerDisabled]}
        disabled={!hasPrevBlock || loading}
        onPress={() => onChange(blockStart - 1)}
        hitSlop={6}
        accessibilityLabel="이전 페이지 묶음"
      >
        <Icon name="back" size={17} color={colors.text} />
      </Pressable>
      {Array.from({ length: pagesInBlock }, (_, i) => blockStart + i).map((p) => {
        const active = p === page;
        return (
          <Pressable key={p} style={styles.pagerNum} disabled={active || loading} onPress={() => onChange(p)} hitSlop={4}>
            <Text style={[styles.pagerNumText, active && styles.pagerNumTextActive]}>{p + 1}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.pagerArrow, !hasNextBlock && styles.pagerDisabled]}
        disabled={!hasNextBlock || loading}
        onPress={() => onChange(blockStart + PAGE_BLOCK)}
        hitSlop={6}
        accessibilityLabel="다음 페이지 묶음"
      >
        <Icon name="chevron" size={17} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** 외박/장기비움 목록: 서버와 같은 10개씩 */
export const LEAVE_PAGE_SIZE = 10;

/** 게시판(고쳐주세요/공지/일반문의): 사이트는 15개씩 주지만 폰 한 화면에 들어오게 8개씩 보여줌 */
export const DORM_SERVER_PAGE_SIZE = 15;
export const DORM_UI_PAGE_SIZE = 8;

/** 기숙사 사이트 표 스타일: 하늘색 라벨 칸 + 흰 값 칸. 한 줄에 1쌍 또는 짧은 값이면 2쌍 */
export type InfoCell = [label: string, value: ReactNode];

export function InfoTable({ rows }: { rows: InfoCell[][] }) {
  return (
    <View style={styles.table}>
      {rows.map((cells, r) => (
        <View key={r} style={[styles.tableRow, r < rows.length - 1 && styles.tableRowGap]}>
          {cells.map(([label, value], c) => (
            <View key={label} style={[styles.tableCell, c > 0 && styles.tableCellGap]}>
              <View style={[styles.tableLabel, cells.length > 1 && styles.tableLabelNarrow]}>
                <Text style={styles.tableLabelText}>{label}</Text>
              </View>
              <View style={styles.tableValue}>
                {typeof value === 'string' || value == null ? <Text style={styles.tableValueText}>{value || '-'}</Text> : value}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** 상세 화면 공통 레이아웃 (제목 / 메타 / 본문) */
export function DetailHeader({ title, meta }: { title: string; meta: string[] }) {
  return (
    <View style={styles.detailHead}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.detailMeta}>{meta.filter(Boolean).join(' · ')}</Text>
    </View>
  );
}

export const detailStyles = StyleSheet.create({
  body: { paddingVertical: 18, fontSize: font.base, lineHeight: 24, color: colors.textBody },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});

const styles = StyleSheet.create({
  // 번호 · 제목/작성자 · 날짜를 세로 가운데로 맞춤
  row: { minHeight: 62, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#e1e8ea' },
  no: { minWidth: 48, textAlign: 'center', color: colors.textFaint, fontSize: font.xs },
  title: { flexShrink: 1, fontSize: font.base, fontWeight: '600', color: colors.text },
  meta: { marginTop: 4, color: '#909ca1', fontSize: font.xs },
  date: { color: '#97a2a6', fontSize: font.xs },
  newBadge: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center' },
  newText: { color: 'white', fontSize: 9, fontWeight: '800' },
  pager: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pagerArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pagerDisabled: { opacity: 0.2 },
  pagerNum: { minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pagerNumText: { fontSize: font.base, fontWeight: '500', color: colors.textFaint },
  pagerNumTextActive: { fontWeight: '800', color: colors.primaryDark },
  table: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#d9e7ee' },
  tableRow: { flexDirection: 'row' },
  tableRowGap: { borderBottomWidth: 1, borderBottomColor: 'white' },
  tableCell: { flex: 1, flexDirection: 'row' },
  tableCellGap: { borderLeftWidth: 1, borderLeftColor: 'white' },
  tableLabel: { width: 92, paddingHorizontal: 12, paddingVertical: 14, justifyContent: 'center', backgroundColor: '#edf8fc' },
  tableLabelNarrow: { width: 70, paddingHorizontal: 10 },
  tableLabelText: { fontSize: font.sm, color: '#4f6570' },
  tableValue: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, justifyContent: 'center', backgroundColor: 'white' },
  tableValueText: { fontSize: font.md, lineHeight: 20, color: colors.text },
  detailHead: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailTitle: { fontSize: 19, fontWeight: '800', color: colors.text, lineHeight: 26 },
  detailMeta: { marginTop: 7, color: colors.textMuted, fontSize: font.xs },
});
