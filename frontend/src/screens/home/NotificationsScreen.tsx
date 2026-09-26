import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from '../../components/Icon';
import { EmptyState, Screen, SubHeader } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { timeAgo } from '../../utils/format';

/** 알림 한 건 — TODO: 백엔드 알림 API 나오면 응답 타입에 맞춰 교체 */
export interface AppNotification {
  id: number;
  icon: IconName;
  title: string;
  message: string;
  createdAt: string;
}

export default function NotificationsScreen(_: ScreenProps<'Notifications'>) {
  // TODO: 알림 API 연결 (목록 조회 / 개별 삭제 / 전체 삭제). 지금은 화면 틀만 있음
  const [items, setItems] = useState<AppNotification[]>([]);

  const remove = (id: number) => setItems((prev) => prev.filter((n) => n.id !== id));
  const clearAll = () => setItems([]);

  return (
    <Screen bg={colors.bgSub}>
      <SubHeader
        title="알림"
        action={
          items.length > 0 ? (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clearAll}>전체 지우기</Text>
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState icon="bell" title="새로운 알림이 없어요" message="참여 요청, 채팅 같은 소식이 오면 여기에 모아둘게요." />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <Icon name={item.icon} size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Pressable onPress={() => remove(item.id)} hitSlop={10} accessibilityLabel="알림 지우기">
              <Icon name="close" size={16} color={colors.textFaint} />
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearAll: { fontSize: font.sm, color: colors.textMuted },
  row: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white' },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f3f2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.md, fontWeight: '700', color: colors.text },
  message: { marginTop: 3, fontSize: font.sm, lineHeight: 19, color: colors.textBody },
  time: { marginTop: 5, fontSize: font.xs, color: colors.textFaint },
});
