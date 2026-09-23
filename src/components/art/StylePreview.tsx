import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PREVIEWS } from '@/lib/previews';
import type { StyleId } from '@/skia/filters';
import { color } from '@/theme';

interface Props {
  style: StyleId;
  width: number;
  height: number;
  radius?: number;
  viewStyle?: StyleProp<ViewStyle>;
}

/**
 * A style shown on the sample photo. These are pre-rendered images, not live
 * shaders, so a grid of thirteen costs nothing to draw.
 */
export function StylePreview({ style, width, height, radius = 0, viewStyle }: Props) {
  return (
    <View style={[styles.box, { width, height, borderRadius: radius }, viewStyle]}>
      <Image source={PREVIEWS[style]} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: color.raised },
  image: { width: '100%', height: '100%' },
});
