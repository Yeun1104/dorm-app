import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { notificationApi } from '../../api/notification';
import type { NotificationPreference } from '../../api/types';
import { useToast } from '../../components/Feedback';
import { LoadingView, Screen, SubHeader } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { settingStyles as styles, switchColors } from './settingsShared';

// 서버 알림 설정 (카테고리별). 채팅방 하나만 끄는 건 채팅방 ••• 메뉴에서
const NOTIFICATION_ITEMS: { key: keyof NotificationPreference; label: string; sub: string }[] = [
  { key: 'chatEnabled', label: '채팅 메시지', sub: '새 채팅 메시지가 오면 알려드려요' },
  { key: 'reservationEnabled', label: '참여 요청', sub: '내 글에 참여 요청이 오거나 내 요청이 수락·거절되면' },
  { key: 'boardStatusEnabled', label: '모집 · 거래 상태', sub: '참여한 공동구매가 모집완료·거래완료되면' },
  { key: 'dormNoticeEnabled', label: '기숙사 공지사항', sub: '새 공지사항이 올라오면' },
];

export default function NotificationSettingsScreen(_: ScreenProps<'NotificationSettings'>) {
  const toast = useToast();
  const [noti, setNoti] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    notificationApi
      .preference()
      .then(setNoti)
      .catch((e) => toast(errorMessage(e, '알림 설정을 불러오지 못했어요')));
  }, [toast]);

  // PUT은 4개 값을 한 번에 보내야 함. 실패하면 이전 값으로 되돌림
  const updateNoti = (patch: Partial<NotificationPreference>) => {
    if (!noti) return;
    const prev = noti;
    const next = { ...noti, ...patch };
    setNoti(next);
    notificationApi
      .updatePreference(next)
      .then(setNoti)
      .catch((e) => {
        setNoti(prev);
        toast(errorMessage(e, '설정을 저장하지 못했어요'));
      });
  };

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title="알림 설정" />
      {!noti ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>받을 알림</Text>
            {NOTIFICATION_ITEMS.map((n, i) => (
              <View key={n.key} style={[styles.item, i === NOTIFICATION_ITEMS.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>{n.label}</Text>
                  <Text style={styles.itemSub}>{n.sub}</Text>
                </View>
                <Switch value={noti[n.key]} onValueChange={(v) => updateNoti({ [n.key]: v })} {...switchColors} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
