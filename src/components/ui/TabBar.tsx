import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tick } from '@/lib/haptics';
import { color, radius, shadow, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ICONS: Record<string, IconName> = {
  index: 'pencilLine',
  batch: 'layers',
  gallery: 'images',
  profile: 'user',
};

/** A floating pill tab bar; the active tab grows a gold capsule behind it. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, space.md) }]}
    >
      <View style={[styles.bar, shadow.soft]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <Tab
              key={route.key}
              label={label}
              icon={ICONS[route.name] ?? 'pencilLine'}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  tick();
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function Tab({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
}) {
  const pill = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, { damping: 20 }),
    transform: [{ scale: withSpring(focused ? 1 : 0.6, { damping: 16, stiffness: 220 }) }],
  }));
  return (
    <PressableScale
      onPress={onPress}
      to={0.92}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        {/* Its own layer: on web an absolutely placed pill would paint over it. */}
        <View style={styles.iconLayer}>
          <Icon name={icon} size={21} color={focused ? color.accentInk : color.muted} strokeWidth={focused ? 2.3 : 2} />
        </View>
      </View>
      <Text variant="caption" style={{ color: focused ? color.text : color.faint, fontSize: 11 }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: color.tabBar,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  iconWrap: { width: 52, height: 32, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { zIndex: 1 },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
});
