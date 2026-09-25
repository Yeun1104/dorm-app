import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

/** 페이지네이션 (10개씩) — 서버가 전체 개수를 안 주므로 받은 개수가 10개면 다음 페이지가 있다고 봄 */
export function Pager({ page, hasNext, loading, onChange }: { page: number; hasNext: boolean; loading?: boolean; onChange: (p: number) => void }) {
  if (page === 0 && !hasNext) return null;
  return (
    <View style={styles.pager}>
      <Pressable style={[styles.pagerBtn, page === 0 && styles.pagerDisabled]} disabled={page === 0 || loading} onPress={() => onChange(page - 1)}>
        <Text style={styles.pagerText}>이전</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.pagerPage}>{page + 1}</Text>}
      <Pressable style={[styles.pagerBtn, !hasNext && styles.pagerDisabled]} disabled={!hasNext || loading} onPress={() => onChange(page + 1)}>
        <Text style={styles.pagerText}>다음</Text>
      </Pressable>
    </View>
  );
}

export const PAGE_SIZE = 10;

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
  row: { minHeight: 70, paddingVertical: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: '#e1e8ea' },
  no: { minWidth: 48, paddingTop: 1, textAlign: 'center', color: colors.textFaint, fontSize: font.xs },
  title: { flexShrink: 1, fontSize: font.base, fontWeight: '600', color: colors.text },
  meta: { marginTop: 5, color: '#909ca1', fontSize: font.xs },
  date: { color: '#97a2a6', fontSize: font.xs, paddingTop: 1 },
  newBadge: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center' },
  newText: { color: 'white', fontSize: 9, fontWeight: '800' },
  pager: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pagerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#dfe5e2', backgroundColor: 'white' },
  pagerDisabled: { opacity: 0.4 },
  pagerText: { fontSize: font.sm, color: colors.textBody },
  pagerPage: { fontSize: font.base, fontWeight: '700', color: colors.primaryDark },
  detailHead: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailTitle: { fontSize: 19, fontWeight: '800', color: colors.text, lineHeight: 26 },
  detailMeta: { marginTop: 7, color: colors.textMuted, fontSize: font.xs },
});
