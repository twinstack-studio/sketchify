import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { StylePreview } from '@/components/art/StylePreview';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { artworkUri } from '@/lib/files';
import { success, tick } from '@/lib/haptics';
import { exportPdf } from '@/lib/pdf';
import { pickPhotos } from '@/lib/picking';
import { PermissionDenied, saveToGallery, share } from '@/lib/sharing';
import { FILTERS, FILTER_BY_ID } from '@/skia/filters';
import { useBatch, type BatchJob } from '@/store/batch';
import { useLibrary, type Artwork } from '@/store/library';
import { color, radius, space } from '@/theme';

const STYLES = FILTERS.filter((f) => f.id !== 'original');
const GUTTER = space.xl;

export default function Batch() {
  const { jobs, style, running, setStyle, add, removeJob, clear, run, cancel } = useBatch();
  const library = useLibrary((s) => s.items);
  const { width } = useWindowDimensions();
  const [exporting, setExporting] = useState<'gallery' | 'pdf' | null>(null);

  const done = jobs.filter((j) => j.status === 'done');
  const failed = jobs.filter((j) => j.status === 'failed');
  const results = done
    .map((j) => library.find((a) => a.id === j.artworkId))
    .filter((a): a is Artwork => !!a);
  const finished = done.length + failed.length;
  const progress = jobs.length ? finished / jobs.length : 0;
  const remaining = jobs.length - done.length;
  const idle = !running && exporting === null;
  const cell = (Math.min(width, 560) - GUTTER * 2 - space.sm * 2) / 3;

  async function addPhotos() {
    try {
      const photos = await pickPhotos(60);
      if (photos.length) add(photos);
    } catch (e) {
      Alert.alert('Could not open photos', e instanceof Error ? e.message : String(e));
    }
  }

  async function saveAll() {
    setExporting('gallery');
    try {
      await saveToGallery(results.map((a) => artworkUri(a.file)));
      success();
      toast({ message: `${results.length} sketches saved to Photos.`, icon: 'download' });
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof PermissionDenied ? e.message : e instanceof Error ? e.message : String(e),
      );
    } finally {
      setExporting(null);
    }
  }

  async function savePdf() {
    setExporting('pdf');
    try {
      const uri = await exportPdf(results, 'Sketchify batch');
      success();
      await share(uri, 'application/pdf');
    } catch (e) {
      Alert.alert('Could not make the PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
    }
  }

  return (
    <Screen scroll tabs>
      <ScreenHeader
        overline="Many at once"
        title="Batch"
        subtitle="Sketch a whole album in one style. Every result also lands in your gallery."
      />

      <Text variant="overline" tone="muted" style={styles.caption}>
        Style · {FILTER_BY_ID[style].name}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.styleRow}
      >
        {STYLES.map((f) => {
          const active = f.id === style;
          return (
            <PressableScale
              key={f.id}
              disabled={running}
              onPress={() => {
                tick();
                setStyle(f.id);
              }}
              style={[styles.styleItem, running && !active && styles.dim]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: running }}
              accessibilityLabel={`${f.name} style`}
            >
              <View style={[styles.ring, active && styles.ringActive]}>
                <StylePreview style={f.id} width={68} height={86} radius={radius.md} />
              </View>
              <Text variant="caption" style={{ color: active ? color.accent : color.muted }} numberOfLines={1}>
                {f.name}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {jobs.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <PressableScale onPress={addPhotos} style={styles.drop} accessibilityRole="button" accessibilityLabel="Choose photos">
            <View style={styles.dropIcon}>
              <Icon name="imagePlus" size={28} color={color.accentInk} />
            </View>
            <Text variant="title">Choose photos</Text>
            <Text variant="caption" tone="muted" align="center">
              Up to 60 at a time. They are sketched in {FILTER_BY_ID[style].name}, one after another.
            </Text>
          </PressableScale>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
          <View style={styles.progressHead}>
            <View style={styles.flex}>
              <Text variant="title">
                {running ? 'Sketching…' : finished === jobs.length ? 'All done' : 'Ready'}
              </Text>
              <Text variant="caption" tone="muted">
                {done.length} of {jobs.length} sketched
                {failed.length ? ` · ${failed.length} failed` : ''}
              </Text>
            </View>
            <Text variant="display" style={styles.percent}>
              {Math.round(progress * 100)}
              <Text variant="label" tone="muted">
                %
              </Text>
            </Text>
          </View>
          <Progress value={progress} />

          <View style={styles.row}>
            <Button
              label="Add more"
              icon="plus"
              variant="secondary"
              onPress={addPhotos}
              disabled={!idle}
              style={styles.flex}
            />
            {running ? (
              <Button label="Stop" variant="danger" onPress={cancel} style={styles.flex} />
            ) : (
              <Button
                label={remaining === 0 ? 'Done' : `Sketch ${remaining}`}
                icon="wandSparkles"
                onPress={run}
                disabled={!idle || remaining === 0}
                style={styles.flex}
              />
            )}
          </View>

          {results.length > 0 && !running ? (
            <View style={styles.row}>
              <Button
                label="Save all"
                icon="download"
                variant="ghost"
                size="sm"
                busy={exporting === 'gallery'}
                disabled={!idle}
                onPress={saveAll}
                style={styles.flex}
              />
              <Button
                label="Export PDF"
                icon="fileText"
                variant="ghost"
                size="sm"
                busy={exporting === 'pdf'}
                disabled={!idle}
                onPress={savePdf}
                style={styles.flex}
              />
            </View>
          ) : null}
        </Animated.View>
      )}

      {jobs.length > 0 ? (
        <>
          <View style={styles.listHead}>
            <Text variant="overline" tone="muted">
              Queue · {jobs.length}
            </Text>
            {idle ? (
              <PressableScale onPress={clear} hitSlop={10}>
                <Text variant="label" tone="accent">
                  Clear
                </Text>
              </PressableScale>
            ) : null}
          </View>
          <View style={styles.grid}>
            {jobs.map((job) => (
              <JobCell
                key={job.id}
                job={job}
                size={cell}
                artwork={library.find((a) => a.id === job.artworkId)}
                removable={!running && job.status !== 'working'}
                onRemove={() => removeJob(job.id)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Progress({ value }: { value: number }) {
  const [trackW, setTrackW] = useState(0);
  const fill = useAnimatedStyle(() => ({ width: withTiming(value * trackW, { duration: 350 }) }));
  return (
    <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

function JobCell({
  job,
  size,
  artwork,
  removable,
  onRemove,
}: {
  job: BatchJob;
  size: number;
  artwork?: Artwork;
  removable: boolean;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.job, { width: size, height: size * 1.2 }]}>
      <Image
        source={{ uri: artwork ? artworkUri(artwork.file) : job.uri }}
        style={[styles.jobImage, job.status === 'queued' && styles.queued]}
      />
      {job.status === 'working' ? (
        <View style={styles.jobOverlay}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}
      {job.status === 'done' ? (
        <View style={[styles.badge, styles.badgeDone]}>
          <Icon name="check" size={12} color={color.accentInk} strokeWidth={3} />
        </View>
      ) : null}
      {job.status === 'failed' ? (
        <View style={styles.jobOverlay}>
          <Icon name="info" size={20} color={color.danger} />
          <Text variant="caption" tone="danger" numberOfLines={2} align="center">
            {job.error ?? 'Failed'}
          </Text>
        </View>
      ) : null}
      {removable ? (
        <PressableScale onPress={onRemove} hitSlop={8} style={styles.remove} accessibilityLabel={`Remove ${job.name}`}>
          <Icon name="x" size={12} color={color.text} strokeWidth={2.6} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { marginBottom: space.md },
  bleed: { marginHorizontal: -GUTTER },
  styleRow: { paddingHorizontal: GUTTER, gap: space.md },
  styleItem: { alignItems: 'center', gap: 6, width: 78 },
  dim: { opacity: 0.4 },
  ring: { padding: 2, borderRadius: radius.md + 4, borderWidth: 2, borderColor: 'transparent' },
  ringActive: { borderColor: color.accent },
  drop: {
    marginTop: space.xl,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.faint,
    backgroundColor: color.surface,
  },
  dropIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
    marginBottom: space.sm,
  },
  card: {
    marginTop: space.xl,
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  progressHead: { flexDirection: 'row', alignItems: 'flex-end' },
  percent: { fontSize: 34, lineHeight: 38 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.raised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: color.accent },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  job: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.surface },
  jobImage: { width: '100%', height: '100%' },
  queued: { opacity: 0.45 },
  jobOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: color.overlay,
  },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: color.accent },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.overlay,
  },
});
