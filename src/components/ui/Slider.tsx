import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tick } from '@/lib/haptics';
import { color, radius, shadow, space } from '@/theme';

import { Text } from './Text';

const THUMB = 24;

interface Props {
  label: string;
  value: SharedValue<number>;
  min: number;
  max: number;
  /** Double-tap resets to this. */
  resetTo?: () => number;
  /** Called when a drag or reset finishes. */
  onChangeEnd?: () => void;
}

/**
 * The value lives in a shared value and is written from the UI thread, so the
 * shader it feeds redraws at frame rate without a React render per drag step.
 * Only the small number readout re-renders, and only when it changes.
 */
export function Slider({ label, value, min, max, resetTo, onChangeEnd }: Props) {
  const [width, setWidth] = useState(0);
  const [shown, setShown] = useState(() => display(value.value, min, max));
  const active = useSharedValue(0);
  const bipolar = min < 0;

  useAnimatedReaction(
    () => display(value.value, min, max),
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setShown, next);
    },
  );

  const toX = (v: number) => {
    'worklet';
    return ((v - min) / (max - min)) * width;
  };
  const fromX = (x: number) => {
    'worklet';
    const t = Math.min(Math.max(x / width, 0), 1);
    return min + t * (max - min);
  };

  const done = () => {
    tick();
    onChangeEnd?.();
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .hitSlop({ vertical: 14 })
    .onBegin((e) => {
      active.value = withSpring(1, { damping: 16 });
      if (width > 0) value.value = fromX(e.x);
    })
    .onUpdate((e) => {
      if (width > 0) value.value = fromX(e.x);
    })
    .onFinalize(() => {
      active.value = withSpring(0, { damping: 16 });
      scheduleOnRN(done);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (resetTo) scheduleOnRN(reset);
    });

  function reset() {
    if (resetTo) value.value = withTiming(resetTo(), { duration: 250 });
    done();
  }

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: toX(value.value) - THUMB / 2 },
      { scale: 1 + active.value * 0.18 },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const x = toX(value.value);
    const origin = bipolar ? width / 2 : 0;
    return { left: Math.min(origin, x), width: Math.abs(x - origin) };
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Text variant="label" style={styles.value}>
          {shown}
        </Text>
      </View>
      <GestureDetector gesture={Gesture.Exclusive(doubleTap, pan)}>
        <View
          style={styles.hit}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: shown }}
        >
          <View style={styles.track} />
          {bipolar ? <View style={styles.center} /> : null}
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, shadow.soft, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

/** -1..1 shows as -100..+100, 0..1 as 0..100. */
function display(v: number, min: number, max: number) {
  'worklet';
  if (min < 0) {
    const n = Math.round((v / Math.max(Math.abs(min), max)) * 100);
    return n > 0 ? `+${n}` : `${n}`;
  }
  return `${Math.round(((v - min) / (max - min)) * 100)}`;
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { color: color.text, fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' },
  hit: { height: 34, justifyContent: 'center' },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: color.line },
  center: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 12,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: color.faint,
  },
  fill: { position: 'absolute', height: 4, borderRadius: radius.pill, backgroundColor: color.accent },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: color.paper,
    borderWidth: 4,
    borderColor: color.accent,
  },
});
