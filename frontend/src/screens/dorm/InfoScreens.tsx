import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { foodMenuApi, ipsaApi, spointApi } from '../../api/dorm';
import type { FoodMenuDay, FoodMenuWeekNav, IpsaListItem, SpointItem } from '../../api/types';
import Icon from '../../components/Icon';
import { BottomSheet, Chip, EmptyState, ErrorView, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { parseLocalDate } from '../../utils/format';
import { dayClosure, findToday, menuItems } from './foodMenu';
import { dormStatusTone } from './dormShared';

// ───────── 상벌점조회 ─────────

export function SpointScreen(_: ScreenProps<'Spoint'>) {
  const { data, error, loading, refreshing, reload, refresh } = useFetch(() => spointApi.get(), []);

  const renderItem = ({ item }: { item: SpointItem }) => (
    <View style={styles.pointRow}>
      <View style={[styles.pointIcon, { backgroundColor: item.isBonus ? '#e6effd' : colors.dangerSoft }]}>
        <Icon name={item.isBonus ? 'up' : 'down'} size={16} color={item.isBonus ? '#3e6fd8' : colors.danger} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pointReason}>{item.reason}</Text>
        <Text style={styles.pointMeta}>No.{item.no} · {item.date}</Text>
      </View>
      <Text style={[styles.pointValue, { color: item.isBonus ? '#3e6fd8' : colors.danger }]}>
        {item.isBonus ? '+' : '-'}{Math.abs(item.point)}점
      </Text>
    </View>
  );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="상벌점조회" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(i) => `${i.no}-${i.date}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {data.yearlyTotals.map((y, i) => (
                  <View key={y.year} style={[styles.yearCard, i === 0 && styles.yearCardLatest]}>
                    <Text style={styles.yearLabel}>{y.year}년</Text>
                    <Text style={styles.yearValue}>{y.total}점</Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.sectionTitle}>전체 내역 <Text style={{ color: colors.primaryDeep }}>{data.items.length}</Text></Text>
            </>
          }
          ListEmptyComponent={<EmptyState icon="star" title="상벌점 내역이 없어요" />}
        />
      )}
    </Screen>
  );
}

// ───────── 입사신청/선발내역 ─────────

/** 룸메이트 칸: '확정'이면 강조색, 그 외(미확정/대기 등)는 회색 */
const roommateConfirmed = (info: string) => /확정/.test(info) && !/미확정|불/.test(info);

export function IpsaListScreen({ navigation }: ScreenProps<'IpsaList'>) {
  const { data, error, loading, refreshing, reload, refresh } = useFetch(() => ipsaApi.list(), []);

  const renderItem = ({ item }: { item: IpsaListItem }) => (
    <Pressable style={styles.ipsaCard} onPress={() => navigation.navigate('IpsaDetail', { mozipCode: item.mozipCode, title: item.recruitType })}>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Chip label={item.selectionStatus || '-'} tone={dormStatusTone(item.selectionStatus)} />
          <Text style={styles.ipsaTitle} numberOfLines={1}>{item.recruitType}</Text>
        </View>
        <Text style={styles.ipsaMeta}>거주기간 {item.residencePeriod || '-'}</Text>
      </View>
      {!!item.roommateInfo && (
        <View style={[styles.roommate, roommateConfirmed(item.roommateInfo) && styles.roommateOn]}>
          <Text style={styles.roommateLabel}>룸메이트</Text>
          <Text style={[styles.roommateValue, roommateConfirmed(item.roommateInfo) && styles.roommateValueOn]} numberOfLines={1}>{item.roommateInfo}</Text>
        </View>
      )}
      <Icon name="chevron" size={18} color="#9aa29f" />
    </Pressable>
  );

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="입사신청 / 선발내역" />
      {loading && !data ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => String(i.mozipCode)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.ipsaNotice}>
              <Icon name="notice" size={16} color={colors.textBody} />
              <Text style={styles.ipsaNoticeText}>입사 신청은 기숙사 사이트에서 할 수 있어요. 여기서는 신청·선발 내역만 확인할 수 있어요.</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="doc" title="입사신청 내역이 없어요" />}
        />
      )}
    </Screen>
  );
}

/** 상세 필드 중 위쪽 요약 카드로 뺄 항목 (사이트 라벨이 건마다 조금씩 달라 키워드로 찾음) */
const STATUS_KEY = /선발|합격|결과|상태/;
const PERIOD_KEY = /기간/;
/** 값이 이보다 길면 타일을 한 줄 전체로 */
const LONG_VALUE = 14;

export function IpsaDetailScreen({ route }: ScreenProps<'IpsaDetail'>) {
  const { mozipCode, title } = route.params;
  const { data, error, loading, reload } = useFetch(() => ipsaApi.detail(mozipCode), [mozipCode]);
  // 필드 구성이 건마다 달라 고정 레이아웃 대신 라벨→값 맵을 순서대로 씀. 빈 값은 생략
  const entries = Object.entries(data?.fields ?? {}).filter(([, v]) => v && v.trim() && v.trim() !== '-');
  const status = entries.find(([k]) => STATUS_KEY.test(k));
  const period = entries.find(([k]) => PERIOD_KEY.test(k));
  const rest = entries.filter((e) => e !== status && e !== period);

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="선발내역 상세" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : entries.length === 0 ? (
        <EmptyState icon="doc" title="표시할 정보가 없어요" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* 요약: 모집구분 · 선발 결과 · 거주기간 */}
          <View style={styles.ipsaHero}>
            <View style={styles.ipsaHeroTop}>
              <Text style={styles.ipsaHeroTitle} numberOfLines={2}>{title}</Text>
              {status && <Chip label={status[1]} tone={dormStatusTone(status[1])} large />}
            </View>
            {period && (
              <View style={styles.ipsaPeriod}>
                <Icon name="calendar" size={15} color={colors.primaryDeep} />
                <Text style={styles.ipsaPeriodLabel}>{period[0]}</Text>
                <Text style={styles.ipsaPeriodValue} numberOfLines={1}>{period[1]}</Text>
              </View>
            )}
          </View>

          {/* 나머지 항목: 2열 타일, 긴 값은 한 줄 전체 */}
          {rest.length > 0 && (
            <View style={styles.tiles}>
              {rest.map(([label, value]) => (
                <View key={label} style={[styles.tile, value.length > LONG_VALUE && styles.tileWide]}>
                  <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
                  <Text style={styles.tileValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

// ───────── 식단 ─────────

// 조식은 운영하지 않아서 표시하지 않음 (조식 칸은 운영 안내 공지로만 쓰임)
const MEALS: { key: keyof Pick<FoodMenuDay, 'lunch' | 'dinner' | 'combinedMeal'>; label: string; optional?: boolean }[] = [
  { key: 'lunch', label: '중식' },
  { key: 'dinner', label: '석식' },
  { key: 'combinedMeal', label: '일품', optional: true },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function FoodMenuScreen(_: ScreenProps<'FoodMenu'>) {
  const [week, setWeek] = useState<FoodMenuWeekNav | null>(null);
  const { data, error, loading, reload } = useFetch(() => foodMenuApi.get(week), [week]);
  const [dayIndex, setDayIndex] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const initialWeek = useRef(true);
  /** 달력에서 고른 날짜(YYYY-MM-DD) — 그 주를 불러온 뒤 그 날을 선택 */
  const target = useRef<string | null>(null);

  const indexOfDate = (ymd: string) => data?.days.findIndex((d) => (parseLocalDate(d.date) ? toYmd(parseLocalDate(d.date)!) : '') === ymd) ?? -1;

  // 이번 주를 처음 열었을 때는 오늘 요일, 달력으로 이동했으면 고른 날짜를 선택
  useEffect(() => {
    if (!data) return;
    if (target.current) {
      const i = indexOfDate(target.current);
      setDayIndex(i >= 0 ? i : 0);
      target.current = null;
    } else if (initialWeek.current) {
      const today = findToday(data.days);
      setDayIndex(today ? data.days.indexOf(today) : 0);
    } else {
      setDayIndex(0);
    }
    initialWeek.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const pickDate = (d: Date) => {
    setCalendarOpen(false);
    const ymd = toYmd(d);
    const i = indexOfDate(ymd);
    if (i >= 0) return setDayIndex(i); // 이미 보고 있는 주
    target.current = ymd;
    setWeek({ gyear: String(d.getFullYear()), gmonth: pad2(d.getMonth() + 1), gday: pad2(d.getDate()) });
  };

  const day = data?.days[dayIndex];
  const closure = dayClosure(day);
  // 중식/석식은 비어 있어도 '미운영'으로 칸을 보여주고, 일품은 있을 때만
  const meals = day ? MEALS.filter((m) => !m.optional || menuItems(day[m.key]).length) : [];
  const todayYmd = toYmd(new Date());

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title="식단"
        subtitle={data?.weekLabel}
        action={
          <Pressable style={styles.calendarBtn} onPress={() => setCalendarOpen(true)} hitSlop={6}>
            <Icon name="calendar" size={20} color={colors.text} />
          </Pressable>
        }
      />
      <View style={styles.weekNav}>
        <Pressable style={[styles.weekBtn, !data?.prevWeek && { opacity: 0.4 }]} disabled={!data?.prevWeek || loading} onPress={() => setWeek(data!.prevWeek)}>
          <Icon name="back" size={18} />
        </Pressable>
        <Text style={styles.weekLabel}>{data?.weekLabel ?? ' '}</Text>
        <Pressable style={[styles.weekBtn, !data?.nextWeek && { opacity: 0.4 }]} disabled={!data?.nextWeek || loading} onPress={() => setWeek(data!.nextWeek)}>
          <Icon name="chevron" size={18} />
        </Pressable>
      </View>

      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '식단을 불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingBottom: 28 }}>
          <View style={styles.dayTabs}>
            {data.days.map((d, i) => {
              const active = i === dayIndex;
              const parsed = parseLocalDate(d.date);
              const isToday = !!parsed && toYmd(parsed) === todayYmd;
              return (
                <Pressable key={`${d.date}-${i}`} style={styles.dayTab} onPress={() => setDayIndex(i)}>
                  <Text style={[styles.dayTabWeek, isToday && { color: colors.primaryDark, fontWeight: '700' }]}>{d.dayOfWeek?.slice(0, 1)}</Text>
                  <View style={[styles.dayCircle, active && styles.dayCircleActive]}>
                    <Text style={[styles.dayTabDate, active && { color: 'white' }]}>{d.date?.replace(/\D/g, '').slice(-2)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {!day || closure.closed ? (
            <EmptyState icon="meal" title="미운영" message={closure.notice ?? '이 날은 식당을 운영하지 않아요.'} />
          ) : (
            <View style={{ gap: 12 }}>
              {meals.map((m) => {
                const items = menuItems(day[m.key]);
                return (
                  <View key={m.key} style={styles.mealCard}>
                    <View style={styles.mealHead}>
                      <View style={styles.mealBar} />
                      <Text style={styles.mealHeadText}>{m.label}</Text>
                    </View>
                    {items.length ? (
                      items.map((menu, idx) => (
                        <Text key={`${menu}-${idx}`} style={[styles.menuItem, idx === 0 && styles.menuMain]}>{menu}</Text>
                      ))
                    ) : (
                      <Text style={[styles.menuItem, { color: colors.textMuted }]}>미운영</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          <Text style={styles.allergy}>식단은 식자재 수급 상황에 따라 변경될 수 있어요. 알레르기가 있다면 원산지 및 알레르기 정보를 꼭 확인해주세요.</Text>
        </ScrollView>
      )}

      <BottomSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)}>
        <Text style={styles.sheetTitle}>날짜 선택</Text>
        <MonthCalendar selected={parseLocalDate(day?.date)} onPick={pickDate} />
      </BottomSheet>
    </Screen>
  );
}

const WEEK_HEAD = ['일', '월', '화', '수', '목', '금', '토'];

/** 한 달 달력 (날짜 하나 선택) */
function MonthCalendar({ selected, onPick }: { selected: Date | null; onPick: (d: Date) => void }) {
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: cursor.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];
  const today = new Date().toDateString();
  const move = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <View>
      <View style={styles.calHead}>
        <Pressable style={styles.weekBtn} onPress={() => move(-1)}>
          <Icon name="back" size={18} />
        </Pressable>
        <Text style={styles.weekLabel}>{cursor.getFullYear()}년 {cursor.getMonth() + 1}월</Text>
        <Pressable style={styles.weekBtn} onPress={() => move(1)}>
          <Icon name="chevron" size={18} />
        </Pressable>
      </View>
      <View style={styles.calGrid}>
        {WEEK_HEAD.map((w, i) => (
          <Text key={w} style={[styles.calCell, styles.calWeek, i === 0 && { color: colors.danger }]}>{w}</Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.calCell} />;
          const active = selected?.toDateString() === d.toDateString();
          const isToday = d.toDateString() === today;
          return (
            <Pressable key={i} style={styles.calCell} onPress={() => onPick(d)}>
              <View style={[styles.calCircle, isToday && styles.calToday, active && styles.dayCircleActive]}>
                <Text style={[styles.calText, d.getDay() === 0 && { color: colors.danger }, active && { color: 'white', fontWeight: '700' }]}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearCard: { minWidth: 110, padding: 16, borderRadius: 17, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border },
  yearCardLatest: { backgroundColor: colors.yellowBg, borderColor: colors.yellowBg },
  yearLabel: { color: '#8d7737', fontSize: font.xs },
  yearValue: { marginTop: 2, color: colors.yellowText, fontSize: 21, fontWeight: '800' },
  sectionTitle: { marginTop: 22, marginBottom: 10, fontSize: 15, fontWeight: '800', color: colors.text },
  pointRow: { marginBottom: 9, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, borderWidth: 1, borderColor: '#e6ebe9', backgroundColor: 'white' },
  pointIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pointReason: { fontSize: font.md, fontWeight: '600', color: colors.text },
  pointMeta: { marginTop: 3, fontSize: font.xs, color: colors.textMuted },
  pointValue: { fontSize: 15, fontWeight: '800' },

  ipsaCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e6ebe9', backgroundColor: 'white' },
  ipsaTitle: { flexShrink: 1, fontSize: font.base, fontWeight: '700', color: colors.text },
  ipsaMeta: { fontSize: font.xs, color: colors.textMuted },
  ipsaNotice: { marginBottom: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: '#eef2f1' },
  ipsaNoticeText: { flex: 1, fontSize: font.sm, lineHeight: 19, color: colors.textBody },
  roommate: { maxWidth: 110, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center', borderRadius: 12, backgroundColor: '#f1f3f2' },
  roommateOn: { backgroundColor: colors.primarySoft2 },
  roommateLabel: { fontSize: 10, color: colors.textMuted },
  roommateValue: { marginTop: 1, fontSize: font.sm, fontWeight: '700', color: colors.textBody },
  roommateValueOn: { color: colors.primaryDeep },
  ipsaHero: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  ipsaHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ipsaHeroTitle: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.text },
  ipsaPeriod: { marginTop: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: colors.primarySoft2 },
  ipsaPeriodLabel: { fontSize: font.xs, fontWeight: '700', color: colors.primaryDeep },
  ipsaPeriodValue: { flex: 1, textAlign: 'right', fontSize: font.sm, fontWeight: '700', color: colors.primaryDeep },
  tiles: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  tileWide: { width: '100%' },
  tileLabel: { fontSize: font.xs, color: colors.textMuted },
  tileValue: { marginTop: 4, fontSize: font.md, lineHeight: 20, fontWeight: '700', color: colors.text },

  weekNav: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#e1e6e4', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: font.base, fontWeight: '700', color: colors.text },
  calendarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f2f5f3', alignItems: 'center', justifyContent: 'center' },
  dayTabs: { marginBottom: 16, flexDirection: 'row' },
  dayTab: { flex: 1, alignItems: 'center', gap: 6 },
  dayTabWeek: { fontSize: font.xs, color: '#7e8985' },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: colors.primary },
  dayTabDate: { fontSize: font.md, fontWeight: '700', color: colors.text },
  mealCard: { paddingHorizontal: 18, paddingVertical: 16, borderRadius: 18, borderWidth: 1, borderColor: '#e5ebe8', backgroundColor: 'white' },
  mealHead: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primary },
  mealHeadText: { color: colors.primaryDeep, fontSize: 15, fontWeight: '800' },
  menuItem: { paddingVertical: 4, color: colors.textBody, fontSize: font.base, lineHeight: 21 },
  menuMain: { color: colors.text, fontWeight: '700' },
  allergy: { marginTop: 'auto', paddingTop: 24, color: '#969e9b', fontSize: font.xs, lineHeight: 17, textAlign: 'center' },
  sheetTitle: { marginBottom: 8, fontSize: 20, fontWeight: '800', color: colors.text },
  calHead: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  calCell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  calWeek: { height: 28, textAlign: 'center', textAlignVertical: 'center', fontSize: font.xs, color: colors.textMuted },
  calCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: colors.primaryLight },
  calText: { fontSize: font.md, color: colors.text },
});
