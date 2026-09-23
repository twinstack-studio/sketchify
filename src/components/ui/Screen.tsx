import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { color, space, TAB_BAR_SPACE } from '@/theme';

import { Text } from './Text';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll, edges = ['top'], padded = true, tabs, contentStyle }: Props) {
  const inner = [padded && styles.padded, tabs && styles.tabs, contentStyle];
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, inner]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** A screen title with an optional overline and a trailing slot. */
export function ScreenHeader({
  overline,
  title,
  subtitle,
  right,
}: {
  overline?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.fill}>
          {overline ? (
            <Text variant="overline" tone="accent">
              {overline}
            </Text>
          ) : null}
          <Text variant="display">{title}</Text>
        </View>
        {right}
      </View>
      {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  fill: { flex: 1 },
  padded: { paddingHorizontal: space.xl },
  tabs: { paddingBottom: TAB_BAR_SPACE },
  scrollContent: { paddingBottom: space.xxxl },
  header: { gap: space.sm, paddingTop: space.lg, paddingBottom: space.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
});
