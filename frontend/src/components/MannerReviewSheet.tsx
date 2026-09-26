import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import { mannerApi } from '../api/trade';
import type { MannerKeywordType } from '../api/types';
import { MANNER_KEYWORDS } from '../constants';
import { colors, font } from '../theme';
import { useToast } from './Feedback';
import Icon from './Icon';
import { Avatar, BottomSheet, Button } from './ui';

const ALL_KEYWORDS = Object.keys(MANNER_KEYWORDS) as MannerKeywordType[];

/**
 * 거래완료 직후 매너 키워드 평가.
 * target: 평가받는 사람의 역할 — 내가 구매자면 'ORGANIZER'(총대), 내가 방장이면 'BUYER'
 */
export default function MannerReviewSheet({
  visible,
  onClose,
  reservationId,
  target,
  targetName,
  onReviewed,
}: {
  visible: boolean;
  onClose: () => void;
  reservationId: number;
  target: 'BUYER' | 'ORGANIZER';
  targetName: string;
  /** 평가를 보냈거나 이미 보낸 상태일 때 */
  onReviewed?: () => void;
}) {
  const toast = useToast();
  const [options, setOptions] = useState<MannerKeywordType[]>(ALL_KEYWORDS);
  const [selected, setSelected] = useState<MannerKeywordType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected([]);
    mannerApi
      .keywords()
      .then((list) => setOptions(list.filter((k) => k in MANNER_KEYWORDS)))
      .catch(() => setOptions(ALL_KEYWORDS));
  }, [visible]);

  const shown = options.filter((k) => MANNER_KEYWORDS[k].target === target);

  const toggle = (k: MannerKeywordType) =>
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : prev.length < 3 ? [...prev, k] : prev));

  const submit = async () => {
    setSubmitting(true);
    try {
      await mannerApi.review(reservationId, selected);
      toast('매너 평가를 보냈어요');
      onReviewed?.();
      onClose();
    } catch (e) {
      toast(errorMessage(e));
      // 이미 평가한 거래면 배너를 다시 띄우지 않도록
      if (/이미|ALREADY/.test(errorMessage(e))) {
        onReviewed?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.person}>
        <Avatar name={targetName} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{targetName}님은 어땠나요?</Text>
          <Text style={styles.sub}>{target === 'ORGANIZER' ? '총대' : '구매자'} 매너를 1~3개 선택해주세요.</Text>
        </View>
      </View>
      <View style={{ gap: 8, marginBottom: 17 }}>
        {shown.map((k) => {
          const active = selected.includes(k);
          return (
            <Pressable key={k} style={[styles.keyword, active && styles.keywordActive]} onPress={() => toggle(k)}>
              <View style={[styles.check, active && styles.checkActive]}>
                <Icon name="check" size={12} color={active ? 'white' : 'transparent'} strokeWidth={2.4} />
              </View>
              <Text style={[styles.keywordText, active && styles.keywordTextActive]}>{MANNER_KEYWORDS[k].label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button label="평가 제출" onPress={submit} disabled={selected.length === 0} loading={submitting} />
      <Button label="건너뛰기" variant="ghost" onPress={onClose} style={{ height: 40, marginTop: 6 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { marginTop: 2, color: '#87939a', fontSize: font.sm },
  keyword: { height: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 12 },
  keywordActive: { borderColor: '#84bfd2', backgroundColor: colors.primaryTint },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5d8', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  keywordText: { fontSize: font.base, color: '#66767d' },
  keywordTextActive: { color: colors.primaryDeep, fontWeight: '700' },
});
