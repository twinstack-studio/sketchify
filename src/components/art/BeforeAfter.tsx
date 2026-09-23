import {
  Canvas,
  Fill,
  Group,
  ImageShader,
  Rect,
  Shader,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { effectFor } from '@/skia/effects';
import { FILTER_BY_ID, uniformObject, type StyleId } from '@/skia/filters';
import { color, radius, space } from '@/theme';

interface Props {
  image: SkImage | null;
  width: number;
  height: number;
  /** Styles to cycle through, one per sweep. */
  styles: StyleId[];
  corner?: number;
  showLabel?: boolean;
}

const SWEEP = 1700;
const HOLD = 900;

/**
 * An animated before/after: a divider sweeps across the photo, revealing the
 * sketch, then the next style takes over. Purely decorative.
 */
export function BeforeAfter({ image, width, height, styles: list, corner = radius.xxl, showLabel = true }: Props) {
  const [index, setIndex] = useState(0);
  const style = list[index % list.length];
  const x = useSharedValue(width * 0.5);

  useEffect(() => {
    if (width <= 0) return;
    const ease = Easing.inOut(Easing.cubic);
    x.value = width * 0.92;
    x.value = withRepeat(
      withSequence(
        withDelay(HOLD, withTiming(width * 0.08, { duration: SWEEP, easing: ease })),
        withDelay(HOLD, withTiming(width * 0.92, { duration: SWEEP, easing: ease })),
      ),
      -1,
    );
    // The style changes while the sketch is fully hidden (divider on the right).
    const t = setInterval(() => setIndex((i) => i + 1), 2 * (SWEEP + HOLD));
    return () => {
      clearInterval(t);
      cancelAnimation(x);
    };
  }, [width, x]);

  const clip = useDerivedValue(() => rect(0, 0, x.value, height));
  const lineX = useDerivedValue(() => x.value - 1);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 15 }] }));

  const box = { width, height, borderRadius: corner };
  if (!image || width <= 0) return <View style={[box, { backgroundColor: color.raised }]} />;

  const photo = <ImageShader image={image} fit="cover" rect={{ x: 0, y: 0, width, height }} />;
  return (
    <View style={[box, s.clip]}>
      <Canvas style={{ width, height }} pointerEvents="none">
        <Fill>
          <Shader source={effectFor(style)} uniforms={uniformObject(width, height, FILTER_BY_ID[style].defaults)}>
            {photo}
          </Shader>
        </Fill>
        <Group clip={clip}>
          <Fill>{photo}</Fill>
        </Group>
        <Rect x={lineX} y={0} width={2} height={height} color={color.paper} />
      </Canvas>
      <Animated.View pointerEvents="none" style={[s.knob, { top: height / 2 - 15 }, knob]}>
        <View style={[s.chev, s.left]} />
        <View style={[s.chev, s.right]} />
      </Animated.View>
      {showLabel ? (
        <View style={s.tags} pointerEvents="none">
          <View style={s.tag}>
            <Text variant="caption">Photo</Text>
          </View>
          <View style={[s.tag, s.tagAccent]}>
            <Text variant="caption" tone="accentInk">
              {FILTER_BY_ID[style].name}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: color.raised },
  knob: {
    position: 'absolute',
    left: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chev: { width: 6, height: 6, borderColor: color.bg, borderLeftWidth: 2, borderBottomWidth: 2 },
  left: { transform: [{ rotate: '45deg' }] },
  right: { transform: [{ rotate: '-135deg' }] },
  tags: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.overlay,
  },
  tagAccent: { backgroundColor: color.accent },
});
