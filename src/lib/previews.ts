import type { ImageSourcePropType } from 'react-native';

import type { StyleId } from '@/skia/filters';

/** Each style on the sample photo, made by `npm run make-previews`. */
export const PREVIEWS: Record<StyleId, ImageSourcePropType> = {
  original: require('../../assets/previews/original.jpg'),
  graphite: require('../../assets/previews/graphite.jpg'),
  pencil: require('../../assets/previews/pencil.jpg'),
  ink: require('../../assets/previews/ink.jpg'),
  charcoal: require('../../assets/previews/charcoal.jpg'),
  crosshatch: require('../../assets/previews/crosshatch.jpg'),
  stipple: require('../../assets/previews/stipple.jpg'),
  blueprint: require('../../assets/previews/blueprint.jpg'),
  noir: require('../../assets/previews/noir.jpg'),
  sepia: require('../../assets/previews/sepia.jpg'),
  comic: require('../../assets/previews/comic.jpg'),
  cel: require('../../assets/previews/cel.jpg'),
  watercolour: require('../../assets/previews/watercolour.jpg'),
  neon: require('../../assets/previews/neon.jpg'),
};
