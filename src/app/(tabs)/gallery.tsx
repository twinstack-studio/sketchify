import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { StylePreview } from '@/components/art/StylePreview';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { artworkActions } from '@/lib/artwork-actions';
import { artworkUri } from '@/lib/files';
import { success, tick } from '@/lib/haptics';
import { exportPdf } from '@/lib/pdf';
import { share } from '@/lib/sharing';
import { FILTER_BY_ID } from '@/skia/filters';
import { useLibrary, type Artwork } from '@/store/library';
import { color, radius, space } from '@/theme';

type Filter = 'all' | 'favourites';
const GAP = space.md;

export default function Gallery() {
  const router = useRouter();
  const items = useLibrary((s) => s.items);
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [exporting, setExporting] = useState(false);
  const [menu, setMenu] = useState<Artwork | null>(null);

  const shown = filter === 'favourites' ? items.filter((i) => i.favourite) : items;
  const favCount = items.filter((i) => i.favourite).length;
  const colW = (Math.min(width, 560) - space.xl * 2 - GAP) / 2;
  const columns = masonry(shown, colW);

  async function pdfAll() {
    setExporting(true);
    try {
      const uri = await exportPdf(shown, 'Sketchify');
      success();
      await share(uri, 'application/pdf');
    } catch (e) {
      Alert.alert('Could not make the PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  const open = (item: Artwork) =>
    router.push({
      pathname: '/viewer',
      params: { id: item.id, favourites: filter === 'favourites' ? '1' : undefined },
    });

  return (
    <Screen scroll tabs>
      <ScreenHeader
        overline="Your work"
        title="Gallery"
        subtitle={
          items.length === 0
            ? undefined
            : `${items.length} ${items.length === 1 ? 'sketch' : 'sketches'}, kept on this phone.`
        }
        right={
          items.length > 0 ? (
            <IconButton
              icon="fileText"
              label="Export as PDF"
              size={44}
              disabled={exporting || shown.length === 0}
              onPress={pdfAll}
            />
          ) : null
        }
      />

      {items.length > 0 ? (
        <Segmented
          options={[
            { id: 'all', label: `All · ${items.length}`, icon: 'images' },
            { id: 'favourites', label: `Favourites · ${favCount}`, icon: 'heart' },
          ]}
          value={filter}
          onChange={setFilter}
          style={styles.segmented}
        />
      ) : null}

      {exporting ? (
        <View style={styles.exporting}>
          <Icon name="fileText" size={16} color={color.accent} />
          <Text variant="caption" tone="muted">
            Making your PDF…
          </Text>
        </View>
      ) : null}

      {shown.length === 0 ? (
        items.length === 0 ? (
          <EmptyGallery onStart={() => router.push('/')} />
        ) : (
          <View style={styles.emptyFav}>
            <View style={styles.emptyIcon}>
              <Icon name="heart" size={26} color={color.accent} />
            </View>
            <Text variant="title" align="center">
              No favourites yet
            </Text>
            <Text tone="muted" align="center">
              Open a sketch and tap the heart to keep it here.
            </Text>
          </View>
        )
      ) : (
        <View style={styles.columns}>
          {columns.map((col, c) => (
            <View key={c} style={styles.column}>
              {col.map(({ item, height }, i) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(i * 2 + c, 8) * 40).duration(380)}>
                  <PressableScale
                    style={[styles.cell, { width: colW, height }]}
                    onPress={() => {
                      tick();
                      open(item);
                    }}
                    onLongPress={() => {
                      tick();
                      setMenu(item);
                    }}
                    accessibilityLabel={`${FILTER_BY_ID[item.style].name} sketch${item.favourite ? ', favourite' : ''}`}
                    accessibilityHint="Long-press for options"
                  >
                    <Image source={{ uri: artworkUri(item.file) }} style={styles.image} />
                    <View style={styles.cellFoot}>
                      <View style={styles.tag}>
                        <Text variant="caption" style={styles.tagText}>
                          {FILTER_BY_ID[item.style].name}
                        </Text>
                      </View>
                      {item.favourite ? (
                        <View style={styles.fav}>
                          <Icon name="heart" size={13} color={color.accent} filled />
                        </View>
                      ) : null}
                    </View>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          ))}
        </View>
      )}

      {shown.length > 0 ? (
        <Text variant="caption" tone="faint" align="center" style={styles.hint}>
          Tap to view · long-press for more
        </Text>
      ) : null}

      <Sheet
        visible={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? `${FILTER_BY_ID[menu.style].name} sketch` : undefined}
        subtitle={menu ? new Date(menu.updatedAt).toLocaleString() : undefined}
        actions={
          menu
            ? [
                {
                  icon: 'pencilLine',
                  label: 'Edit',
                  onPress: () => router.push({ pathname: '/editor', params: { artworkId: menu.id } }),
                },
                { icon: 'share', label: 'Share', onPress: () => artworkActions.share(menu) },
                { icon: 'download', label: 'Save to Photos', onPress: () => artworkActions.saveToPhotos(menu) },
                {
                  icon: 'heart',
                  label: menu.favourite ? 'Remove from favourites' : 'Add to favourites',
                  onPress: () => artworkActions.toggleFavourite(menu),
                },
                { icon: 'trash', label: 'Delete', destructive: true, onPress: () => artworkActions.confirmDelete(menu) },
              ]
            : []
        }
      />
    </Screen>
  );
}

/** Splits items into two columns, each going to whichever is shorter. */
function masonry(items: Artwork[], colW: number) {
  const cols: { item: Artwork; height: number }[][] = [[], []];
  const heights = [0, 0];
  for (const item of items) {
    // Keep extreme panoramas and tall strips readable.
    const ratio = Math.min(Math.max(item.height / Math.max(item.width, 1), 0.7), 1.6);
    const height = Math.round(colW * ratio);
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push({ item, height });
    heights[c] += height + GAP;
  }
  return cols;
}

function EmptyGallery({ onStart }: { onStart: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(450)} style={styles.empty}>
      <View style={styles.fan}>
        <StylePreview style="watercolour" width={104} height={132} radius={radius.lg} viewStyle={[styles.fanCard, styles.fanLeft]} />
        <StylePreview style="charcoal" width={104} height={132} radius={radius.lg} viewStyle={[styles.fanCard, styles.fanRight]} />
        <StylePreview style="graphite" width={116} height={146} radius={radius.lg} viewStyle={styles.fanCard} />
      </View>
      <Text variant="display" align="center" style={styles.emptyTitle}>
        Your wall is empty
      </Text>
      <Text tone="muted" align="center">
        Every sketch you save lands here. Pick a photo in the Studio to make the first one.
      </Text>
      <Button label="Go to Studio" icon="pencilLine" onPress={onStart} style={styles.emptyButton} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  segmented: { marginBottom: space.lg },
  exporting: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  columns: { flexDirection: 'row', gap: GAP, alignSelf: 'center' },
  column: { gap: GAP },
  cell: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.surface },
  image: { width: '100%', height: '100%' },
  cellFoot: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.overlay,
  },
  tagText: { fontSize: 11 },
  fav: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.overlay,
  },
  hint: { marginTop: space.xl },
  empty: { alignItems: 'center', gap: space.md, paddingTop: space.xl },
  fan: { width: 260, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  fanCard: { position: 'absolute', borderWidth: 3, borderColor: color.surface },
  fanLeft: { transform: [{ translateX: -62 }, { rotate: '-10deg' }, { translateY: 10 }] },
  fanRight: { transform: [{ translateX: 62 }, { rotate: '10deg' }, { translateY: 10 }] },
  emptyTitle: { fontSize: 28, lineHeight: 34 },
  emptyButton: { marginTop: space.md, alignSelf: 'stretch' },
  emptyFav: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
    marginBottom: space.sm,
  },
});
