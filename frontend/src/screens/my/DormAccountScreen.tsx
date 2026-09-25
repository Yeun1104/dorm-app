import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { dormAccountApi, leaveApi } from '../../api/dorm';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { Button, LoadingView, Screen, SubHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';

export default function DormAccountScreen({ navigation }: ScreenProps<'DormAccount'>) {
  const { setDormLinked } = useAuth();
  const toast = useToast();
  const [verifying, setVerifying] = useState(false);

  // 연동 여부 확인 + 신청자 정보(이름/호실/자리)는 외박신청 폼 기본값에서 가져옴
  const { data, loading, reload } = useFetch(async () => {
    try {
      const v = await dormAccountApi.verify();
      if (!v.success) return { linked: false as const, message: v.message };
      const info = await leaveApi.formDefaults('outing').catch(() => null);
      return { linked: true as const, info };
    } catch (e) {
      return { linked: false as const, message: errorMessage(e) };
    }
  }, []);

  const reverify = async () => {
    setVerifying(true);
    try {
      const v = await dormAccountApi.verify();
      setDormLinked(v.success);
      toast(v.success ? '기숙사 계정 인증을 완료했어요' : v.message);
      reload();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Screen bg="white">
      <SubHeader title="기숙사 계정 관리" />
      {loading && !data ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <View style={styles.status}>
            <View style={styles.icon}>
              <Icon name="dorm" size={31} color={colors.primaryDark} />
              {data?.linked && (
                <View style={styles.iconCheck}>
                  <Icon name="check" size={12} color="white" strokeWidth={2.4} />
                </View>
              )}
            </View>
            <Text style={styles.title}>{data?.linked ? '기숙사 계정이 연동되어 있어요' : '기숙사 계정이 연동되지 않았어요'}</Text>
            <Text style={styles.sub}>
              {data?.linked ? '생활관 사이트의 기능을 나누다에서 바로 이용할 수 있어요.' : data && 'message' in data ? data.message : ''}
            </Text>
          </View>

          {data?.linked && data.info && (
            <View style={styles.infoList}>
              <Row label="이름" value={data.info.applicantName} />
              <Row label="호실" value={data.info.room} />
              <Row label="자리" value={data.info.seat} />
              <Row label="연락처" value={[data.info.phone1, data.info.phone2, data.info.phone3].filter(Boolean).join('-')} last />
            </View>
          )}

          {data?.linked && <Button label="계정 다시 인증하기" variant="outline" onPress={reverify} loading={verifying} style={{ marginBottom: 8, height: 48 }} />}
          <Button
            label={data?.linked ? '다른 계정으로 변경하기' : '기숙사 계정 연동하기'}
            variant={data?.linked ? 'outline' : 'primary'}
            onPress={() => navigation.navigate('DormLink')}
            style={{ height: 48 }}
          />

          <View style={styles.help}>
            <Text style={styles.helpTitle}>계정 정보는 안전하게 보호돼요</Text>
            <Text style={styles.helpText}>비밀번호는 서버에 암호화되어 저장되며 기숙사 사이트 연동 외의 목적으로 사용되지 않습니다.</Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { paddingTop: 22, paddingBottom: 26, paddingHorizontal: 10, alignItems: 'center' },
  icon: { width: 69, height: 69, marginBottom: 14, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconCheck: { position: 'absolute', right: -3, bottom: -3, width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: 'white', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: 7, fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { color: '#838e89', fontSize: font.sm, textAlign: 'center' },
  infoList: { marginBottom: 14, borderWidth: 1, borderColor: '#e6ebe9', borderRadius: 16, overflow: 'hidden' },
  row: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#89928f', fontSize: font.sm },
  rowValue: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  help: { marginTop: 14, padding: 13, borderRadius: 12, backgroundColor: '#f4f7f5' },
  helpTitle: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  helpText: { marginTop: 3, color: '#89928f', fontSize: font.xs, lineHeight: 17 },
});
