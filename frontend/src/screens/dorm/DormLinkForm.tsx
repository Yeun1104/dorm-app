import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { dormAccountApi } from '../../api/dorm';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/Icon';
import { Button, Field, Input } from '../../components/ui';
import { colors, font } from '../../theme';

/** 기숙사 계정 연동 폼: 등록(POST /account) → 검증(POST /account/verify) */
export default function DormLinkForm({ onLinked }: { onLinked: () => void }) {
  const { setDormLinked } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) return setError('아이디와 비밀번호를 입력해주세요');
    setLoading(true);
    setError(null);
    try {
      await dormAccountApi.register(username.trim(), password);
      const v = await dormAccountApi.verify();
      if (!v.success) {
        setDormLinked(false);
        setError('아이디 또는 비밀번호를 확인해주세요');
        return;
      }
      setDormLinked(true);
      onLinked();
    } catch (e) {
      setError(errorMessage(e, '아이디 또는 비밀번호를 확인해주세요'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.visual}>
          <Icon name="dorm" size={40} color={colors.primaryDeep} />
          <View style={styles.visualCheck}>
            <Icon name="check" size={15} color="white" strokeWidth={2.4} />
          </View>
        </View>
        <Text style={styles.title}>기숙사 계정을 연동해주세요</Text>
        <Text style={styles.sub}>
          숭실대 기숙사 사이트 아이디/비밀번호를 입력하면{'\n'}기숙사생활 탭의 모든 기능을 앱에서 바로 이용할 수 있어요
        </Text>
        <Field label="기숙사 아이디">
          <Input value={username} onChangeText={setUsername} placeholder="아이디를 입력해주세요" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Field label="비밀번호" error={error}>
          <Input value={password} onChangeText={setPassword} placeholder="비밀번호를 입력해주세요" secureTextEntry onSubmitEditing={submit} />
        </Field>
        <Button label="연동하기" onPress={submit} loading={loading} style={{ marginTop: 10 }} />
        <Text style={styles.note}>입력한 계정 정보는 암호화되어 안전하게 보호됩니다.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 27, paddingTop: 34, paddingBottom: 40 },
  visual: { alignSelf: 'center', width: 82, height: 82, marginBottom: 20, borderRadius: 27, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  visualCheck: { position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: 'white', backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', marginBottom: 8, fontSize: 19, fontWeight: '800', color: colors.text },
  sub: { textAlign: 'center', marginBottom: 26, color: '#7c8b91', fontSize: font.md, lineHeight: 20 },
  note: { marginTop: 14, textAlign: 'center', color: '#9aa5a9', fontSize: font.xs },
});
