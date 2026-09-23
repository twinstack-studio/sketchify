import {
  Canvas,
  Fill,
  Group,
  ImageShader,
  Rect,
  Shader,
  Skia,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { effectFor } from '@/skia/effects';
import type { SliderKey, StyleId } from '@/skia/filters';
import { croppedSize, fitInside, layout, type Transform } from '@/skia/transforms';
import { color } from '@/theme';

export type AdjustmentValues = Record<SliderKey | 'invert', SharedValue<number>>;

interface Props {
  image: SkImage;
  style: StyleId;
  values: AdjustmentValues;
  transform: Transform;
  frame: { width: number; height: number };
  compare: boolean;
}

const HANDLE = 34;

/**
 * The live preview. Uniforms are derived from shared values on the UI thread,
 * so dragging a slider redraws the shader without re-rendering React.
 * With `compare` on, the original shows left of a draggable divider.
 */
export function CompareCanvas({ image, style, values, transform, frame, compare }: Props) {
  const view = useMemo(() => {
    const crop = croppedSize(image.width(), image.height(), transform);
    const fit = fitInside(crop.width, crop.height, frame.width, frame.height);
    const l = layout(image.width(), image.height(), transform, Math.max(fit.width, fit.height), true);
    return { width: l.width, height: l.height, matrix: Skia.Matrix(l.matrix) };
  }, [image, transform, frame.width, frame.height]);

  const effect = effectFor(style);

  const uniforms = useDerivedValue(() => ({
    resolution: [view.width, view.height],
    strength: values.strength.value,
    detail: values.detail.value,
    contrast: values.contrast.value,
    brightness: values.brightness.value,
    grain: values.grain.value,
    warmth: values.warmth.value,
    invert: values.invert.value,
  }));

  const divider = useSharedValue(view.width / 2);
  // A rotate or crop changes the frame; keep the handle inside it.
  useEffect(() => {
    divider.value = view.width / 2;
  }, [view.width, view.height, divider]);

  const clip = useDerivedValue(() => rect(0, 0, divider.value, view.height));
  const lineX = useDerivedValue(() => divider.value - 1);

  const pan = Gesture.Pan()
    .enabled(compare)
    .minDistance(0)
    .onBegin((e) => {
      divider.value = Math.min(Math.max(e.x, 0), view.width);
    })
    .onUpdate((e) => {
      divider.value = Math.min(Math.max(e.x, 0), view.width);
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: divider.value - HANDLE / 2 }],
  }));

  const imageShader = (
    <ImageShader image={image} tx="clamp" ty="clamp" matrix={view.matrix} />
  );

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: view.width, height: view.height }}>
        <Canvas style={{ width: view.width, height: view.height }}>
          <Fill>
            <Shader source={effect} uniforms={uniforms}>
              {imageShader}
            </Shader>
          </Fill>
          {compare ? (
            <>
              <Group clip={clip}>
                <Fill>{imageShader}</Fill>
              </Group>
              <Rect x={lineX} y={0} width={2} height={view.height} color="white" />
            </>
          ) : null}
        </Canvas>
        {compare ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.handle, { top: view.height / 2 - HANDLE / 2 }, handleStyle]}
          >
            <View style={styles.chevrons}>
              <View style={[styles.chevron, styles.left]} />
              <View style={[styles.chevron, styles.right]} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    left: 0,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: color.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  chevrons: { flexDirection: 'row', gap: 6 },
  chevron: {
    width: 7,
    height: 7,
    borderColor: color.bg,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  left: { transform: [{ rotate: '45deg' }] },
  right: { transform: [{ rotate: '-135deg' }] },
});
