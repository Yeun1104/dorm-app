import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Field, FormScroll, Input, Screen, SubHeader } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function SignupScreen({ route }: NativeStackScreenProps<AuthStackParamList, 'Signup'>) {
  const { completeSignup } = useAuth();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요');
    setLoading(true);
    setError(null);
    try {
      await completeSignup(route.params.tempToken, nickname.trim());
    } catch (e) {
      // 닉네임 중복/형식 오류는 서버 메시지를 그대로 보여줌. temp_token은 10분 유효
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title="회원가입" />
      <FormScroll footer={<Button label="시작하기" onPress={submit} loading={loading} />}>
        <View style={{ paddingVertical: 20 }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: colors.text }}>나눠도에서 쓸{'\n'}닉네임을 정해주세요</Text>
          <Text style={{ marginTop: 8, fontSize: font.md, color: colors.textMuted }}>거래 상대에게 보여지는 이름이에요.</Text>
        </View>
        <Field label="닉네임" error={error}>
          <Input value={nickname} onChangeText={setNickname} placeholder="예) 배고픈숭실인" maxLength={20} autoFocus />
        </Field>
      </FormScroll>
    </Screen>
  );
}
