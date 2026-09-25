import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { errorMessage } from '../../api/client';
import { reportApi } from '../../api/trade';
import type { ReportCategory } from '../../api/types';
import { useToast } from '../../components/Feedback';
import { Button, Field, FormScroll, Input, RadioRow, Screen, SubHeader } from '../../components/ui';
import { REPORT_CATEGORIES } from '../../constants';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function ReportScreen({ navigation, route }: ScreenProps<'Report'>) {
  const { userId, nickname, boardId } = route.params;
  const toast = useToast();
  const [category, setCategory] = useState<ReportCategory>('NO_SHOW');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    // 백엔드 ReportCreateReqDto.reason이 @NotBlank라 필수
    if (!reason.trim()) return setError('구체적인 사유를 입력해주세요');
    setSubmitting(true);
    try {
      await reportApi.create({ reportedUserId: userId, relatedBoardId: boardId, category, reason: reason.trim() });
      toast('신고가 접수되었어요');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title="사용자 신고" />
      <FormScroll footer={<Button label="신고하기" onPress={submit} loading={submitting} />}>
        <Text style={styles.title}>신고 사유를 선택해주세요</Text>
        <Text style={styles.sub}>{nickname}님을 신고하는 이유를 알려주세요.</Text>
        {REPORT_CATEGORIES.map((c) => (
          <RadioRow key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />
        ))}
        <Field label="구체적인 사유" error={error}>
          <Input
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              setError(null);
            }}
            multiline
            placeholder="어떤 일이 있었는지 자세히 적어주세요"
          />
        </Field>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6, fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { marginTop: 5, marginBottom: 12, color: '#819097', fontSize: font.sm },
});
