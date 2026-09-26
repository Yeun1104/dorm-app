import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { LeaveKind, leaveApi } from '../../api/dorm';
import type { OutingListItem } from '../../api/types';
import DateRangeCalendar from '../../components/DateRangeCalendar';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Button, Chip, EmptyState, ErrorView, Fab, Field, FormScroll, Input, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useSlicedPages } from '../../hooks/useSlicedPages';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { daysBetween, parseLocalDate, toLocalDateString } from '../../utils/format';
import { dormStatusTone, LEAVE_PAGE_SIZE, Pager } from './dormShared';

const TEXT: Record<LeaveKind, { title: string; subtitle: string; guideTitle: string; guide: string }> = {
  outing: {
    title: '외박신청',
    subtitle: '1~6일 동안 자리를 비울 때 신청해요',
    guideTitle: '외박 신청 안내',
    guide: '외박 기간은 1~6일까지 신청할 수 있어요. 7일 이상 비울 때는 장기비움으로 신청해주세요.',
  },
  longTerm: {
    title: '장기비움신청',
    subtitle: '7일 이상 자리를 비울 때 신청해요',
    guideTitle: '장기비움 신청 안내',
    guide: '7일 이상 자리를 비울 경우 시설 점검을 위해 반드시 신청해주세요.',
  },
};

/** 서버(DormOutingService)와 같은 규칙: ChronoUnit.DAYS.between(start, end) */
function validateRange(kind: LeaveKind, start: Date | null, end: Date | null): string | null {
  if (!start || !end) return '시작일과 종료일을 선택해주세요';
  const days = daysBetween(start, end);
  if (kind === 'outing' && (days < 1 || days > 6)) return `외박은 1~6일까지 신청할 수 있어요 (현재 ${days}일)`;
  if (kind === 'longTerm' && days < 7) return `장기비움은 7일 이상부터 신청할 수 있어요 (현재 ${days}일)`;
  return null;
}

// ───────── 목록 ─────────

export function LeaveListScreen({ navigation, route }: ScreenProps<'LeaveList'>) {
  const { kind } = route.params;
  const t = TEXT[kind];
  const list = useSlicedPages((page) => leaveApi.list(kind, page), LEAVE_PAGE_SIZE, LEAVE_PAGE_SIZE, [kind]);

  const renderItem = ({ item }: { item: OutingListItem }) => (
    <Pressable
      style={styles.card}
      disabled={item.no == null}
      onPress={() => item.no != null && navigation.navigate('LeaveDetail', { kind, no: item.no })}
    >
      <View style={styles.cardTop}>
        <Chip label={item.status || '상태 없음'} tone={dormStatusTone(item.status)} />
        <Text style={styles.cardNo}>No.{item.displayNo} · {item.writtenAt}</Text>
      </View>
      <Text style={styles.period}>{item.startDate} — {item.endDate}</Text>
      {item.no != null && (
        <View style={styles.chev}>
          <Icon name="chevron" size={18} color="#9aa29f" />
        </View>
      )}
    </Pressable>
  );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title={t.title} subtitle={t.subtitle} />
      {list.loading && !list.items ? (
        <LoadingView />
      ) : list.error && !list.items ? (
        <ErrorView message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={list.items ?? []}
          keyExtractor={(i) => `${i.displayNo}-${i.no}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.guide}>
              <View style={styles.guideIcon}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 11 }}>i</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideTitle}>{t.guideTitle}</Text>
                <Text style={styles.guideText}>{t.guide}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="calendar" title="신청 내역이 없어요" />}
          ListFooterComponent={<Pager page={list.page} pagesInBlock={list.pagesInBlock} hasNextBlock={list.hasNextBlock} loading={list.loading} onChange={list.goTo} />}
        />
      )}
      <Fab label="신청하기" onPress={() => navigation.navigate('LeaveForm', { kind })} />
    </Screen>
  );
}

// ───────── 상세 ─────────

export function LeaveDetailScreen({ navigation, route }: ScreenProps<'LeaveDetail'>) {
  const { kind, no } = route.params;
  const toast = useToast();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const { data, error, loading, reload } = useFetch(() => leaveApi.detail(kind, no), [kind, no]);

  const remove = async () => {
    const ok = await confirm({ title: '신청을 삭제할까요?', message: '삭제하면 되돌릴 수 없어요.', confirmText: '삭제', danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      await leaveApi.remove(kind, no);
      toast('신청을 삭제했어요');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen bg="white">
      <SubHeader title={`${TEXT[kind].title} 상세`} />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Chip label={data.resultStatus || '상태 없음'} tone={dormStatusTone(data.resultStatus)} large />
            <Text style={styles.cardNo}>신청번호 {data.applicationNo}</Text>
          </View>
          <Text style={styles.detailPeriod}>{data.startDate} — {data.endDate}</Text>
          <View style={styles.infoList}>
            {[
              ['신청자', data.applicantName],
              ['호실', data.room],
              ['자리', data.seat],
              ['연락처', data.phone],
              ['작성일', data.writtenAt],
            ].map(([label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || '-'}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.memoLabel}>사유</Text>
          <Text style={styles.memo}>{data.memo || '-'}</Text>
          <Button label="삭제" variant="dangerOutline" onPress={remove} loading={deleting} style={{ marginTop: 24, height: 48 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

// ───────── 작성 ─────────

export function LeaveFormScreen({ navigation, route }: ScreenProps<'LeaveForm'>) {
  const { kind } = route.params;
  const toast = useToast();
  const defaults = useFetch(() => leaveApi.formDefaults(kind), [kind]);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const d = defaults.data;
  const maxEnd = parseLocalDate(d?.maxEndDate);
  const rangeError = start && end ? validateRange(kind, start, end) : null;

  const submit = async () => {
    const err = validateRange(kind, start, end) ?? (!memo.trim() ? '사유를 입력해주세요' : null);
    if (err) return setError(err);
    if (maxEnd && end! > maxEnd) return setError(`종료일은 ${d!.maxEndDate}까지 선택할 수 있어요`);
    setSubmitting(true);
    setError(null);
    try {
      await leaveApi.create(kind, { startDate: toLocalDateString(start!), endDate: toLocalDateString(end!), memo: memo.trim() });
      toast('신청을 완료했어요');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title={`${TEXT[kind].title}하기`} />
      {defaults.loading && !d ? (
        <LoadingView />
      ) : defaults.error && !d ? (
        <ErrorView message={defaults.error} onRetry={defaults.reload} />
      ) : (
        <FormScroll footer={<Button label="제출" onPress={submit} loading={submitting} />}>
          {/* 신청자 정보: 이름·호실을 크게, 연락처·최대 종료일은 아래 줄로 */}
          <View style={styles.applicant}>
            <Text style={styles.applicantCaption}>신청자</Text>
            <View style={styles.applicantHead}>
              <Text style={styles.applicantName}>{d?.applicantName || '-'}</Text>
              <Text style={styles.applicantRoom}>{[d?.room, d?.seat].filter(Boolean).join(' · ') || '-'}</Text>
            </View>
            <View style={styles.applicantDivider} />
            {[
              ['연락처', [d?.phone1, d?.phone2, d?.phone3].filter(Boolean).join('-')],
              ['최대 종료일', d?.maxEndDate],
            ].map(([label, value]) => (
              <View key={label} style={styles.applicantRow}>
                <Text style={styles.applicantLabel}>{label}</Text>
                <Text style={styles.applicantValue}>{value || '-'}</Text>
              </View>
            ))}
          </View>

          <DateRangeCalendar
            start={start}
            end={end}
            onChange={(s, e) => {
              setStart(s);
              setEnd(e);
              setError(null);
            }}
            minDate={new Date()}
            maxDate={maxEnd}
          />
          {start && end && (
            <Text style={[styles.rangeInfo, rangeError && { color: colors.danger }]}>
              {rangeError ?? `${daysBetween(start, end)}일 동안 비워요`}
            </Text>
          )}

          <Field label="사유" error={error}>
            <Input value={memo} onChangeText={setMemo} multiline placeholder="자리를 비우는 사유를 입력해주세요" style={{ minHeight: 90 }} />
          </Field>
        </FormScroll>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  guide: { flexDirection: 'row', gap: 9, paddingBottom: 14, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#dce5e8' },
  guideIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { color: colors.primaryDeep, fontSize: font.sm, fontWeight: '700' },
  guideText: { marginTop: 3, color: '#70848d', fontSize: font.xs, lineHeight: 17 },
  card: { marginBottom: 10, padding: 15, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 16, backgroundColor: 'white' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  cardNo: { color: '#939c98', fontSize: font.xs },
  period: { fontSize: 15, fontWeight: '700', color: colors.text },
  chev: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  detailPeriod: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 16 },
  infoList: { borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 16, overflow: 'hidden' },
  infoRow: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { color: '#89928f', fontSize: font.sm },
  infoValue: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  memoLabel: { marginTop: 18, marginBottom: 6, fontSize: font.sm, fontWeight: '700', color: '#53605b' },
  memo: { fontSize: font.base, lineHeight: 22, color: colors.textBody },
  applicant: { marginBottom: 18, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fafbfb' },
  applicantCaption: { fontSize: font.xs, fontWeight: '600', color: colors.textMuted },
  applicantHead: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  applicantName: { fontSize: 19, fontWeight: '800', color: colors.text },
  applicantRoom: { flexShrink: 1, textAlign: 'right', fontSize: font.base, fontWeight: '600', color: colors.textBody },
  applicantDivider: { height: 1, marginVertical: 13, backgroundColor: colors.borderLight },
  applicantRow: { paddingVertical: 3, flexDirection: 'row', justifyContent: 'space-between' },
  applicantLabel: { fontSize: font.md, color: colors.textMuted },
  applicantValue: { fontSize: font.md, fontWeight: '700', color: colors.text },
  rangeInfo: { marginTop: 8, color: colors.primaryDark, fontSize: font.sm, fontWeight: '600' },
});
