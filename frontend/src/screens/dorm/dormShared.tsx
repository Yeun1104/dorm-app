import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import { ChipTone } from '../../components/ui';
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
 * 페이지네이션: ‹  1  2 (3)  4  › — 서버가 전체 개수를 안 줘서, 지나온 페이지와 다음 한 페이지까지만 번호로 보여줌
 */
export function Pager({ page, hasNext, loading, onChange }: { page: number; hasNext: boolean; loading?: boolean; onChange: (p: number) => void }) {
  if (page === 0 && !hasNext) return null;
  const last = hasNext ? page + 1 : page;
  const from = Math.max(0, last - 4); // 번호는 최대 5개
  const pages = Array.from({ length: last - from + 1 }, (_, i) => from + i);
  return (
    <View style={styles.pager}>
      <Pressable style={[styles.pagerArrow, page === 0 && styles.pagerDisabled]} disabled={page === 0 || loading} onPress={() => onChange(page - 1)} hitSlop={6} accessibilityLabel="이전 페이지">
        <Icon name="back" size={16} color={colors.text} />
      </Pressable>
      {pages.map((p) => {
        const active = p === page;
        return (
          <Pressable key={p} style={[styles.pagerNum, active && styles.pagerNumActive]} disabled={active || loading} onPress={() => onChange(p)}>
            {active && loading ? <ActivityIndicator size="small" color="white" /> : <Text style={[styles.pagerNumText, active && styles.pagerNumTextActive]}>{p + 1}</Text>}
          </Pressable>
        );
      })}
      <Pressable style={[styles.pagerArrow, !hasNext && styles.pagerDisabled]} disabled={!hasNext || loading} onPress={() => onChange(page + 1)} hitSlop={6} accessibilityLabel="다음 페이지">
        <Icon name="chevron" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** 외박/장기비움 목록처럼 서버 페이지를 그대로 쓰는 곳의 페이지 크기 */
export const PAGE_SIZE = 10;

/** 게시판(고쳐주세요/공지/일반문의): 사이트는 15개씩 주지만 폰 한 화면에 들어오게 8개씩 보여줌 */
export const DORM_SERVER_PAGE_SIZE = 15;
export const DORM_UI_PAGE_SIZE = 8;

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
  pager: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pagerArrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pagerDisabled: { opacity: 0.25 },
  pagerNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pagerNumActive: { backgroundColor: colors.text },
  pagerNumText: { fontSize: font.md, fontWeight: '600', color: colors.textMuted },
  pagerNumTextActive: { color: 'white', fontWeight: '800' },
  detailHead: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailTitle: { fontSize: 19, fontWeight: '800', color: colors.text, lineHeight: 26 },
  detailMeta: { marginTop: 7, color: colors.textMuted, fontSize: font.xs },
});
