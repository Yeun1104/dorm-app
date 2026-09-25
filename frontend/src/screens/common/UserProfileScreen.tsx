import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { profileApi } from '../../api/trade';
import type { BoardSummary, Profile } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { BoardStatusChip } from '../../components/BoardCard';
import Icon from '../../components/Icon';
import { Avatar, ErrorView, LoadingView, Screen, SegmentedTabs, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { formatDate, won } from '../../utils/format';

export default function UserProfileScreen({ navigation, route }: ScreenProps<'UserProfile'>) {
  const { userId } = route.params;
  const me = useMe();
  const { data, error, loading, reload } = useFetch(() => profileApi.get(userId), [userId]);
  const isMe = userId === me.userId;

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title="프로필"
        action={
          !isMe && data ? (
            <Pressable onPress={() => navigation.navigate('Report', { userId, nickname: data.nickname })} hitSlop={8}>
              <Text style={styles.report}>신고하기</Text>
            </Pressable>
          ) : null
        }
      />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '프로필을 불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ProfileBody profile={data} onBoard={(id) => navigation.navigate('BoardDetail', { boardId: id })} />
      )}
    </Screen>
  );
}

export function MannerBadges({ profile, compact }: { profile: Profile; compact?: boolean }) {
  if (!profile.topMannerBadges.length) {
    return <Text style={{ fontSize: font.xs, color: colors.textMuted }}>아직 받은 매너 평가가 없어요</Text>;
  }
  return (
    <View style={styles.badges}>
      {profile.topMannerBadges.map((b) => (
        <View key={b.label} style={[styles.badge, compact && styles.badgeCompact]}>
          <Text style={[styles.badgeText, compact && { fontSize: font.xs }]}>
            {b.label} <Text style={{ fontWeight: '800' }}>{b.count}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProfileBody({ profile, onBoard }: { profile: Profile; onBoard: (id: number) => void }) {
  const [tab, setTab] = useState<'progress' | 'done'>('progress');
  const list = tab === 'progress' ? profile.inProgressBoards : profile.completedBoards;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Avatar name={profile.nickname} size={62} />
        <Text style={styles.name}>{profile.nickname}</Text>
        <Text style={styles.sub}>거래 {profile.tradeCount}회</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>많이 받은 매너 평가</Text>
        <MannerBadges profile={profile} />
      </View>

      <View style={[styles.section, { padding: 0, overflow: 'hidden' }]}>
        <SegmentedTabs
          tabs={[
            { value: 'progress', label: `모집중 ${profile.inProgressBoards.length}` },
            { value: 'done', label: `완료 ${profile.completedBoards.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        {list.length === 0 ? (
          <Text style={styles.empty}>{tab === 'progress' ? '모집 중인 글이 없어요' : '완료된 거래가 없어요'}</Text>
        ) : (
          list.map((b) => <SummaryRow key={b.id} board={b} onPress={() => onBoard(b.id)} />)
        )}
      </View>
    </ScrollView>
  );
}

function SummaryRow({ board, onPress }: { board: BoardSummary; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BoardStatusChip status={board.status} />
          <Text style={styles.rowTitle} numberOfLines={1}>{board.title}</Text>
        </View>
        <Text style={styles.rowSub}>개당 {won(board.unitPrice)} · 총 {board.totalQuantity}개 · {formatDate(board.createdAt)}</Text>
      </View>
      <Icon name="chevron" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  report: { color: '#d55e63', fontSize: font.sm, fontWeight: '600' },
  hero: { paddingTop: 16, paddingBottom: 18, alignItems: 'center' },
  name: { marginTop: 10, fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { marginTop: 3, color: '#829097', fontSize: font.sm },
  section: { marginTop: 12, padding: 15, borderWidth: 1, borderColor: '#e1e8ea', borderRadius: 15, backgroundColor: 'white' },
  sectionTitle: { marginBottom: 11, fontSize: font.md, fontWeight: '700', color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primarySoft2 },
  badgeCompact: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: 'white' },
  badgeText: { color: colors.primaryDeep, fontSize: font.sm },
  empty: { padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: font.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowTitle: { flexShrink: 1, fontSize: font.md, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: font.xs, color: colors.textMuted },
});
