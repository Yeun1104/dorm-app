import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { profileApi } from '../../api/trade';
import type { BoardSummary, Profile } from '../../api/types';
import { userApi } from '../../api/user';
import { useAuth, useMe } from '../../auth/AuthContext';
import { SquareBoardCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Avatar, BottomSheet, Button, EmptyState, ErrorView, Field, FilterPills, Input, LoadingView, Screen, SegmentedTabs, SubHeader } from '../../components/ui';
import { useBoards } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

export type BoardFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';
export const BOARD_FILTERS: { value: BoardFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'IN_PROGRESS', label: '모집중' },
  { value: 'COMPLETED', label: '모집완료' },
];

/** 프로필의 모집중 + 완료 글을 최신순으로 합치고 필터 적용 */
export function profileBoards(profile: Profile, filter: BoardFilter): BoardSummary[] {
  const list = filter === 'IN_PROGRESS' ? profile.inProgressBoards : filter === 'COMPLETED' ? profile.completedBoards : [...profile.inProgressBoards, ...profile.completedBoards];
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export default function UserProfileScreen({ navigation, route }: ScreenProps<'UserProfile'>) {
  const { userId } = route.params;
  const me = useMe();
  const { refreshMe } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, silentReload } = useFetch(() => profileApi.get(userId), [userId], { refetchOnFocus: true });
  const isMe = userId === me.userId;

  // ───── 내 프로필이면: 사진 / 닉네임 수정 ─────
  const [photoSheet, setPhotoSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nicknameSheet, setNicknameSheet] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    setUploading(true);
    try {
      await userApi.uploadProfileImage({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType });
      await refreshMe();
      silentReload();
      setPhotoSheet(false);
      toast('프로필 사진을 바꿨어요');
    } catch (e) {
      toast(errorMessage(e, '사진을 올리지 못했어요 (jpg/png/webp/gif, 5MB 이하)'));
    } finally {
      setUploading(false);
    }
  };

  const resetPhoto = () => {
    setPhotoSheet(false);
    // TODO: 백엔드에 프로필 사진 삭제(기본 이미지로) API가 생기면 연결 — 지금은 등록/변경(POST)만 있음
    toast('기본 이미지로 되돌리기는 서버 기능이 추가되면 사용할 수 있어요');
  };

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
      silentReload();
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
        <ProfileBody
          profile={data}
          isMe={isMe}
          photoUri={isMe ? me.profileImageUrl : data.profileImageUrl}
          onBoard={(id) => navigation.navigate('BoardDetail', { boardId: id })}
          onAllBoards={() => (isMe ? navigation.navigate('MyPosts') : navigation.navigate('UserBoards', { userId }))}
          onEditPhoto={isMe ? () => setPhotoSheet(true) : undefined}
          onEditNickname={isMe ? openNickname : undefined}
        />
      )}

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)}>
        <Text style={styles.sheetTitle}>프로필 사진</Text>
        <Button label="갤러리에서 가져오기" onPress={pickPhoto} loading={uploading} />
        <Button label="기본 이미지로 변경" variant="soft" onPress={resetPhoto} disabled={!me.profileImageUrl || uploading} style={{ marginTop: 8 }} />
      </BottomSheet>

      <BottomSheet visible={nicknameSheet} onClose={() => setNicknameSheet(false)}>
        <Text style={styles.sheetTitle}>닉네임 변경</Text>
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

function ProfileBody({
  profile,
  isMe,
  photoUri,
  onBoard,
  onAllBoards,
  onEditPhoto,
  onEditNickname,
}: {
  profile: Profile;
  isMe: boolean;
  photoUri: string | null;
  onBoard: (id: number) => void;
  onAllBoards: () => void;
  onEditPhoto?: () => void;
  onEditNickname?: () => void;
}) {
  const [tab, setTab] = useState<'boards' | 'manner'>('boards');
  const [filter, setFilter] = useState<BoardFilter>('ALL');
  const list = profileBoards(profile, filter);
  // 프로필 응답엔 사진·장소가 없어서 게시글 상세를 (캐시로) 받아 씀
  const boards = useBoards(list.map((b) => b.id));
  const total = profile.inProgressBoards.length + profile.completedBoards.length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 사진 · 닉네임 · 거래 횟수 · 인증 배지 */}
      <View style={styles.hero}>
        <Pressable onPress={onEditPhoto} disabled={!onEditPhoto} accessibilityLabel={onEditPhoto ? '프로필 사진 변경' : undefined}>
          <Avatar name={profile.nickname} uri={photoUri} size={76} />
          {onEditPhoto && (
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={13} color={colors.text} />
            </View>
          )}
        </Pressable>
        <Pressable style={styles.nameRow} onPress={onEditNickname} disabled={!onEditNickname} hitSlop={6}>
          <Text style={styles.name}>{profile.nickname}</Text>
          {onEditNickname && <Icon name="edit" size={15} color={colors.textMuted} />}
        </Pressable>
        <Text style={styles.sub}>거래 {profile.tradeCount}회</Text>
        {(profile.dormVerified || profile.schoolVerified) && (
          <View style={styles.verifyRow}>
            {profile.schoolVerified && <VerifyBadge icon="shield" label="숭실대 인증" tone="blue" />}
            {profile.dormVerified && <VerifyBadge icon="dorm" label="기숙사생" tone="mint" />}
          </View>
        )}
      </View>

      <SegmentedTabs
        tabs={[
          { value: 'boards', label: `판매 글 ${total}` },
          { value: 'manner', label: '매너 평가' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'boards' ? (
        <View>
          <View style={styles.boardsHead}>
            <Text style={styles.boardsTitle} numberOfLines={1}>
              {isMe ? '내가 쓴 글' : `${profile.nickname}님의 판매 글`}
            </Text>
            <Pressable style={styles.moreBtn} onPress={onAllBoards} hitSlop={8} accessibilityLabel="전체 보기">
              <Text style={styles.moreText}>전체 보기</Text>
              <Icon name="chevron" size={15} color={colors.textMuted} />
            </Pressable>
          </View>
          <FilterPills options={BOARD_FILTERS} value={filter} onChange={setFilter} />
          {list.length === 0 ? (
            <Text style={styles.empty}>{filter === 'COMPLETED' ? '모집완료된 글이 없어요' : filter === 'IN_PROGRESS' ? '모집 중인 글이 없어요' : '아직 작성한 글이 없어요'}</Text>
          ) : (
            // 옆으로 넘겨보는 정사각형 카드
            <FlatList
              horizontal
              data={list}
              keyExtractor={(b) => String(b.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, gap: 12 }}
              renderItem={({ item }) => <SquareBoardCard summary={item} board={boards[item.id]} onPress={() => onBoard(item.id)} />}
            />
          )}
        </View>
      ) : (
        <View style={styles.mannerWrap}>
          <Text style={styles.mannerTitle}>{isMe ? '내가 받은 매너 평가' : `${profile.nickname}님이 받은 매너 평가`}</Text>
          {profile.topMannerBadges.length === 0 ? (
            <EmptyState icon="star" title="아직 받은 매너 평가가 없어요" message="거래를 마치면 서로 매너 평가를 남길 수 있어요." />
          ) : (
            <View style={styles.mannerList}>
              {profile.topMannerBadges.map((b, i) => (
                <View key={b.label} style={[styles.mannerRow, i < profile.topMannerBadges.length - 1 && styles.mannerDivider]}>
                  <Text style={styles.mannerLabel}>{b.label}</Text>
                  <View style={styles.mannerCount}>
                    <Icon name="user" size={13} color={colors.textMuted} />
                    <Text style={styles.mannerCountText}>{b.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
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

const styles = StyleSheet.create({
  report: { color: '#d55e63', fontSize: font.sm, fontWeight: '600' },
  sheetTitle: { marginBottom: 14, fontSize: 20, fontWeight: '800', color: colors.text },
  hero: { paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.bgSub, backgroundColor: '#eef1f0', alignItems: 'center', justifyContent: 'center' },
  nameRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { marginTop: 3, color: colors.textMuted, fontSize: font.sm },
  verifyRow: { marginTop: 12, flexDirection: 'row', gap: 6 },
  verify: { height: 26, paddingLeft: 4, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13 },
  verifyIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  verifyText: { fontSize: font.xs, fontWeight: '700' },
  boardsHead: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  boardsTitle: { flex: 1, fontSize: font.base, fontWeight: '800', color: colors.text },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontSize: font.sm, color: colors.textMuted },
  empty: { paddingVertical: 36, textAlign: 'center', color: colors.textMuted, fontSize: font.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primarySoft2 },
  badgeCompact: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: 'white' },
  badgeText: { color: colors.primaryDeep, fontSize: font.sm },
  mannerWrap: { padding: 18 },
  mannerTitle: { marginBottom: 10, fontSize: font.base, fontWeight: '800', color: colors.text },
  mannerList: { paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  mannerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  mannerDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  mannerLabel: { flex: 1, fontSize: font.md, color: colors.text },
  mannerCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mannerCountText: { fontSize: font.md, fontWeight: '800', color: colors.text },
});
