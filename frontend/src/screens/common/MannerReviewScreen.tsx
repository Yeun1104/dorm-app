import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { mannerApi } from '../../api/trade';
import type { MannerKeywordType } from '../../api/types';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Avatar, Button, Screen, SubHeader } from '../../components/ui';
import { MANNER_KEYWORDS } from '../../constants';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

const ALL_KEYWORDS = Object.keys(MANNER_KEYWORDS) as MannerKeywordType[];

/**
 * 매너 평가 화면 (채팅방 '거래완료' 후, 매너 평가 관리, 내 참여 신청 내역에서 진입)
 * target: 평가받는 사람의 역할 — 내가 구매자면 'ORGANIZER'(총대), 내가 방장이면 'BUYER'
 */
export default function MannerReviewScreen({ navigation, route }: ScreenProps<'MannerReview'>) {
  const { reservationId, target, targetName } = route.params;
  const toast = useToast();
  const [options, setOptions] = useState<MannerKeywordType[]>(ALL_KEYWORDS);
  const [selected, setSelected] = useState<MannerKeywordType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mannerApi
      .keywords()
      .then((list) => setOptions(list.filter((k) => k in MANNER_KEYWORDS)))
      .catch(() => setOptions(ALL_KEYWORDS));
    // 이미 보낸 거래면 바로 알려주고 돌아감
    mannerApi
      .reviewed(reservationId)
      .then((done) => {
        if (done) {
          toast('이미 매너 평가를 보낸 거래예요');
          navigation.goBack();
        }
      })
      .catch(() => {});
  }, [reservationId, navigation, toast]);

  const shown = options.filter((k) => MANNER_KEYWORDS[k].target === target);
  const toggle = (k: MannerKeywordType) =>
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : prev.length < 3 ? [...prev, k] : prev));

  const submit = async () => {
    setSubmitting(true);
    try {
      await mannerApi.review(reservationId, selected);
      toast('매너 평가를 보냈어요');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e));
      if (/이미|ALREADY/.test(errorMessage(e))) navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title="매너 평가" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <View style={styles.person}>
          <Avatar name={targetName} size={56} />
          <Text style={styles.title}>{targetName}님과의 거래는 어땠나요?</Text>
          <Text style={styles.sub}>{target === 'ORGANIZER' ? '총대' : '구매자'} 매너를 1~3개 골라주세요</Text>
        </View>
        <View style={styles.chips}>
          {shown.map((k) => {
            const active = selected.includes(k);
            return (
              <Pressable key={k} style={[styles.keyword, active && styles.keywordActive]} onPress={() => toggle(k)}>
                {active && <Icon name="check" size={13} color="white" strokeWidth={2.6} />}
                <Text style={[styles.keywordText, active && styles.keywordTextActive]}>{MANNER_KEYWORDS[k].label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.count}>{selected.length}/3개 선택</Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="평가 보내기" onPress={submit} disabled={selected.length === 0} loading={submitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: { alignItems: 'center', marginBottom: 26 },
  title: { marginTop: 12, fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { marginTop: 4, color: colors.textMuted, fontSize: font.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  keyword: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 20, backgroundColor: 'white' },
  keywordActive: { borderColor: colors.text, backgroundColor: colors.text },
  keywordText: { fontSize: font.md, color: colors.textBody },
  keywordTextActive: { color: 'white', fontWeight: '700' },
  count: { marginTop: 14, textAlign: 'center', fontSize: font.xs, color: colors.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
});
