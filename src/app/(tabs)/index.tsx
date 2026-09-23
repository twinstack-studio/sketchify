import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BeforeAfter } from '@/components/art/BeforeAfter';
import { StylePreview } from '@/components/art/StylePreview';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Em, Text } from '@/components/ui/Text';
import { artworkUri } from '@/lib/files';
import { tick } from '@/lib/haptics';
import { pickPhoto } from '@/lib/picking';
import { sampleUri, useSampleImage } from '@/lib/sample';
import { FILTERS, FILTER_BY_ID, type StyleId } from '@/skia/filters';
import { useLibrary } from '@/store/library';
import { color, family, radius, shadow, space } from '@/theme';

const STYLES = FILTERS.filter((f) => f.id !== 'original');
const HERO_STYLES: StyleId[] = ['graphite', 'ink', 'watercolour', 'charcoal', 'comic', 'blueprint'];
const GUTTER = space.xl;
const GAP = space.md;

export default function Studio() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const sample = useSampleImage();
  const recent = useLibrary((s) => s.items).slice(0, 8);
  const [trying, setTrying] = useState(false);

  const heroW = Math.min(width, 520) - GUTTER * 2;
  // Short enough that the buttons below stay above the tab bar on small phones.
  const heroH = Math.round(Math.min(heroW * 0.9, height * 0.4));
  const cardW = (heroW - GAP) / 2;

  async function openPhoto(style?: StyleId) {
    try {
      const photo = await pickPhoto();
      if (photo) router.push({ pathname: '/editor', params: { uri: photo.uri, style } });
    } catch (e) {
      Alert.alert('Could not open photos', e instanceof Error ? e.message : String(e));
    }
  }

  async function trySample() {
    setTrying(true);
    try {
      router.push({ pathname: '/editor', params: { uri: await sampleUri(), style: 'graphite' } });
    } catch (e) {
      Alert.alert('Could not open the sample', e instanceof Error ? e.message : String(e));
    } finally {
      setTrying(false);
    }
  }

  return (
    <Screen scroll tabs>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="pencilLine" size={18} color={color.accentInk} strokeWidth={2.4} />
          </View>
          <Text variant="title" style={styles.wordmark}>
            Sketchify
          </Text>
        </View>
        <IconButton icon="user" label="Profile" size={40} onPress={() => router.push('/profile')} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
        <Text variant="overline" tone="accent">
          {STYLES.length} styles · made on your phone
        </Text>
        <Text variant="hero">
          Turn any photo into a <Em>drawing</Em>.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(500)} style={[styles.heroCard, shadow.soft]}>
        <BeforeAfter image={sample} width={heroW} height={heroH} styles={HERO_STYLES} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.actions}>
        <Button
          label="Choose a photo"
          icon="imagePlus"
          size="lg"
          onPress={() => openPhoto()}
          style={styles.flex}
        />
        <IconButton icon="camera" label="Take a photo" size={58} onPress={() => router.push('/camera')} />
      </Animated.View>
      <PressableScale onPress={trySample} disabled={trying} style={styles.sampleLink} hitSlop={8}>
        <Text variant="label" tone="muted">
          No photo handy?{' '}
          <Text variant="label" tone="accent">
            Try the sample
          </Text>
        </Text>
        <Icon name="arrowRight" size={14} color={color.accent} />
      </PressableScale>

      {recent.length > 0 ? (
        <View style={styles.section}>
          <SectionHead title="Recent" action="See all" onAction={() => router.push('/gallery')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.recentRow}
          >
            {recent.map((item) => (
              <PressableScale
                key={item.id}
                style={styles.recent}
                onPress={() => router.push({ pathname: '/viewer', params: { id: item.id } })}
                accessibilityLabel={`Open ${FILTER_BY_ID[item.style].name} sketch`}
              >
                <Image source={{ uri: artworkUri(item.file) }} style={styles.fillImage} />
                <View style={styles.recentTag}>
                  <Text variant="caption" style={styles.small}>
                    {FILTER_BY_ID[item.style].name}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHead title="Pick a style" subtitle="Tap one, then choose your photo." />
        <View style={styles.grid}>
          {STYLES.map((f, i) => (
            <Animated.View key={f.id} entering={FadeInDown.delay(Math.min(i, 6) * 50).duration(420)}>
              <PressableScale
                style={{ width: cardW }}
                onPress={() => {
                  tick();
                  openPhoto(f.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${f.name}: ${f.blurb}`}
              >
                <StylePreview
                  style={f.id}
                  width={cardW}
                  height={cardW * 1.2}
                  radius={radius.xl}
                />
                <View style={styles.cardText}>
                  <Text variant="heading">{f.name}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {f.blurb}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function SectionHead({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.flex}>
        <Text variant="display" style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <PressableScale onPress={onAction} hitSlop={12} style={styles.sectionAction}>
          <Text variant="label" tone="accent">
            {action}
          </Text>
          <Icon name="chevronRight" size={14} color={color.accent} strokeWidth={2.4} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontFamily: family.serif, fontSize: 22, letterSpacing: -0.4 },
  hero: { gap: space.sm, paddingTop: space.xxl },
  heroCard: { marginTop: space.xl, borderRadius: radius.xxl, alignSelf: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  flex: { flex: 1 },
  sampleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.lg,
  },
  section: { marginTop: space.xxxl, gap: space.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  sectionTitle: { fontSize: 26, lineHeight: 32 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 4 },
  bleed: { marginHorizontal: -GUTTER },
  recentRow: { paddingHorizontal: GUTTER, gap: space.md },
  recent: {
    width: 116,
    height: 146,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  fillImage: { width: '100%', height: '100%' },
  recentTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.overlay,
  },
  small: { fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: space.xl },
  cardText: { paddingTop: space.sm, paddingHorizontal: 2, gap: 1 },
});
