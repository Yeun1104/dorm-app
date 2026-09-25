import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { boardApi, LocalImage } from '../../api/board';
import { errorMessage } from '../../api/client';
import { useToast } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { BottomSheet, Button, ErrorView, Field, FormScroll, Input, LoadingView, Screen, SubHeader, Thumb } from '../../components/ui';
import { MAX_BOARD_IMAGES } from '../../constants';
import { invalidateBoard } from '../../hooks/useBoards';
import { useFetch } from '../../hooks/useFetch';
import type { ScreenProps } from '../../navigation/types';
import { colors, font } from '../../theme';
import { won } from '../../utils/format';
import { CAMPUS_BUILDINGS, joinPlace, splitPlace } from '../../utils/place';

const toInt = (s: string) => {
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

/** 수정 모드에서는 서버에 있는 기존 이미지(id 보유)와 새로 고른 로컬 이미지가 섞여 있음 */
type FormImage = LocalImage & { id?: number };

export default function BoardWriteScreen({ navigation, route }: ScreenProps<'BoardWrite'>) {
  const editId = route.params?.boardId;
  const toast = useToast();
  const original = useFetch(() => boardApi.detail(editId!), [editId], { enabled: editId != null });
  const [images, setImages] = useState<FormImage[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [minQty, setMinQty] = useState('');
  const [building, setBuilding] = useState('');
  const [placeDetail, setPlaceDetail] = useState('');
  const [buildingSheet, setBuildingSheet] = useState(false);
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // 수정 모드: 기존 값으로 폼 채우기 (최초 1회)
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    const b = original.data;
    if (!b || prefilled) return;
    setImages(b.images.map((img) => ({ id: img.id, uri: img.imageUrl })));
    setTitle(b.title);
    setContent(b.content);
    setTotalPrice(String(b.totalPrice));
    setTotalQuantity(String(b.totalQuantity));
    setMinQty(b.minPurchaseQuantity != null ? String(b.minPurchaseQuantity) : '');
    const place = splitPlace(b.location);
    setBuilding(place.building);
    setPlaceDetail(place.detail);
    setUrl(b.url ?? '');
    setPrefilled(true);
  }, [original.data, prefilled]);

  const removeImage = (index: number) => {
    const target = images[index];
    if (target?.id != null) setDeleteImageIds((prev) => [...prev, target.id!]);
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const price = toInt(totalPrice);
  const qty = toInt(totalQuantity);
  // 미리보기용. 실제 개당 가격은 서버가 같은 규칙(올림)으로 계산해서 저장
  const unitPreview = price && qty ? Math.ceil(price / qty) : null;

  const pickImages = async () => {
    const remaining = MAX_BOARD_IMAGES - images.length;
    if (remaining <= 0) return toast(`사진은 최대 ${MAX_BOARD_IMAGES}장까지 올릴 수 있어요`);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (res.canceled) return;
    setImages((prev) =>
      [...prev, ...res.assets.map((a) => ({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType }))].slice(0, MAX_BOARD_IMAGES),
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = '제목을 입력해주세요';
    if (!content.trim()) e.content = '내용을 입력해주세요';
    if (!price || price < 1) e.totalPrice = '전체 결제 금액을 입력해주세요';
    if (!qty || qty < 1) e.totalQuantity = '전체 상품 개수를 입력해주세요';
    const min = toInt(minQty);
    if (minQty && (!min || min < 1)) e.minQty = '1 이상의 숫자를 입력해주세요';
    if (min && qty && min > qty) e.minQty = '전체 개수보다 클 수 없어요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const body = {
      title: title.trim(),
      content: content.trim(),
      totalPrice: price!,
      totalQuantity: qty!,
      minPurchaseQuantity: toInt(minQty) ?? undefined,
      location: joinPlace(building, placeDetail) || undefined,
      url: url.trim() || undefined,
      category: 'GROUP' as const,
    };
    try {
      if (editId != null) {
        await boardApi.update(editId, body, images.filter((img) => img.id == null), deleteImageIds);
        invalidateBoard(editId);
        toast('게시글을 수정했어요');
        navigation.goBack();
      } else {
        const board = await boardApi.create(body, images);
        toast('공동구매 글을 올렸어요');
        navigation.replace('BoardDetail', { boardId: board.id });
      }
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bg="white" edges={['top', 'bottom']}>
      <SubHeader title={editId != null ? '게시글 수정' : '공동구매 글쓰기'} />
      {editId != null && original.loading && !original.data ? (
        <LoadingView />
      ) : editId != null && (original.error || !original.data) ? (
        <ErrorView message={original.error ?? '게시글을 불러오지 못했어요'} onRetry={original.reload} />
      ) : (
        <FormScroll footer={<Button label={editId != null ? '수정하기' : '등록하기'} onPress={submit} loading={submitting} />}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingVertical: 4 }}>
            <Pressable style={styles.addPhoto} onPress={pickImages}>
              <Icon name="camera" color="#7e8985" />
              <Text style={styles.addPhotoText}>{images.length}/{MAX_BOARD_IMAGES}</Text>
            </Pressable>
            {images.map((img, i) => (
              <View key={img.uri}>
                <Thumb uri={img.uri} size={74} />
                <Pressable style={styles.removePhoto} onPress={() => removeImage(i)} hitSlop={6}>
                  <Icon name="close" size={12} color="white" strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <Field label="제목" error={errors.title}>
            <Input value={title} onChangeText={setTitle} placeholder="예) 진라면 매운맛 20개 같이 사요" maxLength={60} />
          </Field>
          <Field label="내용" error={errors.content}>
            <Input value={content} onChangeText={setContent} multiline placeholder="상품 정보, 도착 예정일, 소분 방법 등을 적어주세요" />
          </Field>
          <Field label="전체 결제 금액" hint="배송비 포함 금액으로 입력해주세요" error={errors.totalPrice}>
            <Input value={totalPrice} onChangeText={setTotalPrice} keyboardType="number-pad" placeholder="예) 13000" />
          </Field>
          <Field label="전체 상품 개수" error={errors.totalQuantity}>
            <Input value={totalQuantity} onChangeText={setTotalQuantity} keyboardType="number-pad" placeholder="예) 20" />
          </Field>

          {unitPreview !== null && (
            <View style={styles.preview}>
              <Text style={styles.previewText}>
                개당 <Text style={{ fontWeight: '800' }}>{won(unitPreview)}</Text>이에요!
              </Text>
            </View>
          )}

          <Field label="1인당 최소 구매 수량 (선택)" hint="비워두면 1개부터 참여할 수 있어요" error={errors.minQty}>
            <Input value={minQty} onChangeText={setMinQty} keyboardType="number-pad" placeholder="1" />
          </Field>
          <Field label="수령 장소" hint="목록에는 건물 이름만 보이고, 상세 위치는 게시글 안에서 보여요">
            <View style={styles.placeRow}>
              <Pressable style={styles.buildingBtn} onPress={() => setBuildingSheet(true)}>
                <Text style={[styles.buildingText, !building && { color: '#9aa5a1' }]} numberOfLines={1}>{building || '건물 선택'}</Text>
                <Icon name="down" size={16} color={colors.textMuted} />
              </Pressable>
              <Input value={placeDetail} onChangeText={setPlaceDetail} placeholder="상세 위치 (예: 1층 로비)" style={{ flex: 1 }} />
            </View>
          </Field>
          <Field label="상품 링크 (선택)">
            <Input value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholder="https://" />
          </Field>
        </FormScroll>
      )}

      <BottomSheet visible={buildingSheet} onClose={() => setBuildingSheet(false)}>
        <Text style={styles.sheetTitle}>건물 선택</Text>
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {CAMPUS_BUILDINGS.map((b) => {
            const active = b === building;
            return (
              <Pressable
                key={b}
                style={[styles.buildingItem, active && styles.buildingItemActive]}
                onPress={() => {
                  setBuilding(b);
                  setBuildingSheet(false);
                }}
              >
                <Text style={[styles.buildingItemText, active && styles.buildingItemTextActive]}>{b}</Text>
                {active && <Icon name="check" size={18} color={colors.text} strokeWidth={2.2} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addPhoto: { width: 74, height: 74, borderRadius: 12, borderWidth: 1, borderColor: '#dfe6e3', alignItems: 'center', justifyContent: 'center', gap: 3 },
  addPhotoText: { fontSize: font.xs, color: colors.textMuted },
  removePhoto: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(22,29,27,0.8)', alignItems: 'center', justifyContent: 'center' },
  placeRow: { flexDirection: 'row', gap: 8 },
  buildingBtn: { flex: 1, minHeight: 47, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderRadius: 11, borderWidth: 1, borderColor: '#dfe6e3', backgroundColor: 'white' },
  buildingText: { flexShrink: 1, fontSize: font.base, color: colors.text },
  sheetTitle: { marginBottom: 8, fontSize: 20, fontWeight: '800', color: colors.text },
  buildingItem: { height: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12 },
  buildingItemActive: { backgroundColor: '#f1f3f2' },
  buildingItemText: { fontSize: font.base, color: colors.textBody },
  buildingItemTextActive: { color: colors.text, fontWeight: '700' },
  preview: { marginTop: 2, marginBottom: 4, padding: 13, borderRadius: 12, backgroundColor: colors.primarySoft2 },
  previewText: { color: colors.primaryDeep, fontSize: font.base },
});
