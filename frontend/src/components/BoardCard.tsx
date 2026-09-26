import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '../api/types';
import { colors, font } from '../theme';
import { timeAgo, won } from '../utils/format';
import { placeName } from '../utils/place';
import Icon from './Icon';
import { Chip, ProgressBar, Thumb } from './ui';

export const boardProgress = (b: Pick<Board, 'totalQuantity' | 'remainingQuantity'>) =>
  b.totalQuantity > 0 ? (b.totalQuantity - b.remainingQuantity) / b.totalQuantity : 0;

export const BoardStatusChip = ({ status, large }: { status: Board['status']; large?: boolean }) =>
  status === 'IN_PROGRESS' ? <Chip label="모집중" large={large} /> : <Chip label="모집완료" tone="neutral" large={large} />;

/** 홈 목록 카드 (.product-card) */
export function ProductCard({ board, onPress, onToggleLike }: { board: Board; onPress: () => void; onToggleLike: () => void }) {
  const collected = board.totalQuantity - board.remainingQuantity;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Thumb uri={board.images[0]?.imageUrl} size={116} radius={14} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{board.title}</Text>
          <Pressable onPress={onToggleLike} hitSlop={8}>
            <Icon name="heart" size={19} color={board.liked ? colors.heart : '#9aa19e'} filled={board.liked} />
          </Pressable>
        </View>
        <Text style={styles.location} numberOfLines={1}>{[placeName(board.location), timeAgo(board.createdAt)].filter(Boolean).join(' · ')}</Text>
        <View style={styles.priceRow}>
          {board.status !== 'IN_PROGRESS' && (
            <View style={styles.doneBox}>
              <Text style={styles.doneText}>모집완료</Text>
            </View>
          )}
          <Text style={styles.price}>{won(board.unitPrice)}</Text>
          <Text style={styles.priceUnit}> / 개</Text>
        </View>
        {/* 게이지는 카드 바닥에 맞춤 */}
        <View style={styles.progressWrap}>
          <ProgressBar ratio={boardProgress(board)} height={8} />
          <View style={styles.progressLabel}>
            <Text style={styles.progressStrong}>{collected}개 모였어요</Text>
            <Text style={styles.progressMuted}>{board.remainingQuantity}개 남음</Text>
          </View>
          {board.waitingCount > 0 && (
            <View style={styles.waiting}>
              <Text style={styles.waitingText}>현재 {board.waitingCount}명 수락 대기중</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** 좋아요한 글 / 내가 쓴 글 카드 (.saved-card) */
export function CompactBoardCard({ board, onPress, right, footer }: { board: Board; onPress: () => void; right?: ReactNode; footer?: ReactNode }) {
  return (
    <Pressable style={styles.saved} onPress={onPress}>
      <Thumb uri={board.images[0]?.imageUrl} size={{ width: 83, height: 86 }} />
      <View style={{ flex: 1, justifyContent: 'center', paddingRight: 24 }}>
        <BoardStatusChip status={board.status} />
        <Text style={styles.savedTitle} numberOfLines={1}>{board.title}</Text>
        <Text style={styles.savedPrice}>{won(board.unitPrice)} / 개 · {board.remainingQuantity}개 남음</Text>
        {!!board.location && <Text style={styles.savedPlace} numberOfLines={1}>{placeName(board.location)}</Text>}
        {footer}
      </View>
      {right && <View style={styles.savedRight}>{right}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 13, backgroundColor: 'white', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 20 },
  info: { flex: 1, minWidth: 0, paddingTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  location: { color: '#8a9490', fontSize: font.xs },
  priceRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline' },
  doneBox: { alignSelf: 'center', marginRight: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: '#a3aba8' },
  doneText: { color: 'white', fontSize: font.xs, fontWeight: '700' },
  price: { fontSize: 17, fontWeight: '800', color: colors.text },
  priceUnit: { color: '#89938f', fontSize: font.xs },
  progressWrap: { marginTop: 'auto', paddingTop: 8 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressStrong: { fontSize: font.xs, color: colors.primaryDark, fontWeight: '700' },
  progressMuted: { fontSize: font.xs, color: '#939b98' },
  waiting: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: colors.warningSoft },
  waitingText: { color: '#e2763f', fontSize: 10.5, fontWeight: '700' },

  saved: { flexDirection: 'row', gap: 12, padding: 12, marginBottom: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white' },
  savedTitle: { marginTop: 5, marginBottom: 3, fontSize: font.md, fontWeight: '700', color: colors.text },
  savedPrice: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  savedPlace: { marginTop: 3, color: '#8d9692', fontSize: font.xs },
  savedRight: { position: 'absolute', right: 12, top: 12 },
});
