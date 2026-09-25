import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import Icon from './Icon';

// ───────── Toast (시안의 .toast) ─────────

const ToastContext = createContext<(text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

// ───────── Confirm dialog (시안의 .confirm-dialog) ─────────

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

/** const ok = await confirm({ title: '...' }) */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(text);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(''));
      }, 2200);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );
  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={showToast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {!!toast && (
          <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        )}

        <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={() => close(false)}>
          <Pressable style={styles.confirmLayer} onPress={() => close(false)}>
            <Pressable style={styles.dialog} onPress={() => {}}>
              <View style={[styles.dialogIcon, dialog?.danger && styles.dangerIcon]}>
                {dialog?.danger ? (
                  <Text style={styles.dangerMark}>!</Text>
                ) : (
                  <Icon name="check" color={colors.primaryDark} />
                )}
              </View>
              <Text style={styles.dialogTitle}>{dialog?.title}</Text>
              {!!dialog?.message && <Text style={styles.dialogMessage}>{dialog.message}</Text>}
              <View style={styles.dialogButtons}>
                <Pressable style={styles.dialogBtn} onPress={() => close(false)}>
                  <Text style={styles.dialogBtnText}>{dialog?.cancelText ?? '취소'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.dialogBtn, { backgroundColor: dialog?.danger ? colors.danger : colors.primary }]}
                  onPress={() => close(true)}
                >
                  <Text style={[styles.dialogBtnText, { color: 'white' }]}>{dialog?.confirmText ?? '확인'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    maxWidth: '85%',
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 22,
    backgroundColor: colors.toast,
    zIndex: 100,
  },
  toastText: { color: 'white', fontSize: font.sm },
  confirmLayer: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 25 },
  dialog: { width: '100%', paddingTop: 24, paddingHorizontal: 20, paddingBottom: 18, borderRadius: 22, backgroundColor: 'white', alignItems: 'center' },
  dialogIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  dangerIcon: { backgroundColor: colors.dangerSoft },
  dangerMark: { color: '#dc5c60', fontSize: 22, fontWeight: '800' },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' },
  dialogMessage: { fontSize: font.sm, color: '#87918d', lineHeight: 19, textAlign: 'center', maxWidth: 270, marginBottom: 4 },
  dialogButtons: { flexDirection: 'row', gap: 8, marginTop: 18, alignSelf: 'stretch' },
  dialogBtn: { flex: 1, height: 45, borderRadius: radius.md, backgroundColor: '#eef2f0', alignItems: 'center', justifyContent: 'center' },
  dialogBtnText: { fontSize: font.md, fontWeight: '700', color: colors.text },
});
