import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { profileApi, reservationApi } from '../../api/trade';
import { useMe } from '../../auth/AuthContext';
import Icon from '../../components/Icon';
import { Avatar, PageHeader, Screen } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { AppStackParamList, ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { MannerBadges } from '../common/UserProfileScreen';

const MENU: [string, keyof AppStackParamList][] = [
  ['내 참여 신청 내역', 'MyReservations'],
  ['좋아요한 글', 'LikedBoards'],
  ['내가 쓴 글', 'MyPosts'],
  ['기숙사 계정 관리', 'DormAccount'],
];

export default function MyPageScreen({ navigation }: ScreenProps<'MyPage'>) {
  const me = useMe();
  const profile = useFetch(() => profileApi.get(me.userId), [me.userId], { refetchOnFocus: true });
  const reservations = useFetch(() => reservationApi.mine(), [], { refetchOnFocus: true });

  const count = (s: string) => reservations.data?.filter((r) => r.status === s).length ?? 0;

  return (
    <Screen>
      <PageHeader
        eyebrow="나의 숭팔이"
        title="마이페이지"
        right={
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <Text style={styles.settings}>설정</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 35 }}
        refreshControl={
          <RefreshControl
            refreshing={profile.refreshing}
            onRefresh={() => {
              profile.refresh();
              reservations.silentReload();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.profileCard} onPress={() => navigation.navigate('UserProfile', { userId: me.userId })}>
          <Avatar name={me.nickname} size={62} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{me.nickname}</Text>
            <Text style={styles.sub}>거래 {profile.data?.tradeCount ?? 0}회</Text>
            {profile.data && <MannerBadges profile={profile.data} compact />}
          </View>
          <Icon name="chevron" size={18} color={colors.textFaint} />
        </Pressable>

        <View style={styles.activity}>
          {[
            ['PENDING', '참여 대기'],
            ['ACCEPTED', '진행중'],
            ['COMPLETED', '거래완료'],
          ].map(([status, label], i) => (
            <Pressable key={status} style={[styles.activityItem, i < 2 && styles.activityDivider]} onPress={() => navigation.navigate('MyReservations')}>
              <Text style={styles.activityNum}>{count(status)}</Text>
              <Text style={styles.activityLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menu}>
          {MENU.map(([label, target], i) => (
            <Pressable key={label} style={[styles.menuItem, i < MENU.length - 1 && styles.menuDivider]} onPress={() => navigation.navigate(target as never)}>
              <Text style={styles.menuText}>{label}</Text>
              <Icon name="chevron" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.version}>숭팔이 v1.0.0 · 숭실대 기숙사 생활의 든든한 친구</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: { color: '#75807c', fontSize: font.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, borderRadius: 21, backgroundColor: '#e6f3f6' },
  name: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 3 },
  sub: { marginBottom: 9, color: '#6f7c77', fontSize: font.sm },
  activity: { marginVertical: 14, paddingVertical: 17, paddingHorizontal: 5, flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: 'white' },
  activityItem: { flex: 1, alignItems: 'center', gap: 3 },
  activityDivider: { borderRightWidth: 1, borderRightColor: '#e5eae8' },
  activityNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  activityLabel: { color: '#86908c', fontSize: font.xs },
  menu: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: 'white' },
  menuItem: { height: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuText: { fontSize: font.base, color: colors.text },
  version: { marginTop: 24, textAlign: 'center', color: '#a0a7a4', fontSize: font.xs },
});
