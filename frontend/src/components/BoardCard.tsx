import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board, BoardSummary } from '../api/types';
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
          {/* 게이지 오른쪽 위: 참여 요청(연락) 수 · 좋아요 수 (0이면 숨김) */}
          {(board.waitingCount > 0 || board.likeCount > 0) && (
            <View style={styles.stats}>
              {board.waitingCount > 0 && (
                <View style={styles.stat}>
                  <Icon name="user" size={13} color={colors.textMuted} />
                  <Text style={styles.statText}>{board.waitingCount}</Text>
                </View>
              )}
              {board.likeCount > 0 && (
                <View style={styles.stat}>
                  <Icon name="heart" size={13} color={colors.heart} filled />
                  <Text style={styles.statText}>{board.likeCount}</Text>
                </View>
              )}
            </View>
          )}
          <ProgressBar ratio={boardProgress(board)} height={18} label={`${collected}/${board.totalQuantity}`} />
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

/**
 * 프로필의 판매 글: 정사각형 사진 + 제목·가격·장소. 모집완료면 사진을 어둡게 덮고 '모집완료'
 * (프로필 응답은 요약뿐이라 사진·장소는 board(상세)가 오면 채움)
 */
export function SquareBoardCard({ summary, board, onPress, size = 148 }: { summary: BoardSummary; board?: Board | null; onPress: () => void; size?: number }) {
  const done = summary.status !== 'IN_PROGRESS';
  const place = placeName(board?.location);
  return (
    <Pressable style={{ width: size }} onPress={onPress}>
      <View>
        <Thumb uri={board?.images[0]?.imageUrl} size={size} radius={16} />
        {done && (
          <View style={[styles.squareCover, { borderRadius: 16 }]}>
            <Text style={styles.squareCoverText}>모집완료</Text>
          </View>
        )}
      </View>
      <Text style={styles.squareTitle} numberOfLines={1}>{summary.title}</Text>
      <Text style={[styles.squarePrice, done && { color: colors.textMuted }]}>{won(summary.unitPrice)}</Text>
      {!!place && <Text style={styles.squarePlace} numberOfLines={1}>{place}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  squareCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(60,66,64,0.55)', alignItems: 'center', justifyContent: 'center' },
  squareCoverText: { fontSize: font.sm, fontWeight: '800', color: 'white' },
  squareTitle: { marginTop: 8, fontSize: font.md, fontWeight: '600', color: colors.text },
  squarePrice: { marginTop: 2, fontSize: 15, fontWeight: '800', color: colors.text },
  squarePlace: { marginTop: 2, fontSize: font.xs, color: colors.textMuted },
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
  stats: { marginBottom: 5, flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: font.xs, fontWeight: '600', color: colors.textMuted },

  saved: { flexDirection: 'row', gap: 12, padding: 12, marginBottom: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white' },
  savedTitle: { marginTop: 5, marginBottom: 3, fontSize: font.md, fontWeight: '700', color: colors.text },
  savedPrice: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  savedPlace: { marginTop: 3, color: '#8d9692', fontSize: font.xs },
  savedRight: { position: 'absolute', right: 12, top: 12 },
});
