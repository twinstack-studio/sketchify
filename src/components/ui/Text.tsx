import { Text as RNText, type TextProps } from 'react-native';

import { color, family, font, type FontVariant } from '@/theme';

type Tone = 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'accentInk' | 'success' | 'paper';

interface Props extends TextProps {
  variant?: FontVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', tone = 'text', align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[font[variant], { color: color[tone], textAlign: align }, style]}
    />
  );
}

/** An italic serif accent inside a heading: "Turn any photo into a <Em>drawing</Em>." */
export function Em({ children, tone = 'accent' }: { children: string; tone?: Tone }) {
  return <RNText style={{ fontFamily: family.serifItalic, color: color[tone] }}>{children}</RNText>;
}
