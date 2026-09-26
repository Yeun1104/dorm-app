import { StyleSheet } from 'react-native';
import { colors, font } from '../../theme';

const SWITCH_BLUE = '#3478f6';

/** 설정 화면들의 스위치 색 (웹은 켜짐 thumb/track 색을 따로 줘야 기본 청록색이 안 섞임) */
export const switchColors = {
  trackColor: { true: SWITCH_BLUE, false: '#dfe3e6' },
  thumbColor: 'white',
  ios_backgroundColor: '#dfe3e6',
  // react-native-web 전용 prop (타입엔 없음)
  ...({ activeThumbColor: 'white', activeTrackColor: SWITCH_BLUE } as object),
};

export const settingStyles = StyleSheet.create({
  section: { marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white' },
  sectionTitle: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 7, color: '#7f8a85', fontSize: font.xs, fontWeight: '700' },
  item: { minHeight: 54, paddingHorizontal: 15, paddingVertical: 10, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemText: { fontSize: font.base, color: colors.text },
  itemSub: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
  itemValue: { fontSize: font.sm, color: colors.textMuted },
});
