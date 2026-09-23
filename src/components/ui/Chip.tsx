import { StyleSheet, View, type ViewStyle } from 'react-native';

import { tick } from '@/lib/haptics';
import { color, radius, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Chip({ label, active, onPress, icon, disabled, style }: ChipProps) {
  const fg = active ? color.accentInk : color.text;
  return (
    <PressableScale
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={() => {
        tick();
        onPress();
      }}
      style={[styles.chip, active && styles.active, disabled && styles.disabled, style]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} strokeWidth={2.4} /> : null}
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </PressableScale>
  );
}

interface SegmentedProps<T extends string | number> {
  options: readonly { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}

/** A pill track with one selected segment; for 2-4 mutually exclusive choices. */
export function Segmented<T extends string | number>({ options, value, onChange, style }: SegmentedProps<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <PressableScale
            key={String(o.id)}
            to={0.97}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tick();
              onChange(o.id);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={active ? color.accentInk : color.muted} /> : null}
            <Text variant="label" style={{ color: active ? color.accentInk : color.muted }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    borderWidth: 1,
    borderColor: color.line,
  },
  active: { backgroundColor: color.accent, borderColor: color.accent },
  disabled: { opacity: 0.45 },
  track: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  segmentActive: { backgroundColor: color.accent },
});
