import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Feedback';
import { Button, Input, Screen } from '../../components/ui';
import { DEV_LOGIN_ENABLED } from '../../config';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { loginWithKakao, devLogin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [devNickname, setDevNickname] = useState('로컬테스트유저');

  const onKakao = async () => {
    setLoading(true);
    try {
      const r = await loginWithKakao();
      if (r.type === 'needSignup') navigation.navigate('Signup', { tempToken: r.tempToken });
    } catch (e) {
      toast(errorMessage(e, '로그인에 실패했어요'));
    } finally {
      setLoading(false);
    }
  };

  const onDev = async () => {
    try {
      await devLogin(devNickname.trim() || '로컬테스트유저');
    } catch (e) {
      toast(errorMessage(e, '개발용 로그인 실패 — 백엔드 dev-tools 설정을 확인하세요'));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>숭실대 기숙사 공동구매</Text>
          <Text style={styles.title}>나눠도</Text>
          <Text style={styles.subtitle}>같이 사면 가격은 반으로!{'\n'}기숙사 이웃과 알뜰하게 나눠요</Text>
        </View>

        <View style={styles.bottom}>
          <Pressable style={[styles.kakao, loading && { opacity: 0.6 }]} onPress={onKakao} disabled={loading}>
            <Text style={styles.kakaoText}>카카오로 시작하기</Text>
          </Pressable>

          {DEV_LOGIN_ENABLED && (
            <View style={styles.dev}>
              <Text style={styles.devLabel}>개발용 로그인 (/api/dev/auth/token)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input value={devNickname} onChangeText={setDevNickname} style={{ flex: 1 }} placeholder="닉네임" />
                <Button label="로그인" variant="outline" onPress={onDev} style={{ height: 47 }} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 30, marginBottom: 36 },
  eyebrow: { color: colors.textSub, fontSize: font.sm, fontWeight: '600' },
  title: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1, marginTop: 4 },
  subtitle: { marginTop: 12, color: '#5d756d', fontSize: font.base, lineHeight: 21, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  kakao: { height: 54, borderRadius: 16, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' },
  kakaoText: { color: 'rgba(0,0,0,0.85)', fontSize: font.base, fontWeight: '700' },
  dev: { marginTop: 22, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  devLabel: { fontSize: font.xs, color: colors.textMuted, marginBottom: 8 },
});
