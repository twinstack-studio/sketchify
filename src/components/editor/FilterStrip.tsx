import type { SkImage } from '@shopify/react-native-skia';
import { memo, useEffect, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { tick } from '@/lib/haptics';
import { FILTERS, type FilterStyle, type StyleId } from '@/skia/filters';
import { encodeBase64, renderImage } from '@/skia/render';
import { color, radius, space } from '@/theme';

const W = 70;
const H = 90;

interface Props {
  thumb: SkImage;
  selected: StyleId;
  onSelect: (id: StyleId) => void;
}

/**
 * Every style rendered against your own photo, at its default settings.
 * Each is rendered once to a small JPEG, so the strip scrolls like a list of
 * pictures instead of running fourteen shaders.
 */
export function FilterStrip({ thumb, selected, onSelect }: Props) {
  const [previews, setPreviews] = useState<Partial<Record<StyleId, string>>>({});
  const list = useRef<FlatList<FilterStyle>>(null);

  useEffect(() => {
    let alive = true;
    // One style per tick keeps the editor responsive while they render.
    (async () => {
      for (const f of FILTERS) {
        await new Promise((r) => setTimeout(r, 0));
        if (!alive) return;
        const img = renderImage({ image: thumb, style: f.id, adjustments: f.defaults, maxLong: H * 2 });
        const uri = `data:image/jpeg;base64,${encodeBase64(img, 'jpg', 82)}`;
        img.dispose();
        if (alive) setPreviews((p) => ({ ...p, [f.id]: uri }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [thumb]);

  useEffect(() => {
    // Bring a style picked elsewhere (the home grid, the camera) into view.
    const index = FILTERS.findIndex((f) => f.id === selected);
    if (index > 3) list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  }, [selected]);

  return (
    <FlatList
      ref={list}
      horizontal
      data={FILTERS}
      keyExtractor={(f) => f.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      getItemLayout={(_, index) => ({ length: ITEM + GAP, offset: space.lg + index * (ITEM + GAP), index })}
      renderItem={({ item }) => (
        <Thumb
          filter={item}
          uri={previews[item.id]}
          active={item.id === selected}
          onPress={() => {
            tick();
            onSelect(item.id);
          }}
        />
      )}
    />
  );
}

const ITEM = W + 8;
const GAP = space.sm;

const Thumb = memo(function Thumb({
  filter,
  uri,
  active,
  onPress,
}: {
  filter: FilterStyle;
  uri?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.item}
      to={0.94}
      accessibilityRole="button"
      accessibilityLabel={`${filter.name} style`}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.ring, active && styles.ringActive]}>
        <View style={styles.frame}>
          {uri ? <Image source={{ uri }} style={styles.image} /> : null}
        </View>
      </View>
      <Text
        variant="caption"
        style={{ color: active ? color.accent : color.muted }}
        align="center"
        numberOfLines={1}
      >
        {filter.name}
      </Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, gap: GAP },
  item: { width: ITEM, alignItems: 'center', gap: 6 },
  ring: {
    padding: 2,
    borderRadius: radius.lg + 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringActive: { borderColor: color.accent },
  frame: {
    width: W,
    height: H,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.raised,
  },
  image: { width: '100%', height: '100%' },
});
