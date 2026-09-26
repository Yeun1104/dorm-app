import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Screen, SubHeader } from '../../components/ui';
import { clearBoardCache } from '../../hooks/useBoards';
import type { ScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { HISTORY_SETTINGS_DEFAULTS, HistorySettings, historySettings } from '../../utils/historySettings';
import { settingStyles as styles, switchColors } from './settingsShared';

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { me, logout, withdraw } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [record, setRecord] = useState<HistorySettings>(HISTORY_SETTINGS_DEFAULTS);

  useEffect(() => {
    historySettings.get().then(setRecord);
  }, []);

  const updateRecord = (patch: Partial<HistorySettings>) => {
    const next = { ...record, ...patch };
    setRecord(next);
    historySettings.set(next).catch(() => toast('설정을 저장하지 못했어요'));
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={[styles.item, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemText}>이메일</Text>
            <Text style={styles.itemValue}>{me?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <Pressable style={[styles.item, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('NotificationSettings')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>알림 설정</Text>
              <Text style={styles.itemSub}>채팅, 참여 요청, 거래 상태, 기숙사 공지</Text>
            </View>
            <Icon name="chevron" size={17} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기록</Text>
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>최근 검색 기록 저장</Text>
              <Text style={styles.itemSub}>끄면 검색어를 기록하지 않아요</Text>
            </View>
            <Switch value={record.search} onValueChange={(v) => updateRecord({ search: v })} {...switchColors} />
          </View>
          <View style={[styles.item, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>최근 본 게시글 저장</Text>
              <Text style={styles.itemSub}>끄면 본 게시글을 기록하지 않아요</Text>
            </View>
            <Switch value={record.viewed} onValueChange={(v) => updateRecord({ viewed: v })} {...switchColors} />
          </View>
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
