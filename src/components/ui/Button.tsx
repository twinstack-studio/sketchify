import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { tap } from '@/lib/haptics';
import { color, radius, shadow, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const FG: Record<Variant, string> = {
  primary: color.accentInk,
  secondary: color.text,
  ghost: color.text,
  danger: color.danger,
  glass: color.text,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  busy,
  disabled,
  style,
}: Props) {
  const inactive = disabled || busy;
  const fg = FG[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        variant === 'primary' && !inactive && shadow.glow,
        inactive && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={fg} strokeWidth={2.2} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'heading'} style={{ color: fg }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  variant?: 'glass' | 'solid' | 'plain' | 'accent';
  size?: number;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** A round icon-only button, for toolbars and the camera. */
export function IconButton({
  icon,
  onPress,
  label,
  variant = 'solid',
  size = 44,
  active,
  disabled,
  style,
}: IconButtonProps) {
  const on = active || variant === 'accent';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled}
      hitSlop={6}
      to={0.9}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'glass' && styles.iconGlass,
        variant === 'solid' && styles.iconSolid,
        on && styles.iconActive,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={on ? color.accentInk : color.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: { minHeight: 58, paddingHorizontal: space.xxl },
  md: { minHeight: 50, paddingHorizontal: space.xl },
  sm: { minHeight: 38, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  primary: { backgroundColor: color.accent },
  secondary: { backgroundColor: color.raised, borderWidth: 1, borderColor: color.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: color.dangerSoft },
  glass: { backgroundColor: color.glass, borderWidth: 1, borderColor: color.lineSoft },
  disabled: { opacity: 0.4 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconGlass: { backgroundColor: color.glass, borderWidth: 1, borderColor: color.lineSoft },
  iconSolid: { backgroundColor: color.raised, borderWidth: 1, borderColor: color.line },
  iconActive: { backgroundColor: color.accent, borderColor: color.accent },
});
