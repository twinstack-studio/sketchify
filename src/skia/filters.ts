import { SKSL, type StyleId } from './sksl.ts';

/** The six sliders plus invert. Every style reads the same set. */
export interface Adjustments {
  strength: number; // 0..1  blend from the photo to the style
  detail: number; // 0..1  finer lines, smaller cells
  contrast: number; // -1..1
  brightness: number; // -1..1
  grain: number; // 0..1  paper grain
  warmth: number; // -1..1 cool to warm
  invert: number; // 0 or 1
}

export type SliderKey = Exclude<keyof Adjustments, 'invert'>;

export const SLIDERS: { key: SliderKey; label: string; min: number; max: number }[] = [
  { key: 'strength', label: 'Strength', min: 0, max: 1 },
  { key: 'detail', label: 'Detail', min: 0, max: 1 },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1 },
  { key: 'brightness', label: 'Brightness', min: -1, max: 1 },
  { key: 'grain', label: 'Grain', min: 0, max: 1 },
  { key: 'warmth', label: 'Warmth', min: -1, max: 1 },
];

export interface FilterStyle {
  id: StyleId;
  name: string;
  blurb: string;
  sksl: string;
  defaults: Adjustments;
}

const base: Adjustments = {
  strength: 1,
  detail: 0.5,
  contrast: 0,
  brightness: 0,
  grain: 0,
  warmth: 0,
  invert: 0,
};

const style = (
  id: StyleId,
  name: string,
  blurb: string,
  overrides: Partial<Adjustments> = {},
): FilterStyle => ({ id, name, blurb, sksl: SKSL[id], defaults: { ...base, ...overrides } });

export const FILTERS: FilterStyle[] = [
  style('original', 'Original', 'Your photo, untouched', { strength: 0 }),
  style('graphite', 'Graphite', 'Soft colour-dodge pencil', { grain: 0.15 }),
  style('pencil', 'Pencil', 'Crisp line art', { detail: 0.55 }),
  style('ink', 'Ink', 'Fine pen outlines', { detail: 0.6 }),
  style('charcoal', 'Charcoal', 'Heavy, smudged strokes', { grain: 0.25, contrast: 0.1 }),
  style('crosshatch', 'Cross-hatch', 'Tone built from lines'),
  style('stipple', 'Stipple', 'Tone built from dots'),
  style('blueprint', 'Blueprint', 'White lines on blue'),
  style('noir', 'Noir', 'High-contrast black and white', { grain: 0.2 }),
  style('sepia', 'Sepia', 'Aged, warm sketch', { grain: 0.2 }),
  style('comic', 'Comic', 'Halftone and bold ink'),
  style('cel', 'Cel', 'Flat animation shading'),
  style('watercolour', 'Watercolour', 'Loose washes on paper'),
  style('neon', 'Neon', 'Glowing edges in the dark', { contrast: 0.1 }),
];

export const FILTER_BY_ID = Object.fromEntries(FILTERS.map((f) => [f.id, f])) as Record<
  StyleId,
  FilterStyle
>;

/** Uniform values in the exact declaration order of the shared SkSL block. */
export function uniformArray(width: number, height: number, a: Adjustments): number[] {
  return [
    width,
    height,
    a.strength,
    a.detail,
    a.contrast,
    a.brightness,
    a.grain,
    a.warmth,
    a.invert,
  ];
}

export type { StyleId };

/** The same values keyed by uniform name, for declarative `<Shader uniforms>`. */
export function uniformObject(width: number, height: number, a: Adjustments) {
  return {
    resolution: [width, height],
    strength: a.strength,
    detail: a.detail,
    contrast: a.contrast,
    brightness: a.brightness,
    grain: a.grain,
    warmth: a.warmth,
    invert: a.invert,
  };
}
