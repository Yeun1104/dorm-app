import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { profileApi } from '../../api/trade';
import type { BoardSummary, Profile } from '../../api/types';
import { userApi } from '../../api/user';
import { useAuth, useMe } from '../../auth/AuthContext';
import { SquareBoardCard } from '../../components/BoardCard';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Avatar, BottomSheet, Button, ErrorView, Field, Input, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useBoards } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import { useWebDragScroll } from '../../hooks/useWebDragScroll';
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
    return <Text style={{ fontSize: font.sm, color: colors.textMuted }}>아직 받은 매너 평가가 없어요</Text>;
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

/**
 * 프로필
 * [사진]  닉네임 ✎            ← 사진 왼쪽, 닉네임 오른쪽
 *         거래 N회
 * (숭실대 인증) (기숙사생)     ← 인증 배지
 * 받은 매너 평가 (키워드 · 횟수)
 * OO님이 쓴 글 ········ 전체 보기 >   ← 미리보기 (전체/모집중/모집완료는 목록 화면에서)
 */
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
  const list = profileBoards(profile, 'ALL');
  // 프로필 응답엔 사진·장소가 없어서 게시글 상세를 (캐시로) 받아 씀
  const boards = useBoards(list.map((b) => b.id));
  const slider = useRef<FlatList<BoardSummary>>(null);
  const drag = useWebDragScroll({ scrollTo: (x, animated) => slider.current?.scrollToOffset({ offset: x, animated }) });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 사진(왼쪽) · 닉네임(오른쪽) */}
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={onEditPhoto} disabled={!onEditPhoto} accessibilityLabel={onEditPhoto ? '프로필 사진 변경' : undefined}>
            <Avatar name={profile.nickname} uri={photoUri} size={68} />
            {onEditPhoto && (
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={12} color={colors.text} />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Pressable style={styles.nameRow} onPress={onEditNickname} disabled={!onEditNickname} hitSlop={6}>
              <Text style={styles.name} numberOfLines={1}>{profile.nickname}</Text>
              {onEditNickname && <Icon name="edit" size={15} color={colors.textMuted} />}
            </Pressable>
            <Text style={styles.sub}>거래 {profile.tradeCount}회</Text>
          </View>
        </View>
        {(profile.dormVerified || profile.schoolVerified) && (
          <View style={styles.verifyRow}>
            {profile.schoolVerified && <VerifyBadge icon="shield" label="숭실대 인증" tone="blue" />}
            {profile.dormVerified && <VerifyBadge icon="dorm" label="기숙사생" tone="mint" />}
          </View>
        )}
      </View>

      {/* 받은 매너 평가 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>받은 매너 평가</Text>
        {/* 마이페이지와 같은 칩 모양 (가장 많이 받은 3개) */}
        <MannerBadges profile={profile} compact />
      </View>

      {/* 쓴 글 미리보기 */}
      <View style={styles.section}>
        <View style={styles.boardsHead}>
          <Text style={[styles.sectionTitle, { flex: 1 }]} numberOfLines={1}>
            {isMe ? '내가 쓴 글' : `${profile.nickname}님이 쓴 글`} <Text style={styles.count}>{list.length}</Text>
          </Text>
          {list.length > 0 && (
            <Pressable style={styles.moreBtn} onPress={onAllBoards} hitSlop={8} accessibilityLabel="전체 보기">
              <Text style={styles.moreText}>전체 보기</Text>
              <Icon name="chevron" size={15} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {list.length === 0 ? (
          <Text style={styles.sectionEmpty}>아직 작성한 글이 없어요</Text>
        ) : (
          <View {...drag.panHandlers} style={[{ marginHorizontal: -18 }, drag.style]}>
            <FlatList
              ref={slider}
              horizontal
              data={list}
              keyExtractor={(b) => String(b.id)}
              showsHorizontalScrollIndicator={false}
              onScroll={drag.onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
              renderItem={({ item }) => <SquareBoardCard summary={item} board={boards[item.id]} onPress={() => onBoard(item.id)} />}
            />
          </View>
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

const styles = StyleSheet.create({
  report: { color: '#d55e63', fontSize: font.sm, fontWeight: '600' },
  sheetTitle: { marginBottom: 14, fontSize: 20, fontWeight: '800', color: colors.text },
  hero: { marginHorizontal: 18, marginTop: 16, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'white', backgroundColor: '#eef1f0', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { marginTop: 4, color: colors.textMuted, fontSize: font.sm },
  verifyRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  verify: { height: 26, paddingLeft: 4, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13 },
  verifyIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  verifyText: { fontSize: font.xs, fontWeight: '700' },
  section: { marginTop: 26, paddingHorizontal: 18 },
  sectionTitle: { marginBottom: 12, fontSize: font.base, fontWeight: '800', color: colors.text },
  sectionEmpty: { paddingVertical: 18, textAlign: 'center', color: colors.textMuted, fontSize: font.sm },
  count: { color: colors.textMuted, fontWeight: '600' },
  boardsHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontSize: font.sm, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f3f2' },
  badgeCompact: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f1f3f2' },
  badgeText: { color: colors.text, fontSize: font.sm },
});
