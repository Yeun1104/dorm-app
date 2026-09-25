import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Screen, SubHeader } from '../../components/ui';
import { clearBoardCache } from '../../hooks/useBoards';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { prefs } from '../../utils/prefs';

const SWITCH_BLUE = '#3478f6';
const switchColors = {
  trackColor: { true: SWITCH_BLUE, false: '#dfe3e6' },
  thumbColor: 'white',
  ios_backgroundColor: '#dfe3e6',
  // react-native-web 전용 prop (타입엔 없음)
  ...({ activeThumbColor: 'white', activeTrackColor: SWITCH_BLUE } as object),
};

const NOTIFICATION_DEFAULTS = { push: true, chat: true, request: true, trade: true, notice: true };
type NotificationSettings = typeof NOTIFICATION_DEFAULTS;

const NOTIFICATION_ITEMS: { key: Exclude<keyof NotificationSettings, 'push'>; label: string; sub: string }[] = [
  { key: 'chat', label: '채팅 메시지', sub: '새 채팅 메시지가 오면 알려드려요' },
  { key: 'request', label: '참여 요청', sub: '내 글에 참여 요청이 오거나 내 요청이 수락·거절되면' },
  { key: 'trade', label: '모집 · 거래 상태', sub: '참여한 공동구매가 모집완료·거래완료되면' },
  { key: 'notice', label: '기숙사 공지사항', sub: '새 공지사항이 올라오면' },
];

export default function SettingsScreen(_: ScreenProps<'Settings'>) {
  const { me, logout, withdraw } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [noti, setNoti] = useState<NotificationSettings>(NOTIFICATION_DEFAULTS);

  useEffect(() => {
    prefs.get('notifications', NOTIFICATION_DEFAULTS).then(setNoti);
  }, []);

  const updateNoti = (patch: Partial<NotificationSettings>) => {
    const next = { ...noti, ...patch };
    setNoti(next);
    prefs.set('notifications', next).catch(() => toast('설정을 저장하지 못했어요'));
  };

  const clearCache = async () => {
    const ok = await confirm({ title: '캐시를 삭제할까요?', message: '저장된 이미지와 임시 데이터를 지워요. 로그인 정보와 설정은 유지돼요.', confirmText: '삭제' });
    if (!ok) return;
    try {
      clearBoardCache();
      await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]);
      toast('캐시를 삭제했어요');
    } catch (e) {
      toast(errorMessage(e, '캐시를 삭제하지 못했어요'));
    }
  };

  const onLogout = async () => {
    if (await confirm({ title: '로그아웃할까요?', message: '언제든 다시 로그인할 수 있어요.', confirmText: '로그아웃' })) {
      await logout().catch(() => {});
    }
  };

  const onWithdraw = async () => {
    const ok = await confirm({ title: '정말 탈퇴할까요?', message: '참여 및 거래 내역이 모두 삭제되며 복구할 수 없어요.', confirmText: '탈퇴하기', danger: true });
    if (!ok) return;
    try {
      await withdraw();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="설정" />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={[styles.item, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemText}>이메일</Text>
            <Text style={styles.itemValue}>{me?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>푸시 알림</Text>
              <Text style={styles.itemSub}>끄면 모든 알림을 받지 않아요</Text>
            </View>
            <Switch value={noti.push} onValueChange={(v) => updateNoti({ push: v })} {...switchColors} />
          </View>
          {NOTIFICATION_ITEMS.map((n, i) => (
            <View key={n.key} style={[styles.item, i === NOTIFICATION_ITEMS.length - 1 && { borderBottomWidth: 0 }, !noti.push && { opacity: 0.45 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>{n.label}</Text>
                <Text style={styles.itemSub}>{n.sub}</Text>
              </View>
              <Switch
                value={noti.push && noti[n.key]}
                disabled={!noti.push}
                onValueChange={(v) => updateNoti({ [n.key]: v })}
                {...switchColors}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>저장 공간</Text>
          <Pressable style={[styles.item, { borderBottomWidth: 0 }]} onPress={clearCache}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>캐시 삭제</Text>
              <Text style={styles.itemSub}>이미지·게시글 임시 데이터를 지워요</Text>
            </View>
            <Icon name="chevron" size={17} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={[styles.item, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemText}>앱 버전</Text>
            <Text style={styles.itemValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <Pressable style={styles.item} onPress={onLogout}>
            <Text style={[styles.itemText, { color: '#64706b' }]}>로그아웃</Text>
          </Pressable>
          <Pressable style={[styles.item, { borderBottomWidth: 0 }]} onPress={onWithdraw}>
            <Text style={[styles.itemText, { color: '#df5c60' }]}>탈퇴하기</Text>
          </Pressable>
        </View>
      </ScrollView>

    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white' },
  sectionTitle: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 7, color: '#7f8a85', fontSize: font.xs, fontWeight: '700' },
  item: { minHeight: 54, paddingHorizontal: 15, paddingVertical: 10, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemText: { fontSize: font.base, color: colors.text },
  itemSub: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
  itemValue: { fontSize: font.sm, color: colors.textMuted },
});
