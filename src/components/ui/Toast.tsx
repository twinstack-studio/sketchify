import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { color, radius, shadow, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ToastSpec {
  message: string;
  icon?: IconName;
  tone?: 'default' | 'danger';
  action?: { label: string; onPress: () => void };
}

interface ToastState {
  current: (ToastSpec & { id: number }) | null;
  show: (t: ToastSpec) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: Date.now() } }),
  hide: () => set({ current: null }),
}));

/** Short, non-blocking feedback ("Saved to your gallery") instead of an alert. */
export const toast = (t: ToastSpec | string) =>
  useToastStore.getState().show(typeof t === 'string' ? { message: t } : t);

/** Mounted once, in the root layout. */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(hide, current.action ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [current, hide]);

  if (!current) return null;
  const danger = current.tone === 'danger';
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.sm }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(180)}
        style={[styles.toast, shadow.soft]}
      >
        <View style={[styles.badge, danger && styles.badgeDanger]}>
          <Icon
            name={current.icon ?? (danger ? 'info' : 'check')}
            size={16}
            strokeWidth={2.6}
            color={danger ? color.danger : color.accentInk}
          />
        </View>
        <Text variant="label" style={styles.message} numberOfLines={2}>
          {current.message}
        </Text>
        {current.action ? (
          <PressableScale
            onPress={() => {
              hide();
              current.action?.onPress();
            }}
            hitSlop={10}
          >
            <Text variant="label" tone="accent">
              {current.action.label}
            </Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    maxWidth: 440,
    width: '100%',
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.lg,
    borderRadius: radius.xl,
    backgroundColor: color.raised,
    borderWidth: 1,
    borderColor: color.line,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
  },
  badgeDanger: { backgroundColor: color.dangerSoft },
  message: { flex: 1 },
});
