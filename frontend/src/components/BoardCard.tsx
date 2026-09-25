import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '../api/types';
import { colors, font, shadow } from '../theme';
import { timeAgo, won } from '../utils/format';
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
      <View>
        <Thumb uri={board.images[0]?.imageUrl} size={{ width: 116, height: 145 }} radius={14} />
        <Pressable style={styles.heart} onPress={onToggleLike} hitSlop={6}>
          <Icon name="heart" size={18} color={board.liked ? colors.heart : '#64716c'} filled={board.liked} />
        </Pressable>
      </View>
      <View style={styles.info}>
        <View style={styles.metaRow}>
          <BoardStatusChip status={board.status} />
          <Text style={styles.metaTime}>{timeAgo(board.createdAt)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{board.title}</Text>
        {!!board.location && <Text style={styles.location} numberOfLines={1}>{board.location}</Text>}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{won(board.unitPrice)}</Text>
          <Text style={styles.priceUnit}> / 개</Text>
        </View>
        <View style={{ marginTop: 7 }}>
          <ProgressBar ratio={boardProgress(board)} height={4} />
        </View>
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
        {!!board.location && <Text style={styles.savedPlace} numberOfLines={1}>{board.location}</Text>}
        {footer}
      </View>
      {right && <View style={styles.savedRight}>{right}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 11, backgroundColor: 'white', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 20, ...shadow.card },
  heart: { position: 'absolute', top: 7, right: 7, width: 31, height: 31, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0, paddingTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTime: { color: '#9aa19e', fontSize: font.xs },
  title: { marginTop: 8, marginBottom: 4, fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  location: { color: '#8a9490', fontSize: font.xs },
  priceRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 17, fontWeight: '800', color: colors.text },
  priceUnit: { color: '#89938f', fontSize: font.xs },
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
