import { useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { BeforeAfter } from '@/components/art/BeforeAfter';
import { StylePreview } from '@/components/art/StylePreview';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Em, Text } from '@/components/ui/Text';
import { success, tick } from '@/lib/haptics';
import { useSampleImage } from '@/lib/sample';
import { FILTERS } from '@/skia/filters';
import { useSettings } from '@/store/settings';
import { color, family, radius, shadow, space } from '@/theme';

const STYLE_COUNT = FILTERS.filter((f) => f.id !== 'original').length;

export default function Onboarding() {
  const router = useRouter();
  const setSettings = useSettings((s) => s.set);
  const { width, height } = useWindowDimensions();
  const sample = useSampleImage();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const artW = Math.min(width - space.xl * 2, 360);
  const artH = Math.min(Math.round(artW * 1.05), Math.round(height * 0.38));

  const pages: { art: ReactNode; title: ReactNode; body: string }[] = [
    {
      art: (
        <View style={[styles.artCard, shadow.soft]}>
          <BeforeAfter
            image={sample}
            width={artW}
            height={artH}
            styles={['graphite', 'watercolour', 'ink', 'comic']}
          />
        </View>
      ),
      title: (
        <>
          Photos become <Em>drawings</Em>.
        </>
      ),
      body: `Pick a photo or take one, then choose from ${STYLE_COUNT} styles: pencil, ink, charcoal, watercolour and more.`,
    },
    {
      art: (
        <View style={[styles.fan, { width: artW, height: artH }]}>
          <StylePreview style="comic" width={artW * 0.5} height={artH * 0.72} radius={radius.xl} viewStyle={[styles.fanCard, { transform: [{ translateX: -artW * 0.24 }, { rotate: '-9deg' }] }]} />
          <StylePreview style="neon" width={artW * 0.5} height={artH * 0.72} radius={radius.xl} viewStyle={[styles.fanCard, { transform: [{ translateX: artW * 0.24 }, { rotate: '9deg' }] }]} />
          <StylePreview style="charcoal" width={artW * 0.56} height={artH * 0.82} radius={radius.xl} viewStyle={[styles.fanCard, shadow.soft]} />
          <View style={[styles.floating, { bottom: artH * 0.04 }]}>
            <Icon name="sliders" size={16} color={color.accentInk} />
            <Text variant="label" tone="accentInk">
              Live sliders
            </Text>
          </View>
        </View>
      ),
      title: (
        <>
          Make it <Em>yours</Em>.
        </>
      ),
      body: 'Adjust strength, detail, contrast and grain with live sliders. Crop, rotate and compare with the original.',
    },
    {
      art: (
        <View style={[styles.privacy, { width: artW, height: artH }]}>
          <StylePreview style="blueprint" width={artW} height={artH} radius={radius.xxl} />
          <View style={styles.shieldWrap}>
            <View style={[styles.shield, shadow.glow]}>
              <Icon name="shieldCheck" size={42} color={color.accentInk} strokeWidth={2.2} />
            </View>
            <View style={styles.floatingStatic}>
              <Text variant="label">No uploads · works offline</Text>
            </View>
          </View>
        </View>
      ),
      title: (
        <>
          Private by <Em>default</Em>.
        </>
      ),
      body: 'Everything renders on your phone. Your photos are never uploaded unless you turn on cloud backup.',
    },
  ];
  const last = page === pages.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      tick();
      setPage(next);
    }
  }

  function finish() {
    success();
    setSettings({ onboarded: true });
    router.replace('/');
  }

  function next() {
    if (last) return finish();
    // Set the page here too: programmatic scrolls do not always report back.
    setPage(page + 1);
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="pencilLine" size={15} color={color.accentInk} strokeWidth={2.4} />
          </View>
          <Text style={styles.wordmark}>Sketchify</Text>
        </View>
        {!last ? (
          <PressableScale onPress={finish} hitSlop={12} accessibilityRole="button">
            <Text variant="label" tone="muted">
              Skip
            </Text>
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pages}
      >
        {pages.map((p, i) => (
          <View key={i} style={[styles.page, { width }]}>
            <Animated.View entering={FadeIn.duration(500)} style={styles.art}>
              {p.art}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.copy}>
              <Text variant="hero" style={styles.title}>
                {p.title}
              </Text>
              <Text tone="muted" style={styles.body}>
                {p.body}
              </Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={last ? 'Start sketching' : 'Next'}
          icon={last ? 'sparkles' : 'arrowRight'}
          size="lg"
          onPress={next}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    minHeight: 44,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontFamily: family.serif, fontSize: 19, color: color.text },
  pages: { flex: 1 },
  page: { paddingHorizontal: space.xl, justifyContent: 'center', gap: space.xxl },
  art: { alignItems: 'center' },
  artCard: { borderRadius: radius.xxl },
  copy: { gap: space.md },
  title: { fontSize: 34, lineHeight: 40 },
  body: { fontSize: 16, lineHeight: 24 },
  fan: { alignItems: 'center', justifyContent: 'center' },
  fanCard: { position: 'absolute', borderWidth: 3, borderColor: color.bg },
  floating: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  privacy: { alignItems: 'center', justifyContent: 'center' },
  shieldWrap: { position: 'absolute', alignItems: 'center', gap: space.md },
  shield: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
    borderWidth: 6,
    borderColor: 'rgba(12,11,10,0.35)',
  },
  floatingStatic: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.glass,
  },
  bottom: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.xl },
  dots: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: color.line },
  dotActive: { width: 26, backgroundColor: color.accent },
  button: { alignSelf: 'stretch' },
});
