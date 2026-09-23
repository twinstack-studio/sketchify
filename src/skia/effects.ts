import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

import { FILTER_BY_ID, type StyleId } from './filters';

const cache = new Map<StyleId, SkRuntimeEffect>();

/** Compiles a style's SkSL once and reuses it everywhere. */
export function effectFor(id: StyleId): SkRuntimeEffect {
  let effect = cache.get(id);
  if (!effect) {
    const compiled = Skia.RuntimeEffect.Make(FILTER_BY_ID[id].sksl);
    if (!compiled) throw new Error(`Style "${id}" failed to compile`);
    effect = compiled;
    cache.set(id, effect);
  }
  return effect;
}
