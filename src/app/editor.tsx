import type { SkImage } from '@shopify/react-native-skia';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompareCanvas, type AdjustmentValues } from '@/components/editor/CompareCanvas';
import { FilterStrip } from '@/components/editor/FilterStrip';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip, Segmented } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Slider } from '@/components/ui/Slider';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { saveArtwork } from '@/lib/export';
import { sourceUri } from '@/lib/files';
import { success, tick } from '@/lib/haptics';
import { mimeFor, PermissionDenied, saveToGallery, share } from '@/lib/sharing';
import {
  FILTER_BY_ID,
  SLIDERS,
  type Adjustments,
  type SliderKey,
  type StyleId,
} from '@/skia/filters';
import { downscale, loadImage } from '@/skia/render';
import { ASPECTS, IDENTITY, type Transform } from '@/skia/transforms';
import { useLibrary, type Artwork } from '@/store/library';
import { useSettings } from '@/store/settings';
import { color, family, radius, shadow, space } from '@/theme';

type Panel = 'styles' | 'adjust' | 'crop';

const PANELS = [
  { id: 'styles', label: 'Styles', icon: 'palette' },
  { id: 'adjust', label: 'Adjust', icon: 'sliders' },
  { id: 'crop', label: 'Crop', icon: 'crop' },
] as const satisfies readonly { id: Panel; label: string; icon: IconName }[];

const MORPH = { duration: 450, easing: Easing.out(Easing.cubic) };
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 32));

export default function Editor() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ uri?: string; style?: StyleId; artworkId?: string }>();
  const existing = useLibrary((s) => s.items.find((i) => i.id === params.artworkId));

  // What this session has saved so far; later saves overwrite it.
  const [saved, setSaved] = useState<Artwork | undefined>(existing);
  const source = existing ? sourceUri(existing.source) : params.uri;

  const initialStyle: StyleId =
    existing?.style ?? (params.style && FILTER_BY_ID[params.style] ? params.style : 'graphite');
  const initial: Adjustments = existing?.adjustments ?? FILTER_BY_ID[initialStyle].defaults;

  const [style, setStyle] = useState<StyleId>(initialStyle);
  const [transform, setTransform] = useState<Transform>(existing?.transform ?? IDENTITY);
  const [invert, setInvert] = useState(initial.invert === 1);
  const [panel, setPanel] = useState<Panel>('styles');
  const [compare, setCompare] = useState(false);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [images, setImages] = useState<{ full: SkImage; thumb: SkImage } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  // Anything changed since the last save (or since opening)?
  const [dirty, setDirty] = useState(false);
  const edited = () => setDirty(true);

  const values: AdjustmentValues = {
    strength: useSharedValue(initial.strength),
    detail: useSharedValue(initial.detail),
    contrast: useSharedValue(initial.contrast),
    brightness: useSharedValue(initial.brightness),
    grain: useSharedValue(initial.grain),
    warmth: useSharedValue(initial.warmth),
    invert: useSharedValue(initial.invert),
  };

  // Invert is React state (it drives the Switch); the shader reads the shared value.
  useEffect(() => {
    values.invert.value = withTiming(invert ? 1 : 0, { duration: 200 });
  }, [invert, values.invert]);

  // Leaving with unsaved work asks first (back button, swipe, or the close button).
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert('Discard this sketch?', 'Your changes since the last save will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation, dirty]);

  // Decoded images are freed together when the editor closes, never earlier:
  // a frame may still be drawing from one that was just superseded.
  const owned = useRef<SkImage[]>([]);
  useEffect(() => {
    const list = owned.current;
    return () => {
      for (const img of list) img.dispose();
      list.length = 0;
    };
  }, []);

  useEffect(() => {
    if (!source) {
      setError('No photo was provided.');
      return;
    }
    let alive = true;
    loadImage(source)
      .then((full) => {
        owned.current.push(full);
        const thumb = downscale(full, 240);
        owned.current.push(thumb);
        if (alive) setImages({ full, thumb });
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [source]);

  function selectStyle(id: StyleId) {
    if (id === style) return;
    setStyle(id);
    edited();
    // Ease every slider across so the sketch morphs instead of snapping.
    const d = FILTER_BY_ID[id].defaults;
    for (const { key } of SLIDERS) values[key].value = withTiming(d[key], MORPH);
    setInvert(d.invert === 1);
  }

  function resetAdjustments() {
    tick();
    const d = FILTER_BY_ID[style].defaults;
    for (const { key } of SLIDERS) values[key].value = withTiming(d[key], MORPH);
    setInvert(d.invert === 1);
    edited();
  }

  const adjustments = (): Adjustments => ({
    strength: values.strength.value,
    detail: values.detail.value,
    contrast: values.contrast.value,
    brightness: values.brightness.value,
    grain: values.grain.value,
    warmth: values.warmth.value,
    invert: invert ? 1 : 0,
  });

  async function commit(andShare: boolean) {
    if (!images || !source) return;
    setBusy(andShare ? 'share' : 'save');
    await nextFrame(); // show the spinner before the full-size render blocks the JS thread
    try {
      const { artwork, uri } = saveArtwork({
        image: images.full,
        sourceUri: source,
        style,
        adjustments: adjustments(),
        transform,
        replaces: saved,
      });
      setSaved(artwork);
      setDirty(false);

      let galleryNote = '';
      if (useSettings.getState().saveToGallery) {
        try {
          await saveToGallery([uri]);
          galleryNote = ' and Photos';
        } catch (e) {
          galleryNote = e instanceof PermissionDenied ? ' (Photos access was denied)' : '';
        }
      }
      success();
      if (andShare) await share(uri, mimeFor(artwork.file));
      else
        toast({
          message: `Saved to your gallery${galleryNote}.`,
          action: { label: 'View', onPress: () => router.replace({ pathname: '/viewer', params: { id: artwork.id } }) },
        });
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const onFrame = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFrame({ width: width - space.lg * 2, height: height - space.lg * 2 });
  };

  const rotate = () => {
    tick();
    edited();
    setTransform((t) => ({ ...t, quarterTurns: (t.quarterTurns + 1) % 4 }));
  };
  const flip = () => {
    tick();
    edited();
    setTransform((t) => ({ ...t, flipX: !t.flipX }));
  };
  const resetTransform = () => {
    tick();
    edited();
    setTransform(IDENTITY);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton icon="x" label="Close editor" size={42} onPress={() => router.back()} />
        <View style={styles.titleWrap}>
          <Text variant="overline" tone="faint">
            {saved ? 'Editing' : 'New sketch'}
          </Text>
          <Animated.Text key={style} entering={FadeIn.duration(250)} style={styles.title} numberOfLines={1}>
            {FILTER_BY_ID[style].name}
          </Animated.Text>
        </View>
        <IconButton
          icon="share"
          label="Share"
          size={42}
          disabled={!images || busy !== null}
          onPress={() => commit(true)}
        />
        <Button
          label="Save"
          icon="download"
          size="sm"
          busy={busy === 'save'}
          disabled={!images || busy !== null}
          onPress={() => commit(false)}
          style={styles.save}
        />
      </View>

      <View style={styles.stage} onLayout={onFrame}>
        {error ? (
          <View style={styles.errorBox}>
            <Icon name="info" size={28} color={color.danger} />
            <Text tone="danger" align="center">
              {error}
            </Text>
            <Button label="Go back" variant="secondary" size="sm" onPress={() => router.back()} />
          </View>
        ) : images && frame ? (
          <Animated.View entering={FadeIn.duration(350)} style={[styles.art, shadow.soft]}>
            <CompareCanvas
              image={images.full}
              style={style}
              values={values}
              transform={transform}
              frame={frame}
              compare={compare}
            />
          </Animated.View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={color.accent} />
            <Text variant="caption" tone="muted">
              Opening your photo…
            </Text>
          </View>
        )}
        {images ? (
          <PressableScale
            onPress={() => {
              tick();
              setCompare((c) => !c);
            }}
            style={[styles.compare, compare && styles.compareOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: compare }}
            accessibilityLabel="Compare with the original"
          >
            <Icon name="eye" size={16} color={compare ? color.accentInk : color.text} />
            <Text variant="label" style={{ color: compare ? color.accentInk : color.text }}>
              {compare ? 'Drag to compare' : 'Compare'}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.panel}>
        <Segmented options={PANELS} value={panel} onChange={setPanel} style={styles.segmented} />

        <View style={styles.panelBody}>
          {panel === 'styles' && images ? (
            <Animated.View entering={FadeInDown.duration(220)}>
              <FilterStrip thumb={images.thumb} selected={style} onSelect={selectStyle} />
            </Animated.View>
          ) : null}

          {panel === 'adjust' ? (
            <ScrollView
              style={styles.sliders}
              contentContainerStyle={styles.slidersContent}
              showsVerticalScrollIndicator={false}
            >
              {SLIDERS.map((s) => (
                <Slider
                  key={s.key}
                  label={s.label}
                  value={values[s.key as SliderKey]}
                  min={s.min}
                  max={s.max}
                  resetTo={() => FILTER_BY_ID[style].defaults[s.key]}
                  onChangeEnd={edited}
                />
              ))}
              <View style={styles.switchRow}>
                <View>
                  <Text variant="label">Invert</Text>
                  <Text variant="caption" tone="faint">
                    Light lines on a dark page
                  </Text>
                </View>
                <Switch
                  value={invert}
                  onValueChange={(v) => {
                    tick();
                    edited();
                    setInvert(v);
                  }}
                  trackColor={{ true: color.accent, false: color.line }}
                  thumbColor={color.paper}
                />
              </View>
              <Button
                label={`Reset to ${FILTER_BY_ID[style].name} defaults`}
                icon="rotateCcw"
                variant="ghost"
                size="sm"
                onPress={resetAdjustments}
              />
              <Text variant="caption" tone="faint" align="center">
                Tip: double-tap a slider to reset just that one.
              </Text>
            </ScrollView>
          ) : null}

          {panel === 'crop' ? (
            <Animated.View entering={FadeInDown.duration(220)} style={styles.crop}>
              <View style={styles.tools}>
                <Tool icon="rotateCw" label="Rotate" onPress={rotate} />
                <Tool icon="flip" label="Flip" onPress={flip} active={transform.flipX} />
                <Tool icon="undo" label="Reset" onPress={resetTransform} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.aspects}
              >
                {ASPECTS.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.label}
                    active={transform.aspect === a.id}
                    onPress={() => {
                      edited();
                      setTransform((t) => ({ ...t, aspect: a.id }));
                    }}
                  />
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Tool({
  icon,
  label,
  onPress,
  active,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.tool, active && styles.toolActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={active ? color.accent : color.text} />
      <Text variant="caption" tone={active ? 'accent' : 'muted'}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontFamily: family.serif, fontSize: 21, lineHeight: 26, color: color.text },
  save: { minHeight: 42 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.surface },
  loading: { alignItems: 'center', gap: space.sm },
  errorBox: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xxl },
  compare: {
    position: 'absolute',
    bottom: space.xl + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.glass,
    borderWidth: 1,
    borderColor: color.lineSoft,
  },
  compareOn: { backgroundColor: color.accent, borderColor: color.accent },
  panel: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: color.line,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  segmented: { marginHorizontal: space.lg },
  panelBody: { height: 196, justifyContent: 'center' },
  sliders: { flex: 1 },
  slidersContent: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.lg, gap: space.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  crop: { gap: space.lg },
  tools: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  tool: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: color.raised,
    borderWidth: 1,
    borderColor: color.line,
  },
  toolActive: { borderColor: color.accent, backgroundColor: color.accentSoft },
  aspects: { paddingHorizontal: space.lg, gap: space.sm },
});
