import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import Icon from './Icon';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Figma 시안의 .calendar-ui (시작일/종료일 범위 선택) */
export default function DateRangeCalendar({
  start,
  end,
  onChange,
  minDate,
  maxDate,
}: {
  start: Date | null;
  end: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = start ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [focus, setFocus] = useState<'start' | 'end'>(start && !end ? 'end' : 'start');

  const firstWeekday = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];

  const disabled = (d: Date) => (minDate && d < startOfDay(minDate)) || (maxDate && d > startOfDay(maxDate));

  const pick = (d: Date) => {
    if (focus === 'start' || !start || d < start) {
      onChange(d, null);
      setFocus('end');
    } else {
      onChange(start, d);
      setFocus('start');
    }
  };

  const fmt = (d: Date | null) => (d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '선택');

  return (
    <View>
      <View style={styles.pickers}>
        <Pressable style={[styles.picker, focus === 'start' && styles.pickerActive]} onPress={() => setFocus('start')}>
          <Text style={styles.pickerLabel}>시작일</Text>
          <Text style={styles.pickerValue}>{fmt(start)}</Text>
        </Pressable>
        <Text style={{ color: '#a2adb1' }}>—</Text>
        <Pressable style={[styles.picker, focus === 'end' && styles.pickerActive]} onPress={() => setFocus('end')}>
          <Text style={styles.pickerLabel}>종료일</Text>
          <Text style={styles.pickerValue}>{fmt(end)}</Text>
        </Pressable>
      </View>

      <View style={styles.calendar}>
        <View style={styles.head}>
          <Pressable style={styles.navBtn} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <Icon name="back" size={16} />
          </Pressable>
          <Text style={styles.headTitle}>{cursor.getFullYear()}년 {cursor.getMonth() + 1}월</Text>
          <Pressable style={styles.navBtn} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <Icon name="chevron" size={16} />
          </Pressable>
        </View>
        <View style={styles.row}>
          {WEEK.map((w, i) => (
            <Text key={w} style={[styles.week, i === 0 && { color: '#df6a70' }]}>{w}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const isEdge = sameDay(d, start) || sameDay(d, end);
            const inRange = start && end && d >= start && d <= end;
            const off = disabled(d);
            return (
              <Pressable key={d.toISOString()} style={styles.cell} disabled={!!off} onPress={() => pick(d)}>
                {inRange && (
                  <View
                    style={[
                      styles.rangeBg,
                      sameDay(d, start) && { left: '50%' },
                      sameDay(d, end) && { right: '50%' },
                    ]}
                  />
                )}
                <View style={[styles.day, isEdge && styles.dayEdge]}>
                  <Text style={[styles.dayText, isEdge && { color: 'white', fontWeight: '700' }, off && { color: '#cfd6d9' }]}>{d.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickers: { marginTop: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  picker: { flex: 1, height: 58, paddingHorizontal: 12, justifyContent: 'center', gap: 3, borderWidth: 1, borderColor: '#dce4e7', borderRadius: 12, backgroundColor: 'white' },
  pickerActive: { borderColor: colors.primaryLight, backgroundColor: '#f0f8fa' },
  pickerLabel: { color: '#88969c', fontSize: font.xs },
  pickerValue: { fontSize: font.base, fontWeight: '700', color: colors.text },
  calendar: { padding: 10, paddingTop: 13, borderWidth: 1, borderColor: '#dfe7e9', borderRadius: 15, backgroundColor: 'white' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  navBtn: { width: 29, height: 29, borderRadius: 8, backgroundColor: '#f0f4f5', alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row' },
  week: { flex: 1, paddingVertical: 4, textAlign: 'center', color: '#91a0a6', fontSize: font.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' },
  rangeBg: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, backgroundColor: colors.primarySoft },
  day: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayEdge: { backgroundColor: '#73bdc9' },
  dayText: { fontSize: font.sm, color: colors.text },
});
