import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DormSearchField } from '../api/types';
import { colors, font, radius, shadow } from '../theme';
import Icon, { IconName } from './Icon';

// ───────── 화면 컨테이너 ─────────

export function Screen({ children, bg = colors.bg, edges = ['top'] }: { children: ReactNode; bg?: string; edges?: ('top' | 'bottom')[] }) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: bg }}>
      {children}
    </SafeAreaView>
  );
}

// ───────── 헤더 ─────────

/** 탭 루트 화면용 큰 타이틀 헤더 (.page-header) */
export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.pageHeader}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
        {typeof title === 'string' ? <Text style={s.pageTitle}>{title}</Text> : title}
      </View>
      {right}
    </View>
  );
}

/** 스택 하위 화면용 헤더 (.sub-header) */
export function SubHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: ReactNode; onBack?: () => void }) {
  const nav = useNavigation();
  return (
    <View style={s.subHeader}>
      <Pressable style={s.subBack} onPress={onBack ?? (() => nav.goBack())} hitSlop={8}>
        <Icon name="back" size={22} />
      </Pressable>
      <View style={s.subTitleWrap}>
        <Text style={s.subTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.subSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={s.subAction}>{action}</View>
    </View>
  );
}

export function HeaderAddButton({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable style={s.headerAdd} onPress={onPress}>
      <Icon name={icon} size={15} color="white" />
      <Text style={s.headerAddText}>{label}</Text>
    </Pressable>
  );
}

/** 화면 오른쪽 아래에 떠 있는 동그란 + 버튼 (label은 스크린리더용) */
export function Fab({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable style={s.fab} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={26} color="white" strokeWidth={2.4} />
    </Pressable>
  );
}

// ───────── 버튼 ─────────

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'dangerOutline' | 'soft' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
        isDisabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[s.buttonText, small && { fontSize: font.sm }, { color: v.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: 'white' },
  outline: { bg: 'white', text: colors.primaryDark, border: '#badde7' },
  danger: { bg: colors.danger, text: 'white' },
  dangerOutline: { bg: 'white', text: '#d65d60', border: '#f0d5d5' },
  soft: { bg: '#eef2f0', text: '#67726e' },
  ghost: { bg: 'transparent', text: '#8a969b' },
};

// ───────── 칩/뱃지 ─────────

export type ChipTone = 'primary' | 'pending' | 'neutral' | 'warning' | 'danger' | 'blue' | 'green';

const chipTones: Record<ChipTone, { bg: string; text: string }> = {
  primary: { bg: colors.primarySoft, text: colors.primaryDark },
  pending: { bg: colors.pendingBg, text: colors.pendingText },
  neutral: { bg: colors.neutralBg, text: colors.neutralText },
  warning: { bg: colors.warningSoft, text: '#e2763f' },
  danger: { bg: colors.dangerSoft, text: '#d65d60' },
  blue: { bg: '#e6effd', text: '#4677bb' },
  green: { bg: '#dcf3e9', text: colors.primaryDark },
};

export function Chip({ label, tone = 'primary', large }: { label: string; tone?: ChipTone; large?: boolean }) {
  const t = chipTones[tone];
  return (
    <View style={[s.chip, large && s.chipLarge, { backgroundColor: t.bg }]}>
      <Text style={[s.chipText, large && s.chipTextLarge, { color: t.text }]}>{label}</Text>
    </View>
  );
}

export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  if (count <= 0) return null;
  return (
    <View style={[s.countBadge, style]}>
      <Text style={s.countBadgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ───────── 아바타 / 썸네일 ─────────

export function Avatar({ name, size = 39 }: { name?: string | null; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{(name ?? '?').slice(0, 1)}</Text>
    </View>
  );
}

export function Thumb({ uri, size, radius: r = 12, style }: { uri?: string | null; size: number | { width: number; height: number }; radius?: number; style?: StyleProp<ViewStyle> }) {
  const dim = typeof size === 'number' ? { width: size, height: size } : size;
  return (
    <View style={[{ ...dim, borderRadius: r, overflow: 'hidden', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, style]}>
      {uri ? (
        <Image source={{ uri }} style={dim} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ color: colors.primaryLight, fontWeight: '900', fontSize: Math.min(dim.width, dim.height) * 0.35 }}>8</Text>
      )}
    </View>
  );
}

// ───────── 진행률 게이지 ─────────

export function ProgressBar({ ratio, height = 10 }: { ratio: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={[s.progressTrack, { height }]}>
      <View style={[s.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

// ───────── 탭/필터 ─────────

/** 글씨형 탭 — 배경 없이 선택된 탭만 검정 굵은 글씨, 나머지는 회색 */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, badges }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; badges?: Partial<Record<T, number>> }) {
  return (
    <View style={s.segmented}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Pressable key={t.value} style={[s.segmentedBtn, active && s.segmentedBtnActive]} onPress={() => onChange(t.value)}>
            <Text style={[s.segmentedText, active && s.segmentedTextActive]}>{t.label}</Text>
            <CountBadge count={badges?.[t.value] ?? 0} style={{ position: 'relative', marginLeft: 4 }} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** 알약형 필터 (.filter-pills) */
export function FilterPills<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.pillsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 17 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} style={[s.pill, active && s.pillActive]} onPress={() => onChange(o.value)}>
              <Text style={[s.pillText, active && s.pillTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ───────── 검색 ─────────

export function SearchBox({ value, onChangeText, onSubmit, placeholder, autoFocus }: { value: string; onChangeText: (t: string) => void; onSubmit?: () => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <View style={s.searchBox}>
      <Icon name="search" size={20} color="#7c8984" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor="#9aa5a1"
        style={s.searchInput}
      />
    </View>
  );
}

const SEARCH_FIELDS: { value: DormSearchField; label: string }[] = [
  { value: 'TITLE', label: '제목' },
  { value: 'CONTENT', label: '본문' },
  { value: 'WRITER', label: '이름' },
];

/** 기숙사 게시판 검색 (필드 선택 + 키워드, .board-search) */
export function BoardSearchBar({ field, onFieldChange, keyword, onKeywordChange, onSubmit }: { field: DormSearchField; onFieldChange: (f: DormSearchField) => void; keyword: string; onKeywordChange: (k: string) => void; onSubmit: () => void }) {
  const [open, setOpen] = useState(false);
  const label = SEARCH_FIELDS.find((f) => f.value === field)?.label ?? '제목';
  return (
    <View style={{ zIndex: 10 }}>
      <View style={s.boardSearch}>
        <Pressable style={s.boardSearchField} onPress={() => setOpen((v) => !v)}>
          <Text style={s.boardSearchFieldText}>{label}</Text>
          <Icon name="chevronDown" size={14} color="#52656c" />
        </Pressable>
        <View style={s.boardSearchInputWrap}>
          <Icon name="search" size={17} color="#839198" />
          <TextInput
            value={keyword}
            onChangeText={onKeywordChange}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            placeholder={`${label}으로 검색`}
            placeholderTextColor="#9aa5a9"
            style={s.boardSearchInput}
          />
        </View>
      </View>
      {open && (
        <View style={s.dropdown}>
          {SEARCH_FIELDS.map((f) => (
            <Pressable
              key={f.value}
              style={s.dropdownItem}
              onPress={() => {
                onFieldChange(f.value);
                setOpen(false);
              }}
            >
              <Text style={[s.dropdownText, f.value === field && { color: colors.primaryDark, fontWeight: '700' }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ───────── 폼 ─────────

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
      {!!hint && !error && <Text style={s.fieldHint}>{hint}</Text>}
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

export function Input(props: TextInputProps & { multiline?: boolean }) {
  return (
    <TextInput
      placeholderTextColor="#9aa5a1"
      {...props}
      style={[s.input, props.multiline && s.textarea, props.style]}
      textAlignVertical={props.multiline ? 'top' : 'center'}
    />
  );
}

export function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={s.radioRow} onPress={onPress}>
      <View style={[s.radio, selected && s.radioOn]} />
      <Text style={s.radioLabel}>{label}</Text>
    </Pressable>
  );
}

export function CheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable style={s.radioRow} onPress={onPress}>
      <View style={[s.checkbox, checked && s.checkboxOn]}>{checked && <Icon name="check" size={13} color="white" strokeWidth={2.4} />}</View>
      <Text style={s.radioLabel}>{label}</Text>
    </Pressable>
  );
}

/** 키보드에 가리지 않는 폼 스크롤 영역 */
export function FormScroll({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {!!footer && <View style={[s.footerBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}

// ───────── 바텀시트 (.bottom-sheet) ─────────

export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.modalLayer} onPress={onClose}>
          <Pressable style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]} onPress={() => {}}>
            <View style={s.sheetHandle} />
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────── 상태 뷰 ─────────

export function LoadingView() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.emptyTitle}>{message}</Text>
      {onRetry && <Button label="다시 시도" variant="outline" small onPress={onRetry} style={{ marginTop: 14, paddingHorizontal: 20 }} />}
    </View>
  );
}

export function EmptyState({ icon = 'check', title, message }: { icon?: IconName; title: string; message?: string }) {
  return (
    <View style={s.empty}>
      <Icon name={icon} size={30} color="#9ba39f" />
      <Text style={s.emptyTitle}>{title}</Text>
      {!!message && <Text style={s.emptyMessage}>{message}</Text>}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  pageHeader: { minHeight: 76, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  eyebrow: { color: colors.textSub, fontSize: font.xs, fontWeight: '600', marginBottom: 2 },
  pageTitle: { fontSize: font.title, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },

  subHeader: { height: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: 'white' },
  subBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f2f5f3', alignItems: 'center', justifyContent: 'center' },
  subTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  subTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  subSubtitle: { marginTop: 2, color: colors.textMuted, fontSize: font.xs },
  subAction: { minWidth: 38, alignItems: 'flex-end' },
  headerAdd: { height: 33, paddingHorizontal: 10, flexDirection: 'row', gap: 3, alignItems: 'center', borderRadius: 10, backgroundColor: colors.primary },
  headerAddText: { color: 'white', fontSize: font.xs, fontWeight: '700' },

  button: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonSmall: { height: 40, borderRadius: 11 },
  buttonText: { fontSize: font.base, fontWeight: '700' },

  chip: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  chipLarge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: font.xs, fontWeight: '700' },
  chipTextLarge: { fontSize: font.base, fontWeight: '800' },

  countBadge: { position: 'absolute', minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },

  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9edf3' },
  avatarText: { color: colors.primaryDeep, fontWeight: '800' },

  progressTrack: { overflow: 'hidden', borderRadius: 10, backgroundColor: '#e8f1f3' },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#6bbccc' },

  segmented: { height: 48, paddingHorizontal: 18, flexDirection: 'row' },
  segmentedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmentedBtnActive: {},
  segmentedText: { fontSize: font.base, fontWeight: '600', color: '#b0b8b5' },
  segmentedTextActive: { color: colors.text, fontWeight: '800' },

  pillsWrap: { height: 52, justifyContent: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#e0e6e3', backgroundColor: 'white', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  pillText: { fontSize: font.sm, color: '#77827e' },
  pillTextActive: { color: 'white', fontWeight: '700' },

  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: '#e8edeb', borderRadius: 15 },
  searchInput: { flex: 1, fontSize: font.base, color: colors.text },

  boardSearch: { height: 47, flexDirection: 'row', borderWidth: 1, borderColor: '#dfe7ea', borderRadius: 13, overflow: 'hidden', backgroundColor: 'white' },
  boardSearchField: { width: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRightWidth: 1, borderRightColor: '#e3e9eb' },
  boardSearchFieldText: { fontSize: font.sm, color: '#52656c' },
  boardSearchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  boardSearchInput: { flex: 1, fontSize: font.md, color: colors.text },
  dropdown: { position: 'absolute', top: 50, left: 0, width: 110, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e1e7e9', paddingVertical: 4, shadowColor: '#1f414e', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownText: { fontSize: font.md, color: colors.text },

  field: { marginVertical: 9 },
  fieldLabel: { fontSize: font.sm, fontWeight: '700', color: '#53605b', marginBottom: 6 },
  fieldHint: { marginTop: 5, fontSize: font.xs, color: colors.textMuted },
  fieldError: { marginTop: 5, fontSize: font.xs, color: colors.danger },
  input: { minHeight: 47, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#dfe6e3', borderRadius: 11, backgroundColor: 'white', fontSize: font.base, color: colors.text },
  textarea: { minHeight: 120 },

  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#bdc9ce' },
  radioOn: { borderWidth: 6, borderColor: colors.primaryLight },
  radioLabel: { fontSize: font.base, color: colors.text },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#bdc9ce', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },

  footerBar: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e8ecea' },

  modalLayer: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { maxHeight: '88%', paddingTop: 10, paddingHorizontal: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: 'white' },
  sheetHandle: { width: 43, height: 4, borderRadius: 4, backgroundColor: '#d9dfdc', alignSelf: 'center', marginBottom: 22 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...shadow.fab },
  empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { marginTop: 11, color: '#63706b', fontSize: font.base, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { marginTop: 4, color: '#9ba39f', fontSize: font.sm, textAlign: 'center' },

  card: { padding: 16, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 18, backgroundColor: 'white' },
});
