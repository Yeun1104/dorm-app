import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { foodMenuApi, ipsaApi, spointApi } from '../../api/dorm';
import type { FoodMenuDay, FoodMenuWeekNav, IpsaListItem, SpointItem } from '../../api/types';
import Icon from '../../components/Icon';
import { Chip, EmptyState, ErrorView, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { dayClosure, findToday, isClosedText } from './foodMenu';
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

export function IpsaListScreen({ navigation }: ScreenProps<'IpsaList'>) {
  const { data, error, loading, refreshing, reload, refresh } = useFetch(() => ipsaApi.list(), []);

  const renderItem = ({ item }: { item: IpsaListItem }) => (
    <Pressable style={styles.ipsaCard} onPress={() => navigation.navigate('IpsaDetail', { mozipCode: item.mozipCode, title: item.recruitType })}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Chip label={item.selectionStatus || '-'} tone={dormStatusTone(item.selectionStatus)} />
          <Text style={styles.ipsaTitle} numberOfLines={1}>{item.recruitType}</Text>
        </View>
        <Text style={styles.ipsaMeta}>거주기간 {item.residencePeriod || '-'}</Text>
        {!!item.roommateInfo && <Text style={styles.ipsaMeta}>룸메이트 {item.roommateInfo}</Text>}
      </View>
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
          ListEmptyComponent={<EmptyState icon="doc" title="입사신청 내역이 없어요" />}
        />
      )}
    </Screen>
  );
}

export function IpsaDetailScreen({ route }: ScreenProps<'IpsaDetail'>) {
  const { mozipCode, title } = route.params;
  const { data, error, loading, reload } = useFetch(() => ipsaApi.detail(mozipCode), [mozipCode]);
  // 필드 구성이 건마다 다를 수 있어 고정 레이아웃 대신 fields 맵을 순서대로 렌더링
  const entries = Object.entries(data?.fields ?? {});
  return (
    <Screen bg="white">
      <SubHeader title="선발내역 상세" subtitle={title} />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <View style={styles.fieldTable}>
            {entries.map(([label, value], i) => (
              <View key={label} style={[styles.fieldRow, i < entries.length - 1 && styles.fieldDivider]}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value || '-'}</Text>
              </View>
            ))}
          </View>
          {entries.length === 0 && <EmptyState icon="doc" title="표시할 정보가 없어요" />}
        </ScrollView>
      )}
    </Screen>
  );
}

// ───────── 식단 ─────────

// 조식은 운영하지 않아서 표시하지 않음 (조식 칸은 운영 안내 공지로만 쓰임 → dayClosure에서 사용)
const MEALS: { key: keyof Pick<FoodMenuDay, 'lunch' | 'dinner' | 'combinedMeal'>; label: string; optional?: boolean }[] = [
  { key: 'lunch', label: '중식' },
  { key: 'dinner', label: '석식' },
  { key: 'combinedMeal', label: '일품', optional: true },
];

export function FoodMenuScreen(_: ScreenProps<'FoodMenu'>) {
  const [week, setWeek] = useState<FoodMenuWeekNav | null>(null);
  const { data, error, loading, reload } = useFetch(() => foodMenuApi.get(week), [week]);
  const [dayIndex, setDayIndex] = useState(0);
  const initialWeek = useRef(true);

  // 이번 주를 처음 열었을 때는 오늘 요일을 선택
  useEffect(() => {
    if (!data) return;
    if (initialWeek.current) {
      const today = findToday(data.days);
      setDayIndex(today ? data.days.indexOf(today) : 0);
      initialWeek.current = false;
    } else {
      setDayIndex(0);
    }
  }, [data]);

  const day = data?.days[dayIndex];
  const closure = dayClosure(day);
  // 중식/석식은 비어 있어도 '미운영'으로 칸을 보여주고, 일품은 있을 때만
  const meals = day ? MEALS.filter((m) => !m.optional || day[m.key]?.length) : [];

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="식단" subtitle={data?.weekLabel} />
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
          <View style={styles.dayTabs}>
            {data.days.map((d, i) => (
              <Pressable key={`${d.date}-${i}`} style={[styles.dayTab, i === dayIndex && styles.dayTabActive]} onPress={() => setDayIndex(i)}>
                <Text style={[styles.dayTabWeek, i === dayIndex && { color: 'white' }]}>{d.dayOfWeek?.slice(0, 1)}</Text>
                <Text style={[styles.dayTabDate, i === dayIndex && { color: 'white' }]}>{d.date?.replace(/\D/g, '').slice(-2)}</Text>
              </Pressable>
            ))}
          </View>

          {!day || closure.closed ? (
            <EmptyState icon="meal" title="미운영" message={closure.notice ?? '이 날은 식당을 운영하지 않아요.'} />
          ) : (
            <View style={styles.mealGrid}>
              {meals.map((m, i) => (
                <View key={m.key} style={styles.mealCard}>
                  <View style={[styles.mealHead, i % 2 === 1 && { backgroundColor: colors.primaryDeep }]}>
                    <Text style={styles.mealHeadText}>{m.label}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                    {!day[m.key]?.length || isClosedText(day[m.key]) ? (
                      <Text style={[styles.menuItem, { color: colors.textMuted }]}>미운영</Text>
                    ) : (
                      day[m.key].map((menu, idx) => (
                        <Text key={`${menu}-${idx}`} style={[styles.menuItem, idx < day[m.key].length - 1 && styles.menuDivider]}>{menu}</Text>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.allergy}>식단은 식자재 수급 상황에 따라 변경될 수 있어요. 알레르기가 있다면 원산지 및 알레르기 정보를 꼭 확인해주세요.</Text>
        </ScrollView>
      )}
    </Screen>
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
  fieldTable: { borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 16, overflow: 'hidden' },
  fieldRow: { paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', gap: 12 },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  fieldLabel: { width: 100, color: '#89928f', fontSize: font.sm },
  fieldValue: { flex: 1, color: colors.text, fontSize: font.sm, fontWeight: '600' },

  weekNav: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#e1e6e4', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: font.base, fontWeight: '700', color: colors.text },
  dayTabs: { marginBottom: 14, flexDirection: 'row', gap: 3 },
  dayTab: { flex: 1, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayTabActive: { backgroundColor: colors.primary },
  dayTabWeek: { fontSize: font.xs, color: '#7e8985' },
  dayTabDate: { fontSize: font.md, fontWeight: '700', color: colors.text },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  mealCard: { width: '48.5%', borderRadius: 9, borderWidth: 1, borderColor: '#e5ebe8', backgroundColor: 'white', overflow: 'hidden' },
  mealHead: { paddingHorizontal: 11, paddingVertical: 11, backgroundColor: colors.primaryLight },
  mealHeadText: { color: 'white', fontSize: 15, fontWeight: '800' },
  menuItem: { paddingVertical: 6, color: '#4d5e65', fontSize: font.sm, lineHeight: 16 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#eef1f2' },
  allergy: { marginTop: 14, color: '#969e9b', fontSize: font.xs, lineHeight: 17 },
});
