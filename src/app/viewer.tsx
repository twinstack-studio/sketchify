import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { artworkActions } from '@/lib/artwork-actions';
import { artworkUri } from '@/lib/files';
import { tick } from '@/lib/haptics';
import { FILTER_BY_ID } from '@/skia/filters';
import { useLibrary } from '@/store/library';
import { color, family, radius, space } from '@/theme';

/** A saved sketch full screen; swipe sideways through the gallery. */
export default function Viewer() {
  const router = useRouter();
  const { id, favourites } = useLocalSearchParams<{ id: string; favourites?: string }>();
  const all = useLibrary((s) => s.items);
  const items = useMemo(
    () => (favourites === '1' ? all.filter((i) => i.favourite) : all),
    [all, favourites],
  );
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((i) => i.id === id)));
  const list = useRef<FlatList>(null);

  const item = items[Math.min(index, items.length - 1)];

  if (!item) {
    return (
      <SafeAreaView style={[styles.root, styles.empty]}>
        <Text tone="muted">This sketch is gone.</Text>
        <Button label="Back to gallery" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      tick();
      setIndex(next);
    }
  };

  const date = new Date(item.updatedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="chevronLeft" label="Back" size={42} onPress={() => router.back()} />
        <View style={styles.titles}>
          <Text style={styles.title}>{FILTER_BY_ID[item.style].name}</Text>
          <Text variant="caption" tone="muted">
            {date} · {item.width}×{item.height}
          </Text>
        </View>
        <View style={styles.counter}>
          <Text variant="caption" tone="muted">
            {index + 1} / {items.length}
          </Text>
        </View>
      </View>

      <FlatList
        ref={list}
        data={items}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}
        renderItem={({ item: art }) => (
          <View style={[styles.page, { width }]}>
            <Animated.Image
              entering={FadeIn.duration(250)}
              source={{ uri: artworkUri(art.file) }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
      />

      <View style={styles.actions}>
        <Action icon="heart" label="Favourite" active={item.favourite} onPress={() => artworkActions.toggleFavourite(item)} />
        <Action icon="share" label="Share" onPress={() => artworkActions.share(item)} />
        <Action icon="download" label="Save" onPress={() => artworkActions.saveToPhotos(item)} />
        <Action
          icon="trash"
          label="Delete"
          danger
          onPress={() =>
            artworkActions.confirmDelete(item, () => {
              if (items.length <= 1) router.back();
              else setIndex((i) => Math.min(i, items.length - 2));
            })
          }
        />
      </View>
      <Button
        label="Edit this sketch"
        icon="pencilLine"
        size="lg"
        onPress={() => router.push({ pathname: '/editor', params: { artworkId: item.id } })}
        style={styles.edit}
      />
    </SafeAreaView>
  );
}

function Action({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const tint = danger ? color.danger : active ? color.accent : color.text;
  return (
    <PressableScale
      onPress={() => {
        tick();
        onPress();
      }}
      style={styles.action}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
    >
      <View style={[styles.actionIcon, active && styles.actionActive]}>
        <Icon name={icon} size={20} color={tint} filled={active} />
      </View>
      <Text variant="caption" style={{ color: danger ? color.danger : color.muted }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  empty: { alignItems: 'center', justifyContent: 'center', gap: space.lg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  titles: { flex: 1 },
  title: { fontFamily: family.serif, fontSize: 22, lineHeight: 27, color: color.text },
  counter: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  pager: { flex: 1 },
  page: { flex: 1, padding: space.lg, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: radius.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  action: { alignItems: 'center', gap: 6, minWidth: 64 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  actionActive: { backgroundColor: color.accentSoft, borderColor: color.accent },
  edit: { marginHorizontal: space.xl, marginTop: space.lg, marginBottom: space.sm },
});
