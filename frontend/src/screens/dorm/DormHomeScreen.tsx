import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { dormAccountApi, foodMenuApi, leaveApi, noticeApi, spointApi } from '../../api/dorm';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Feedback';
import Icon, { IconName } from '../../components/Icon';
import { ErrorView, LoadingView, PageHeader, Screen } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import DormLinkForm from './DormLinkForm';
import { findToday, mealPreview } from './foodMenu';

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
        <PageHeader title="기숙사생활" />
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

  const preview = mealPreview(data?.menu ? findToday(data.menu.days) : undefined);
  const residentInfo = data?.profile ? [[data.profile.room, data.profile.seat].filter(Boolean).join(' '), data.profile.applicantName].filter(Boolean).join(' · ') : null;
  const latestScore = data?.spoint?.yearlyTotals?.[0];

  return (
    <Screen>
      <PageHeader
        title="기숙사생활"
        right={
          residentInfo ? (
            <View style={styles.linkedBadge}>
              <Text style={styles.linkedBadgeText} numberOfLines={1}>{residentInfo}</Text>
            </View>
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 35 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Pressable style={styles.meal} onPress={() => navigation.navigate('FoodMenu')}>
          <View style={styles.mealHead}>
            <Icon name="meal" size={16} color={colors.primaryDeep} />
            <Text style={styles.mealLabel}>
              {preview.kind === 'none' ? '오늘의 식단' : `오늘의 ${preview.label === '오늘' ? '식단' : preview.label}`}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.mealMore}>전체 식단</Text>
            <Icon name="chevron" size={13} color="#909995" />
          </View>
          {preview.kind === 'menu' ? (
            <Text style={styles.mealMenu} numberOfLines={3}>{preview.items.join(' · ')}</Text>
          ) : preview.kind === 'closed' ? (
            <>
              <Text style={styles.mealClosed}>{preview.label === '오늘' ? '오늘은 식당을 운영하지 않아요' : `${preview.label}은 미운영이에요`}</Text>
              {!!preview.notice && <Text style={styles.mealNotice} numberOfLines={2}>{preview.notice}</Text>}
            </>
          ) : (
            <Text style={styles.mealClosed}>{data ? (data.menu ? '오늘의 식단 정보가 없어요' : '식단을 불러오지 못했어요') : '식단을 불러오는 중…'}</Text>
          )}
        </Pressable>

        <Text style={styles.menuTitle}>자주 찾는 서비스</Text>
        <View style={styles.grid}>
          <GridItem icon="calendar" tone="mint" title="외박신청" sub="1~6일" onPress={() => navigation.navigate('LeaveList', { kind: 'outing' })} />
          <GridItem icon="calendar" tone="blue" title="장기비움" sub="7일 이상" onPress={() => navigation.navigate('LeaveList', { kind: 'longTerm' })} />
          <GridItem icon="tools" tone="orange" title="고쳐주세요" sub="시설 수리" onPress={() => navigation.navigate('RepairList')} />
          <GridItem icon="chat" tone="blue" title="일반 문의 · 상담" sub="비밀글 가능" onPress={() => navigation.navigate('InquiryList')} />
        </View>

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
          <Text style={styles.scoreLabel}>{latestScore ? `${latestScore.year} 상벌점` : '상벌점'}</Text>
          <Text style={styles.scoreValue}>{latestScore ? `${latestScore.total}점` : '-'}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.scoreText}>상벌점 조회</Text>
          <Icon name="chevron" size={15} color="#9d8a50" />
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
  linkedBadge: { maxWidth: 190, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 15, backgroundColor: '#e0f1f5' },
  linkedBadgeText: { color: colors.primaryDark, fontSize: font.xs, fontWeight: '700' },
  meal: { minHeight: 120, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  mealHead: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealLabel: { color: colors.primaryDeep, fontSize: font.md, fontWeight: '800' },
  mealMore: { color: '#909995', fontSize: font.xs },
  mealMenu: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  mealClosed: { color: colors.text, fontSize: 16, fontWeight: '700' },
  mealNotice: { marginTop: 6, color: colors.textSub, fontSize: font.xs, lineHeight: 17 },
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
  score: { marginTop: 13, minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: colors.yellowBg },
  scoreLabel: { color: '#8d7737', fontSize: font.md, fontWeight: '700' },
  scoreValue: { color: colors.yellowText, fontSize: 21, fontWeight: '800' },
  scoreText: { color: '#9d8a50', fontSize: font.sm, fontWeight: '600' },
});
