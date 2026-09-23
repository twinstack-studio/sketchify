/**
 * Design tokens. The app is dark-only on purpose: in a creative tool the
 * artwork should be the brightest thing on screen. The palette is a warm
 * "studio at night": charcoal surfaces, paper-cream text, graphite gold.
 */

export const color = {
  bg: '#0C0B0A',
  surface: '#161412',
  raised: '#211E1B',
  line: '#2F2B27',
  lineSoft: 'rgba(255,240,220,0.07)',
  text: '#F6F1E7',
  muted: '#A69E91',
  faint: '#6A645B',
  accent: '#E8B04B', // graphite gold
  accentBright: '#F5C66A',
  accentSoft: 'rgba(232,176,75,0.14)',
  accentInk: '#1A1305',
  danger: '#EF5B5B',
  dangerSoft: 'rgba(239,91,91,0.12)',
  success: '#5BBE72',
  overlay: 'rgba(8,7,6,0.62)',
  glass: 'rgba(28,25,22,0.9)',
  tabBar: '#1B1917',
  paper: '#FBF7EF',
} as const;

export type ColorName = keyof typeof color;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 44 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, pill: 999 } as const;

/** Families are loaded in the root layout; each weight is its own family. */
export const family = {
  serif: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_600SemiBold_Italic',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const font = {
  hero: { fontFamily: family.serif, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 },
  display: { fontFamily: family.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: family.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  heading: { fontFamily: family.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.1 },
  body: { fontFamily: family.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: family.semibold, fontSize: 13, lineHeight: 17, letterSpacing: 0.1 },
  caption: { fontFamily: family.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: family.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
} as const;

export type FontVariant = keyof typeof font;

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  glow: {
    shadowColor: color.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/** Space the floating tab bar takes at the bottom of a tab screen. */
export const TAB_BAR_SPACE = 104;
