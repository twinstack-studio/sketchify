import { memo } from 'react';
import type { ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color as palette } from '@/theme';

import { ICON_PATHS, type IconName } from './icons';

export type { IconName };

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill the shape too (hearts and stars when they are "on"). */
  filled?: boolean;
  style?: ViewStyle;
}

/** A Lucide stroke icon (24x24 grid) drawn as SVG. */
export const Icon = memo(function Icon({
  name,
  size = 22,
  color = palette.text,
  strokeWidth = 2,
  filled,
  style,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} pointerEvents="none">
      <Path
        d={ICON_PATHS[name]}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
