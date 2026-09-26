import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { inquiryApi, noticeApi, repairApi } from '../../api/dorm';
import type { DormSearchField, InquiryListItem, NoticeBlock, NoticeListItem, RepairListItem } from '../../api/types';
import { useConfirm, useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import {
  BoardSearchBar,
  Button,
  CheckRow,
  EmptyState,
  ErrorView,
  Fab,
  Field,
  FormScroll,
  Input,
  LoadingView,
  RadioRow,
  Screen,
  SubHeader,
} from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useSlicedPages } from '../../hooks/useSlicedPages';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { BoardRow, DetailHeader, detailStyles, DORM_SERVER_PAGE_SIZE, DORM_UI_PAGE_SIZE, Pager } from './dormShared';

type Kind = 'repair' | 'notice' | 'inquiry';
type Item = RepairListItem | NoticeListItem | InquiryListItem;

const META: Record<Kind, { title: string; subtitle: string; empty: string }> = {
  repair: { title: '고쳐주세요', subtitle: '생활관 시설 불편을 알려주세요', empty: '등록된 수리 요청이 없어요' },
  notice: { title: '공지사항', subtitle: '생활관의 중요한 소식을 확인하세요', empty: '공지사항이 없어요' },
  inquiry: { title: '일반 문의 · 상담', subtitle: '궁금한 내용을 편하게 문의하세요', empty: '문의 글이 없어요' },
};

const listFn = { repair: repairApi.list, notice: noticeApi.list, inquiry: inquiryApi.list };

/** 작성자 판별: 상세의 writer가 폼 기본값(내 기숙사 프로필 이름)과 같으면 본인 글 */
/** 사이트 HTML의 공백/&nbsp; 차이로 같은 이름이 다르게 비교되지 않도록 공백을 모두 제거하고 비교 (서버 assertOwner와 동일 규칙) */
const normalizeName = (name: string | undefined) => (name ?? '').replace(/[\s\u00a0]/g, '');
const isMine = (writer: string | undefined, myName: string | undefined) => !!normalizeName(writer) && normalizeName(writer) === normalizeName(myName);

/**
 * 운영사무실 답변 줄바꿈 복원.
 * 서버가 사이트의 <br>을 공백으로 합쳐서 내려주기 때문에(DormInquiryService.extractStaffReply → text()),
 * 문장이 끝나는 곳(. ! ?)마다 줄을 바꿔 읽기 쉽게 함. '1.' 같은 번호 뒤에서는 안 바꿈.
 */
const formatReply = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((part) => part.replace(/([^\d\s][.!?])\s+(?=\S)/g, '$1\n').trim())
    .join('\n\n');

// ───────── 목록 (공통) ─────────

function DormBoardList({ kind, onOpen, onWrite }: { kind: Kind; onOpen: (no: number) => void; onWrite?: () => void }) {
  const [field, setField] = useState<DormSearchField>('TITLE');
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState({ keyword: '', field: 'TITLE' as DormSearchField });
  const list = useSlicedPages(
    (page) => listFn[kind]({ ...query, page }) as Promise<Item[]>,
    DORM_SERVER_PAGE_SIZE,
    DORM_UI_PAGE_SIZE,
    [kind, query],
  );

  const search = () => setQuery({ keyword, field });

  const renderItem = ({ item }: { item: Item }) => {
    const inquiry = kind === 'inquiry' ? (item as InquiryListItem) : null;
    return (
      <BoardRow
        no={item.displayNo}
        isNew={item.isNew}
        leading={inquiry?.isSecret ? <Icon name="lock" size={14} color={colors.textMuted} /> : undefined}
        title={
          <>
            {item.title}
            {inquiry && inquiry.replyCount > 0 && <Text style={styles.replyCount}> ({inquiry.replyCount})</Text>}
          </>
        }
        meta={`${item.writer} · 조회 ${item.viewCount}`}
        date={item.writtenDate}
        onPress={() => onOpen(item.no)}
      />
    );
  };

  return (
    <>
      {/* 검색창은 목록 밖(위)에 둬야 필드 선택 드롭다운이 글 목록 위에 제대로 덮임 */}
      <View style={styles.searchWrap}>
        <BoardSearchBar field={field} onFieldChange={setField} keyword={keyword} onKeywordChange={setKeyword} onSubmit={search} />
      </View>
      {list.loading && !list.items ? (
        <LoadingView />
      ) : list.error && !list.items ? (
        <ErrorView message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items ?? []}
          keyExtractor={(i) => `${i.displayNo}-${i.no}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="doc" title={query.keyword ? '검색 결과가 없어요' : META[kind].empty} />}
          ListFooterComponent={
            <Pager page={list.page} pagesInBlock={list.pagesInBlock} hasNextBlock={list.hasNextBlock} loading={list.loading} onChange={list.goTo} />
          }
        />
      )}
      {onWrite && <Fab label="글쓰기" onPress={onWrite} />}
    </>
  );
}

export function RepairListScreen({ navigation }: ScreenProps<'RepairList'>) {
  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title={META.repair.title} subtitle={META.repair.subtitle} />
      <DormBoardList kind="repair" onOpen={(no) => navigation.navigate('RepairDetail', { no })} onWrite={() => navigation.navigate('RepairForm', {})} />
    </Screen>
  );
}

export function NoticeListScreen({ navigation }: ScreenProps<'NoticeList'>) {
  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title={META.notice.title} subtitle={META.notice.subtitle} />
      <DormBoardList kind="notice" onOpen={(no) => navigation.navigate('NoticeDetail', { no })} />
    </Screen>
  );
}

export function InquiryListScreen({ navigation }: ScreenProps<'InquiryList'>) {
  return (
    <Screen bg={colors.bgSub}>
      <SubHeader title={META.inquiry.title} subtitle={META.inquiry.subtitle} />
      <DormBoardList kind="inquiry" onOpen={(no) => navigation.navigate('InquiryDetail', { no })} onWrite={() => navigation.navigate('InquiryForm', {})} />
    </Screen>
  );
}

// ───────── 상세 ─────────

function useDelete(remove: () => Promise<unknown>, onDone: () => void) {
  const toast = useToast();
  const confirm = useConfirm();
  return async () => {
    const ok = await confirm({ title: '글을 삭제할까요?', message: '삭제하면 되돌릴 수 없어요.', confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      await remove();
      toast('글을 삭제했어요');
      onDone();
    } catch (e) {
      toast(errorMessage(e));
    }
  };
}

export function RepairDetailScreen({ navigation, route }: ScreenProps<'RepairDetail'>) {
  const { no } = route.params;
  const { data, error, loading, reload } = useFetch(
    async () => {
      const [detail, me] = await Promise.all([repairApi.detail(no), repairApi.formDefaults().catch(() => null)]);
      return { detail, mine: isMine(detail.writer, me?.writerName) };
    },
    [no],
    { refetchOnFocus: true },
  );
  const remove = useDelete(() => repairApi.remove(no), () => navigation.goBack());

  return (
    <Screen bg="white">
      <SubHeader title="고쳐주세요" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <DetailHeader title={data.detail.title} meta={[data.detail.writer, `조회 ${data.detail.viewCount}`, data.detail.writtenAt]} />
          <View style={styles.visit}>
            <Text style={styles.visitLabel}>방이 비어있을 때 방문</Text>
            <Text style={styles.visitValue}>{data.detail.visitAllowed || '-'}</Text>
          </View>
          <Text style={detailStyles.body}>{data.detail.content}</Text>
          {data.mine && (
            <View style={detailStyles.actions}>
              <Button label="수정" variant="outline" onPress={() => navigation.navigate('RepairForm', { no })} style={{ flex: 1, height: 46 }} />
              <Button label="삭제" variant="dangerOutline" onPress={remove} style={{ flex: 1, height: 46 }} />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

export function NoticeDetailScreen({ route }: ScreenProps<'NoticeDetail'>) {
  const { no } = route.params;
  const { data, error, loading, reload } = useFetch(() => noticeApi.detail(no), [no]);
  return (
    <Screen bg="white">
      <SubHeader title="공지사항" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <DetailHeader title={data.title} meta={[data.writer, `조회 ${data.viewCount}`, data.writtenAt]} />
          {data.blocks?.length ? (
            data.blocks.map((block, i) => <NoticeBlockView key={i} block={block} />)
          ) : (
            <Text style={detailStyles.body}>{data.content}</Text>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

/** 공지 본문 블록: 문단은 줄바꿈 유지, 표는 칸 구조 그대로 (열이 많으면 가로 스크롤) */
function NoticeBlockView({ block }: { block: NoticeBlock }) {
  if (block.type === 'TEXT') return <Text style={[detailStyles.body, noticeStyles.paragraph]}>{block.text}</Text>;

  const cols = Math.max(...block.rows.map((r) => r.length));
  const table = (
    <View style={[noticeStyles.table, { minWidth: cols * 96 }]}>
      {block.rows.map((row, r) => (
        <View key={r} style={[noticeStyles.row, r === 0 && noticeStyles.headRow, r === block.rows.length - 1 && { borderBottomWidth: 0 }]}>
          {Array.from({ length: cols }, (_, c) => (
            <Text key={c} style={[noticeStyles.cell, r === 0 && noticeStyles.headCell, c === cols - 1 && { borderRightWidth: 0 }]}>
              {row[c] ?? ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={noticeStyles.tableWrap} contentContainerStyle={{ flexGrow: 1 }}>
      {table}
    </ScrollView>
  );
}

const noticeStyles = StyleSheet.create({
  paragraph: { marginBottom: 14 },
  tableWrap: { marginBottom: 16 },
  table: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  headRow: { backgroundColor: colors.primarySoft2 },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 9, borderRightWidth: 1, borderRightColor: colors.border, fontSize: font.sm, lineHeight: 18, color: colors.textBody, textAlign: 'center' },
  headCell: { fontWeight: '700', color: colors.primaryDeep },
});

export function InquiryDetailScreen({ navigation, route }: ScreenProps<'InquiryDetail'>) {
  const { no } = route.params;
  const { data, error, loading, reload } = useFetch(
    async () => {
      const [detail, me] = await Promise.all([inquiryApi.detail(no), inquiryApi.formDefaults().catch(() => null)]);
      return { detail, mine: !detail.locked && isMine(detail.writer, me?.writerName) };
    },
    [no],
    { refetchOnFocus: true },
  );
  const remove = useDelete(() => inquiryApi.remove(no), () => navigation.goBack());

  return (
    <Screen bg="white">
      <SubHeader title="일반 문의 · 상담" />
      {loading && !data ? (
        <LoadingView />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했어요'} onRetry={reload} />
      ) : data.detail.locked ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="lock" title="🔒 비밀글입니다" message="작성자와 관리자만 볼 수 있어요." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <DetailHeader title={data.detail.title} meta={[data.detail.writer, `조회 ${data.detail.viewCount}`, data.detail.writtenAt]} />
          <Text style={detailStyles.body}>{data.detail.content}</Text>
          {!!data.detail.staffReply && (
            <View style={styles.reply}>
              <View style={styles.replyHead}>
                <View style={styles.replyIcon}>
                  <Icon name="dorm" size={13} color="white" strokeWidth={2.2} />
                </View>
                <Text style={styles.replyTitle}>운영사무실 답변</Text>
              </View>
              <Text style={styles.replyText}>{formatReply(data.detail.staffReply)}</Text>
            </View>
          )}
          {data.mine && (
            <View style={detailStyles.actions}>
              <Button label="수정" variant="outline" onPress={() => navigation.navigate('InquiryForm', { no })} style={{ flex: 1, height: 46 }} />
              <Button label="삭제" variant="dangerOutline" onPress={remove} style={{ flex: 1, height: 46 }} />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

// ───────── 작성/수정 ─────────

export function RepairFormScreen({ navigation, route }: ScreenProps<'RepairForm'>) {
  const editNo = route.params?.no;
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [visitAllowed, setVisitAllowed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const init = useFetch(async () => {
    const [writer, detail] = await Promise.all([repairApi.formDefaults(), editNo != null ? repairApi.detail(editNo) : Promise.resolve(null)]);
    if (detail) {
      setTitle(detail.title);
      setContent(detail.content);
      setVisitAllowed(!/불가|아니|않/.test(detail.visitAllowed));
    }
    return writer;
  }, [editNo]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return setError('제목과 내용을 입력해주세요');
    if (editNo == null && password.length < 4) return setError('글 비밀번호는 4자 이상 입력해주세요');
    setSubmitting(true);
    setError(null);
    try {
      if (editNo == null) await repairApi.create({ title: title.trim(), content: content.trim(), postPassword: password, visitAllowed });
      else await repairApi.update(editNo, { title: title.trim(), content: content.trim(), visitAllowed });
      toast(editNo == null ? '수리 요청을 등록했어요' : '글을 수정했어요');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title={editNo == null ? '고쳐주세요 글쓰기' : '고쳐주세요 수정'} />
      {init.loading ? (
        <LoadingView />
      ) : (
        <FormScroll footer={<Button label={editNo == null ? '등록하기' : '수정하기'} onPress={submit} loading={submitting} />}>
          {init.data && <WriterInfo name={init.data.writerName} email={init.data.writerEmail} />}
          <Field label="제목">
            <Input value={title} onChangeText={setTitle} placeholder="불편한 시설을 알려주세요" />
          </Field>
          <Field label="내용">
            <Input value={content} onChangeText={setContent} multiline placeholder="시설 위치와 문제를 자세히 적어주세요" />
          </Field>
          {editNo == null && (
            <Field label="글 비밀번호" hint="4자 이상. 기숙사 사이트에서 글을 수정/삭제할 때 필요해요">
              <Input value={password} onChangeText={setPassword} secureTextEntry keyboardType="number-pad" maxLength={20} />
            </Field>
          )}
          <Field label="방이 비어있을 때 방문 허용">
            <RadioRow label="허용합니다" selected={visitAllowed} onPress={() => setVisitAllowed(true)} />
            <RadioRow label="허용하지 않습니다" selected={!visitAllowed} onPress={() => setVisitAllowed(false)} />
          </Field>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </FormScroll>
      )}
    </Screen>
  );
}

export function InquiryFormScreen({ navigation, route }: ScreenProps<'InquiryForm'>) {
  const editNo = route.params?.no;
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const init = useFetch(async () => {
    const [writer, detail] = await Promise.all([inquiryApi.formDefaults(), editNo != null ? inquiryApi.detail(editNo) : Promise.resolve(null)]);
    if (detail) {
      setTitle(detail.title);
      setContent(detail.content);
    }
    return writer;
  }, [editNo]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return setError('제목과 내용을 입력해주세요');
    if (editNo == null && password.length < 4) return setError('글 비밀번호는 4자 이상 입력해주세요');
    setSubmitting(true);
    setError(null);
    try {
      if (editNo == null) await inquiryApi.create({ title: title.trim(), content: content.trim(), postPassword: password, isSecret });
      else await inquiryApi.update(editNo, { title: title.trim(), content: content.trim(), isSecret });
      toast(editNo == null ? '문의를 등록했어요' : '글을 수정했어요');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title={editNo == null ? '문의하기' : '문의 수정'} />
      {init.loading ? (
        <LoadingView />
      ) : (
        <FormScroll footer={<Button label={editNo == null ? '등록하기' : '수정하기'} onPress={submit} loading={submitting} />}>
          {init.data && <WriterInfo name={init.data.writerName} email={init.data.writerEmail} />}
          <Field label="제목">
            <Input value={title} onChangeText={setTitle} placeholder="문의 제목을 입력해주세요" />
          </Field>
          <Field label="내용">
            <Input value={content} onChangeText={setContent} multiline placeholder="궁금한 내용을 자세히 적어주세요" />
          </Field>
          {editNo == null && (
            <Field label="글 비밀번호" hint="4자 이상">
              <Input value={password} onChangeText={setPassword} secureTextEntry maxLength={20} />
            </Field>
          )}
          <CheckRow label="비밀글로 작성하기" checked={isSecret} onPress={() => setIsSecret((v) => !v)} />
          {!!error && <Text style={styles.error}>{error}</Text>}
        </FormScroll>
      )}
    </Screen>
  );
}

function WriterInfo({ name, email }: { name: string; email: string }) {
  return (
    <View style={styles.writer}>
      <Text style={styles.writerLabel}>작성자</Text>
      <Text style={styles.writerValue}>{[name, email].filter(Boolean).join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6, zIndex: 10, elevation: 10 },
  // 질문 본문과 충분히 떨어뜨려서 아래쪽에 배치
  reply: { marginTop: 26, marginBottom: 10, padding: 18, borderRadius: 16, backgroundColor: '#f3f6f5' },
  replyHead: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  replyIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  replyTitle: { fontSize: font.sm, fontWeight: '800', color: colors.text },
  replyText: { fontSize: font.base, lineHeight: 25, color: colors.textBody },
  replyCount: { color: colors.primaryDark, fontWeight: '700' },
  visit: { marginTop: 14, padding: 12, flexDirection: 'row', justifyContent: 'space-between', borderRadius: 11, backgroundColor: '#f5f7f6' },
  visitLabel: { fontSize: font.sm, color: '#78837f' },
  visitValue: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  writer: { marginBottom: 6, padding: 12, flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, backgroundColor: colors.primarySoft2 },
  writerLabel: { color: colors.primaryDark, fontSize: font.xs },
  writerValue: { color: colors.primaryDeep, fontSize: font.sm, fontWeight: '700' },
  error: { marginTop: 6, color: colors.danger, fontSize: font.sm },
});
