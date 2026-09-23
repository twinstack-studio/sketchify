import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tick } from '@/lib/haptics';
import { color, radius, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SheetAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  actions?: SheetAction[];
  children?: ReactNode;
}

/** A bottom sheet of actions; replaces stacked alerts on Android. */
export function Sheet({ visible, onClose, title, subtitle, header, actions, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.dock} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}
        >
          <View style={styles.grabber} />
          {header}
          {title ? (
            <View style={styles.titles}>
              <Text variant="title">{title}</Text>
              {subtitle ? (
                <Text variant="caption" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {actions?.map((a) => (
            <PressableScale
              key={a.label}
              to={0.98}
              onPress={() => {
                tick();
                onClose();
                a.onPress();
              }}
              style={styles.action}
              accessibilityRole="button"
            >
              <View style={[styles.actionIcon, a.destructive && styles.actionIconDanger]}>
                <Icon name={a.icon} size={19} color={a.destructive ? color.danger : color.text} />
              </View>
              <Text variant="heading" tone={a.destructive ? 'danger' : 'text'}>
                {a.label}
              </Text>
            </PressableScale>
          ))}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: 2,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.line,
    marginBottom: space.md,
  },
  titles: { paddingHorizontal: space.sm, paddingBottom: space.md, gap: 2 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.raised,
  },
  actionIconDanger: { backgroundColor: color.dangerSoft },
});
