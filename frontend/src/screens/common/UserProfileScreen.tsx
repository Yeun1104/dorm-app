import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { profileApi } from '../../api/trade';
import type { BoardSummary, Profile } from '../../api/types';
import { userApi } from '../../api/user';
import { useAuth, useMe } from '../../auth/AuthContext';
import { BoardStatusChip } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Avatar, BottomSheet, Button, ErrorView, Field, Input, LoadingView, Screen, SegmentedTabs, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { formatDate, won } from '../../utils/format';

export default function UserProfileScreen({ navigation, route }: ScreenProps<'UserProfile'>) {
  const { userId } = route.params;
  const me = useMe();
  const { refreshMe } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => profileApi.get(userId), [userId]);
  const isMe = userId === me.userId;
  const [nicknameSheet, setNicknameSheet] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const openNickname = () => {
    setNickname(me.nickname ?? '');
    setNicknameSheet(true);
  };

  const saveNickname = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await userApi.updateNickname(nickname.trim());
      await refreshMe();
      reload();
      setNicknameSheet(false);
      toast('닉네임을 변경했어요');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

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
        <ProfileBody profile={data} onBoard={(id) => navigation.navigate('BoardDetail', { boardId: id })} onEditNickname={isMe ? openNickname : undefined} />
      )}

      <BottomSheet visible={nicknameSheet} onClose={() => setNicknameSheet(false)}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>닉네임 변경</Text>
        <Field label="새 닉네임">
          <Input value={nickname} onChangeText={setNickname} maxLength={20} autoFocus />
        </Field>
        <Button label="저장" onPress={saveNickname} loading={saving} style={{ marginTop: 8 }} />
      </BottomSheet>
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

function ProfileBody({ profile, onBoard, onEditNickname }: { profile: Profile; onBoard: (id: number) => void; onEditNickname?: () => void }) {
  const [tab, setTab] = useState<'progress' | 'done'>('progress');
  const list = tab === 'progress' ? profile.inProgressBoards : profile.completedBoards;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Avatar name={profile.nickname} size={62} />
        {onEditNickname ? (
          <Pressable style={styles.nameRow} onPress={onEditNickname} hitSlop={6} accessibilityLabel="닉네임 변경">
            <Text style={[styles.name, { marginTop: 0 }]}>{profile.nickname}</Text>
            <View style={styles.editBtn}>
              <Icon name="edit" size={13} color={colors.textBody} />
            </View>
          </Pressable>
        ) : (
          <Text style={styles.name}>{profile.nickname}</Text>
        )}
        <Text style={styles.sub}>거래 {profile.tradeCount}회</Text>
        {(profile.dormVerified || profile.schoolVerified) && (
          <View style={styles.verifyRow}>
            {profile.schoolVerified && <VerifyBadge icon="shield" label="숭실대 인증" tone="blue" />}
            {profile.dormVerified && <VerifyBadge icon="dorm" label="기숙사생" tone="mint" />}
          </View>
        )}
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

const VERIFY_TONES = {
  blue: { fg: '#3478f6', bg: '#edf3ff' },
  mint: { fg: colors.primaryDark, bg: colors.primarySoft2 },
};

/** 인증 배지: 색 동그라미 아이콘 + 짧은 라벨 */
function VerifyBadge({ icon, label, tone }: { icon: 'shield' | 'dorm'; label: string; tone: keyof typeof VERIFY_TONES }) {
  const t = VERIFY_TONES[tone];
  return (
    <View style={[styles.verify, { backgroundColor: t.bg }]}>
      <View style={[styles.verifyIcon, { backgroundColor: t.fg }]}>
        <Icon name={icon} size={11} color="white" strokeWidth={2.2} />
      </View>
      <Text style={[styles.verifyText, { color: t.fg }]}>{label}</Text>
    </View>
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
  nameRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eef1f0', alignItems: 'center', justifyContent: 'center' },
  sub: { marginTop: 3, color: '#829097', fontSize: font.sm },
  verifyRow: { marginTop: 12, flexDirection: 'row', gap: 6 },
  verify: { height: 26, paddingLeft: 4, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13 },
  verifyIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  verifyText: { fontSize: font.xs, fontWeight: '700' },
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
