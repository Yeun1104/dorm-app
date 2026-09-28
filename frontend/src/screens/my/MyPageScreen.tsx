import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { profileApi, reservationApi } from '../../api/trade';
import { userApi } from '../../api/user';
import { useAuth, useMe } from '../../auth/AuthContext';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Feedback';
import { Avatar, BottomSheet, Button, Field, Input, PageHeader, Screen } from '../../components/ui';
import { SUPPORT_EMAIL } from '../../constants';
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

  const toast = useToast();
  const { refreshMe } = useAuth();
  const count = (s: string) => reservations.data?.filter((r) => r.status === s).length ?? 0;

  // ───── 프로필 사진 / 닉네임 수정 ─────
  const [photoSheet, setPhotoSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nicknameSheet, setNicknameSheet] = useState(false);
  const [nickname, setNickname] = useState('');
  const [savingName, setSavingName] = useState(false);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    setUploading(true);
    try {
      await userApi.uploadProfileImage({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType });
      await refreshMe();
      profile.silentReload();
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
    setSavingName(true);
    try {
      await userApi.updateNickname(nickname.trim());
      await refreshMe();
      profile.silentReload();
      setNicknameSheet(false);
      toast('닉네임을 변경했어요');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const openInquiry = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[나눠도] 문의')}`).catch(() => toast('메일 앱을 열 수 없어요'));

  return (
    <Screen>
      <PageHeader
        title="마이페이지"
        right={
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <Text style={styles.settings}>설정</Text>
          </Pressable>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
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
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            {/* 사진 누르면: 갤러리에서 가져오기 / 기본 이미지로 */}
            <Pressable onPress={() => setPhotoSheet(true)} accessibilityLabel="프로필 사진 변경">
              <Avatar name={me.nickname} uri={me.profileImageUrl} size={62} />
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={12} color={colors.text} />
              </View>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Pressable style={styles.nameRow} onPress={openNickname} hitSlop={6} accessibilityLabel="닉네임 변경">
                <Text style={styles.name} numberOfLines={1}>{me.nickname}</Text>
                <Icon name="edit" size={14} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.sub}>거래 {profile.data?.tradeCount ?? 0}회</Text>
            </View>
            <Pressable style={styles.profileBtn} onPress={() => navigation.navigate('UserProfile', { userId: me.userId })}>
              <Text style={styles.profileBtnText}>프로필 보기</Text>
            </Pressable>
          </View>
          {profile.data && (
            <View style={styles.manner}>
              <Text style={styles.mannerLabel}>받은 매너 평가</Text>
              <MannerBadges profile={profile.data} compact />
            </View>
          )}
        </View>

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

        <Pressable style={[styles.menu, styles.menuItem, { marginTop: 12 }]} onPress={openInquiry}>
          <Text style={styles.menuText}>문의하기</Text>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.version}>나눠도 v1.0.0 · 더 편리한 생활을 돕습니다</Text>
      </ScrollView>

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
        <Button label="저장" onPress={saveNickname} loading={savingName} style={{ marginTop: 8 }} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: { color: '#75807c', fontSize: font.md },
  profileCard: { padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: 'white' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'white', backgroundColor: '#eef1f0', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sheetTitle: { marginBottom: 14, fontSize: 20, fontWeight: '800', color: colors.text },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { flexShrink: 1, fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  sub: { marginTop: 3, color: colors.textMuted, fontSize: font.sm },
  profileBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, backgroundColor: '#f2f5f4' },
  profileBtnText: { fontSize: font.xs, fontWeight: '700', color: colors.textBody },
  manner: { marginTop: 16, paddingTop: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  mannerLabel: { fontSize: font.xs, fontWeight: '700', color: colors.textMuted },
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
