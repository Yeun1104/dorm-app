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
      <View style={styles.hero}>
        <View style={styles.bag}>
          <View style={styles.bagHandle} />
          <Text style={styles.bagText}>8</Text>
          <View style={styles.bagDot} />
        </View>
        <Text style={styles.eyebrow}>숭실대 기숙사 공동구매</Text>
        <Text style={styles.title}>숭팔이</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  bag: { width: 96, height: 108, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }], marginBottom: 36 },
  bagHandle: { position: 'absolute', top: -20, width: 50, height: 36, borderWidth: 7, borderBottomWidth: 0, borderColor: colors.primaryLight, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  bagText: { color: 'white', fontSize: 42, fontWeight: '900', transform: [{ rotate: '-5deg' }] },
  bagDot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffd675', top: 20, right: 17 },
  eyebrow: { color: colors.textSub, fontSize: font.sm, fontWeight: '600' },
  title: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1, marginTop: 4 },
  subtitle: { marginTop: 12, color: '#5d756d', fontSize: font.base, lineHeight: 21, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  kakao: { height: 54, borderRadius: 16, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' },
  kakaoText: { color: 'rgba(0,0,0,0.85)', fontSize: font.base, fontWeight: '700' },
  dev: { marginTop: 22, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  devLabel: { fontSize: font.xs, color: colors.textMuted, marginBottom: 8 },
});
