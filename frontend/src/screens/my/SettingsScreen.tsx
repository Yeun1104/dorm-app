import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { userApi } from '../../api/user';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { BottomSheet, Button, Field, Input, Screen, SubHeader } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function SettingsScreen(_: ScreenProps<'Settings'>) {
  const { me, logout, withdraw, refreshMe } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [nicknameSheet, setNicknameSheet] = useState(false);
  const [nickname, setNickname] = useState(me?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  const saveNickname = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await userApi.updateNickname(nickname.trim());
      await refreshMe();
      setNicknameSheet(false);
      toast('닉네임을 변경했어요');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
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
          <Pressable style={styles.item} onPress={() => setNicknameSheet(true)}>
            <Text style={styles.itemText}>닉네임 변경</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.itemValue}>{me?.nickname}</Text>
              <Icon name="chevron" size={17} color={colors.textMuted} />
            </View>
          </Pressable>
          <View style={[styles.item, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemText}>이메일</Text>
            <Text style={styles.itemValue}>{me?.email}</Text>
          </View>
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

const styles = StyleSheet.create({
  section: { marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white' },
  sectionTitle: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 7, color: '#7f8a85', fontSize: font.xs, fontWeight: '700' },
  item: { minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemText: { fontSize: font.base, color: colors.text },
  itemValue: { fontSize: font.sm, color: colors.textMuted },
});
