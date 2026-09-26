import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { boardApi } from '../api/board';
import { errorMessage } from '../api/client';
import { mannerApi, reservationApi } from '../api/trade';
import type { Board, MannerKeywordType, Reservation } from '../api/types';
import { MANNER_KEYWORDS } from '../constants';
import { invalidateBoard } from '../hooks/useBoards';
import { colors, font } from '../theme';
import { won } from '../utils/format';
import { useToast } from './Feedback';
import Icon from './Icon';
import { Avatar, BottomSheet, Button, Thumb } from './ui';

const BUYER_KEYWORDS = (Object.keys(MANNER_KEYWORDS) as MannerKeywordType[]).filter((k) => MANNER_KEYWORDS[k].target === 'BUYER');

/**
 * 판매완료 (모집을 강제로 끝내기).
 * 1) 이 글로 채팅한 사람(수락/거래완료된 참여) 중 실제로 거래한 사람을 여러 명 고름
 *    → 고른 참여는 거래완료(COMPLETED)로 바꿔 서로의 거래 횟수에 반영하고,
 *      고르지 않은 수락 상태 참여는 거래취소(CANCELLED, 채팅방 읽기전용)로 정리한 뒤 게시글은 모집완료로
 * 2) 고른 사람들에게 한 번에 매너 평가 (건너뛰기 가능)
 * 인원이 다 차서 자동으로 모집완료된 경우와 구분하려고 버튼 이름은 '판매완료'
 */
export default function SaleCompleteSheet({
  board,
  visible,
  onClose,
  onDone,
}: {
  board: Board | null;
  visible: boolean;
  onClose: () => void;
  /** 게시글 상태가 바뀐 뒤 호출 (목록/상세 갱신용) */
  onDone: (updated: Board) => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<'pick' | 'review'>('pick');
  const [people, setPeople] = useState<Reservation[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [traded, setTraded] = useState<Reservation[]>([]);
  const [keywords, setKeywords] = useState<MannerKeywordType[]>([]);
  const [busy, setBusy] = useState(false);

  // board 객체는 판매완료 후 갱신되므로 id 기준으로만 초기화 (안 그러면 평가 단계에서 처음으로 돌아감)
  const boardId = board?.id;
  useEffect(() => {
    if (!visible || boardId == null) return;
    setStep('pick');
    setPeople(null);
    setSelected([]);
    setKeywords([]);
    reservationApi
      .listByBoard(boardId)
      .then((list) =>
        // 채팅방이 열린 사람만 (수락됨 / 이미 거래완료), 최근 순
        setPeople(list.filter((r) => r.chatRoomId != null && (r.status === 'ACCEPTED' || r.status === 'COMPLETED')).sort((a, b) => b.id - a.id)),
      )
      .catch((e) => {
        toast(errorMessage(e));
        setPeople([]);
      });
  }, [visible, boardId, toast]);

  if (!board) return null;

  const unselectedCount = (people ?? []).filter((r) => r.status === 'ACCEPTED' && !selected.includes(r.id)).length;

  const toggle = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const completeSale = async () => {
    setBusy(true);
    try {
      const targets = (people ?? []).filter((r) => selected.includes(r.id));
      const results = await Promise.allSettled(targets.map((r) => reservationApi.updateStatus(r.id, 'COMPLETED')));
      const done = targets.filter((_, i) => results[i].status === 'fulfilled');

      // 채팅은 했지만 거래하지 않은 사람은 거래취소
      const notTraded = (people ?? []).filter((r) => r.status === 'ACCEPTED' && !selected.includes(r.id));
      const cancelResults = await Promise.allSettled(notTraded.map((r) => reservationApi.updateStatus(r.id, 'CANCELLED')));

      const failed = [...results, ...cancelResults].find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) toast(errorMessage(failed.reason));

      // 거래완료 처리 후에도 모집중이면 직접 마감
      const latest = await boardApi.detail(board.id);
      const updated = latest.status === 'IN_PROGRESS' ? await boardApi.updateStatus(board.id, 'COMPLETED') : latest;
      invalidateBoard(board.id);
      onDone(updated);

      if (done.length) {
        setTraded(done);
        setStep('review');
      } else {
        toast('판매완료로 변경했어요');
        onClose();
      }
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendReviews = async () => {
    setBusy(true);
    try {
      const results = await Promise.allSettled(traded.map((r) => mannerApi.review(r.id, keywords)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      toast(failed ? `${traded.length - failed}명에게 매너 평가를 보냈어요 (${failed}명 실패)` : '판매완료 처리하고 매너 평가를 보냈어요');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const toggleKeyword = (k: MannerKeywordType) =>
    setKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : prev.length < 3 ? [...prev, k] : prev));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {step === 'pick' ? (
        <>
          <Text style={styles.title}>판매완료</Text>
          <Text style={styles.sub}>함께 거래한 사람을 모두 선택해주세요. 선택한 사람과의 거래 횟수가 올라가요.</Text>

          <View style={styles.board}>
            <Thumb uri={board.images[0]?.imageUrl} size={44} radius={10} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.boardTitle} numberOfLines={1}>{board.title}</Text>
              <Text style={styles.boardSub}>{board.totalQuantity - board.remainingQuantity}/{board.totalQuantity}개 모임 · 개당 {won(board.unitPrice)}</Text>
            </View>
          </View>

          {people == null ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : people.length === 0 ? (
            <Text style={styles.empty}>이 글로 채팅한 사람이 없어요.{'\n'}판매완료하면 모집만 마감돼요.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {people.map((r) => {
                const alreadyDone = r.status === 'COMPLETED';
                const active = alreadyDone || selected.includes(r.id);
                return (
                  <Pressable key={r.id} style={styles.person} onPress={() => !alreadyDone && toggle(r.id)} disabled={alreadyDone}>
                    <Avatar name={r.buyerNickname} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{r.buyerNickname}</Text>
                      <Text style={styles.meta}>{alreadyDone ? '이미 거래완료' : `${r.quantity}개 · ${won(r.subtotal)}`}</Text>
                    </View>
                    <View style={[styles.check, active && styles.checkOn, alreadyDone && { opacity: 0.4 }]}>
                      {active && <Icon name="check" size={13} color="white" strokeWidth={2.6} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {unselectedCount > 0 && <Text style={styles.cancelNote}>선택하지 않은 {unselectedCount}명과의 거래는 취소되고 채팅이 종료돼요.</Text>}
          <Button label={selected.length ? `${selected.length}명과 판매완료` : '판매완료'} onPress={completeSale} loading={busy} disabled={people == null} style={{ marginTop: 14 }} />
        </>
      ) : (
        <>
          <Text style={styles.title}>매너 평가 보내기</Text>
          <Text style={styles.sub}>{traded.map((r) => r.buyerNickname).join(', ')}님과의 거래는 어땠나요? 1~3개 골라주세요.</Text>
          <View style={{ gap: 8, marginTop: 14 }}>
            {BUYER_KEYWORDS.map((k) => {
              const active = keywords.includes(k);
              return (
                <Pressable key={k} style={[styles.keyword, active && styles.keywordOn]} onPress={() => toggleKeyword(k)}>
                  <Text style={[styles.keywordText, active && styles.keywordTextOn]}>{MANNER_KEYWORDS[k].label}</Text>
                  {active && <Icon name="check" size={16} color={colors.text} strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </View>
          <Button label="평가 보내기" onPress={sendReviews} loading={busy} disabled={!keywords.length} style={{ marginTop: 16 }} />
          <Button label="나중에 할게요" variant="ghost" onPress={onClose} style={{ height: 40, marginTop: 6 }} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { marginTop: 5, fontSize: font.sm, lineHeight: 19, color: colors.textMuted },
  board: { marginTop: 16, marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#f4f6f5' },
  boardTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  boardSub: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
  cancelNote: { marginTop: 12, fontSize: font.xs, lineHeight: 17, color: colors.warning },
  empty: { marginVertical: 26, textAlign: 'center', fontSize: font.sm, lineHeight: 20, color: colors.textMuted },
  person: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text },
  meta: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#cfd6d3', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.text, borderColor: colors.text },
  keyword: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: '#e3e8e6' },
  keywordOn: { borderColor: colors.text, backgroundColor: '#f4f6f5' },
  keywordText: { fontSize: font.base, color: colors.textBody },
  keywordTextOn: { color: colors.text, fontWeight: '700' },
});
