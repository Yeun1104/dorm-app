import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { dormAccountApi, foodMenuApi, leaveApi, noticeApi, spointApi } from '../../api/dorm';
import type { FoodMenuDay } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Feedback';
import Icon, { IconName } from '../../components/Icon';
import { ErrorView, LoadingView, PageHeader, Screen } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { parseLocalDate } from '../../utils/format';
import DormLinkForm from './DormLinkForm';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 식단 응답의 date 포맷이 사이트에 따라 달라서 날짜 → 요일 순으로 오늘을 찾음 */
export function findToday(days: FoodMenuDay[]): FoodMenuDay | undefined {
  const today = new Date();
  return (
    days.find((d) => parseLocalDate(d.date)?.toDateString() === today.toDateString()) ??
    days.find((d) => d.dayOfWeek?.startsWith(WEEKDAYS[today.getDay()]))
  );
}

export default function DormHomeScreen({ navigation }: ScreenProps<'DormHome'>) {
  const { dormLinked, setDormLinked } = useAuth();

  // 세션당 1번만 연동 여부 확인 (verify가 기숙사 사이트 로그인을 실제로 수행해서 느림)
  const check = useFetch(
    async () => {
      try {
        const v = await dormAccountApi.verify();
        return v.success;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return false; // DORM_ACCOUNT_NOT_FOUND
        throw e;
      }
    },
    [],
    { enabled: dormLinked === null },
  );
  useEffect(() => {
    if (check.data != null) setDormLinked(check.data);
  }, [check.data, setDormLinked]);

  if (dormLinked === null) {
    if (check.error) return <Screen><ErrorView message={check.error} onRetry={check.reload} /></Screen>;
    return <Screen><LoadingView /></Screen>;
  }

  if (!dormLinked) {
    return (
      <Screen bg="white">
        <PageHeader eyebrow="생활관 서비스를 한곳에서" title="기숙사생활" />
        <DormLinkForm onLinked={() => {}} />
      </Screen>
    );
  }

  return <LinkedHome navigation={navigation} />;
}

function LinkedHome({ navigation }: { navigation: ScreenProps<'DormHome'>['navigation'] }) {
  const toast = useToast();
  const { data, refreshing, refresh } = useFetch(async () => {
    const [profile, menu, notices, spoint] = await Promise.allSettled([
      leaveApi.formDefaults('outing'),
      foodMenuApi.get(),
      noticeApi.list(),
      spointApi.get(),
    ]);
    const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
    return { profile: ok(profile), menu: ok(menu), notices: ok(notices), spoint: ok(spoint) };
  }, []);

  const today = data?.menu ? findToday(data.menu.days) : undefined;
  const lunch = today?.lunch?.[0] ?? today?.combinedMeal?.[0];
  const hour = new Date().getHours();
  const dinner = today?.dinner?.[0];
  const mealLine = hour >= 14 && dinner ? `오늘 저녁은 ${dinner}` : lunch ? `오늘 점심은 ${lunch}` : '오늘의 식단 보기';
  const latestScore = data?.spoint?.yearlyTotals?.[0];

  return (
    <Screen>
      <PageHeader
        eyebrow="생활관 서비스를 한곳에서"
        title="기숙사생활"
        right={
          <View style={styles.linkedBadge}>
            <Text style={styles.linkedBadgeText}>계정 연동됨</Text>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 35 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.resident}>
          <View style={{ flex: 1 }}>
            <Text style={styles.residentRoom}>{data?.profile ? `${data.profile.room} · ${data.profile.seat}` : '숭실대학교 생활관'}</Text>
            <Text style={styles.residentName}>{data?.profile ? `${data.profile.applicantName}님, 안녕하세요` : '안녕하세요'}</Text>
            <Pressable style={styles.mealPill} onPress={() => navigation.navigate('FoodMenu')}>
              <Icon name="meal" size={15} color="white" />
              <Text style={styles.mealPillText} numberOfLines={1}>{mealLine}</Text>
              <Icon name="chevron" size={13} color="white" />
            </Pressable>
          </View>
          <View style={styles.building}>
            <Icon name="dorm" size={45} color="white" />
          </View>
        </View>

        <Text style={styles.menuTitle}>자주 찾는 서비스</Text>
        <View style={styles.grid}>
          <GridItem icon="calendar" tone="mint" title="외박신청" sub="1~6일" onPress={() => navigation.navigate('LeaveList', { kind: 'outing' })} />
          <GridItem icon="calendar" tone="blue" title="장기비움" sub="7일 이상" onPress={() => navigation.navigate('LeaveList', { kind: 'longTerm' })} />
          <GridItem icon="tools" tone="orange" title="고쳐주세요" sub="시설 수리" onPress={() => navigation.navigate('RepairList')} />
          <GridItem icon="chat" tone="blue" title="일반 문의 · 상담" sub="비밀글 가능" onPress={() => navigation.navigate('InquiryList')} />
        </View>

        <QuickRow icon="meal" title="오늘의 식단" sub="조식 · 중식 · 석식" onPress={() => navigation.navigate('FoodMenu')} />
        <QuickRow icon="doc" title="입사신청 / 선발내역" sub="모집구분 · 선발여부 · 거주기간" onPress={() => navigation.navigate('IpsaList')} />

        <View style={styles.notice}>
          <View style={styles.noticeHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="notice" size={18} color={colors.primaryDeep} />
              <Text style={styles.noticeTitle}>공지사항</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('NoticeList')} hitSlop={8}>
              <Text style={styles.more}>더보기</Text>
            </Pressable>
          </View>
          {(data?.notices ?? []).slice(0, 3).map((n) => (
            <Pressable key={n.no} style={styles.noticeRow} onPress={() => navigation.navigate('NoticeDetail', { no: n.no })}>
              <Text style={styles.noticeText} numberOfLines={1}>{n.title}</Text>
              <Text style={styles.noticeDate}>{n.writtenDate}</Text>
            </Pressable>
          ))}
          {data && !data.notices && <Text style={styles.noticeDate}>공지사항을 불러오지 못했어요</Text>}
        </View>

        <Pressable style={styles.score} onPress={() => (data?.spoint ? navigation.navigate('Spoint') : toast('상벌점을 불러오지 못했어요'))}>
          <View style={{ minWidth: 95 }}>
            <Text style={styles.scoreLabel}>{latestScore ? `${latestScore.year}년 상벌점` : '상벌점 조회'}</Text>
            <Text style={styles.scoreValue}>{latestScore ? `${latestScore.total}점` : '-'}</Text>
          </View>
          <Text style={styles.scoreText}>상벌점 전체 내역을{'\n'}확인해보세요</Text>
          <View style={{ position: 'absolute', right: 16 }}>
            <Icon name="star" size={36} color={colors.yellowIcon} />
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const TONES = {
  mint: { bg: colors.primarySoft, fg: colors.primaryDark },
  blue: { bg: colors.blueSoft, fg: colors.blue },
  orange: { bg: colors.orangeSoft, fg: colors.orange },
};

function GridItem({ icon, tone, title, sub, onPress }: { icon: IconName; tone: keyof typeof TONES; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.gridItem} onPress={onPress}>
      <View style={[styles.gridIcon, { backgroundColor: TONES[tone].bg }]}>
        <Icon name={icon} color={TONES[tone].fg} />
      </View>
      <Text style={styles.gridTitle}>{title}</Text>
      <Text style={styles.gridSub}>{sub}</Text>
    </Pressable>
  );
}

function QuickRow({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quick} onPress={onPress}>
      <Icon name={icon} size={19} color={colors.primaryDeep} />
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub}>{sub}</Text>
      </View>
      <Icon name="chevron" size={15} color={colors.primaryDeep} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkedBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 15, backgroundColor: '#e0f1f5' },
  linkedBadgeText: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '700' },
  resident: { minHeight: 146, padding: 21, flexDirection: 'row', borderRadius: 22, backgroundColor: '#3f93b0', overflow: 'hidden' },
  residentRoom: { marginBottom: 8, fontSize: font.sm, color: 'rgba(255,255,255,0.8)' },
  residentName: { marginBottom: 10, fontSize: 19, fontWeight: '800', color: 'white' },
  mealPill: { alignSelf: 'flex-start', maxWidth: 230, height: 32, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.17)' },
  mealPillText: { flexShrink: 1, color: 'white', fontSize: font.xs },
  building: { width: 86, height: 86, alignSelf: 'center', borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  menuTitle: { marginTop: 24, marginBottom: 12, fontSize: 17, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48.5%', height: 124, padding: 14, borderWidth: 1, borderColor: '#e8edeb', borderRadius: 18, backgroundColor: 'white' },
  gridIcon: { width: 38, height: 38, marginBottom: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  gridSub: { marginTop: 2, color: '#909995', fontSize: font.xs },
  quick: { marginTop: 10, minHeight: 56, paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e4ebed', borderRadius: 14, backgroundColor: 'white' },
  quickTitle: { fontSize: font.md, fontWeight: '700', color: colors.primaryDeep },
  quickSub: { color: '#8d9a9f', fontSize: font.xs },
  notice: { marginTop: 22, padding: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: 'white' },
  noticeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noticeTitle: { color: colors.primaryDeep, fontSize: font.md, fontWeight: '700' },
  more: { color: '#909995', fontSize: font.xs },
  noticeRow: { paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: '#f0f2f1' },
  noticeText: { flex: 1, fontSize: font.sm, color: colors.text },
  noticeDate: { color: '#9ba29f', fontSize: font.xs },
  score: { marginTop: 13, padding: 16, flexDirection: 'row', alignItems: 'center', borderRadius: 17, backgroundColor: colors.yellowBg, overflow: 'hidden' },
  scoreLabel: { color: '#8d7737', fontSize: font.xs },
  scoreValue: { color: colors.yellowText, fontSize: 21, fontWeight: '800' },
  scoreText: { color: '#9d8a50', fontSize: font.xs, lineHeight: 17 },
});
