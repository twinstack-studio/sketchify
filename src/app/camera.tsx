import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StylePreview } from '@/components/art/StylePreview';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { tap, tick } from '@/lib/haptics';
import { pickPhoto } from '@/lib/picking';
import { FILTERS, FILTER_BY_ID, type StyleId } from '@/skia/filters';
import { color, radius, space } from '@/theme';

const STYLES = FILTERS.filter((f) => f.id !== 'original');

/**
 * Pick the style first, then shoot; the capture opens straight into the editor
 * with that style applied. There is deliberately no live filtered viewfinder:
 * expo-camera has no frame-processor API to run a shader on the feed.
 */
export default function Camera() {
  const router = useRouter();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [style, setStyle] = useState<StyleId>('graphite');
  const [ready, setReady] = useState(false);
  const [shooting, setShooting] = useState(false);

  async function capture() {
    if (!camera.current || !ready || shooting) return;
    setShooting(true);
    tap();
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      if (photo?.uri) router.replace({ pathname: '/editor', params: { uri: photo.uri, style } });
    } catch (e) {
      Alert.alert('Could not take the photo', e instanceof Error ? e.message : String(e));
    } finally {
      setShooting(false);
    }
  }

  async function fromLibrary() {
    try {
      const photo = await pickPhoto();
      if (photo) router.replace({ pathname: '/editor', params: { uri: photo.uri, style } });
    } catch (e) {
      Alert.alert('Could not open photos', e instanceof Error ? e.message : String(e));
    }
  }

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <View style={styles.permIcon}>
          <Icon name="camera" size={34} color={color.accentInk} />
        </View>
        <Text variant="display" align="center">
          Camera access
        </Text>
        <Text tone="muted" align="center" style={styles.permissionText}>
          Sketchify needs the camera to take a photo to sketch. Photos stay on your phone.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Allow camera" icon="camera" size="lg" onPress={requestPermission} style={styles.permButton} />
        ) : (
          <Button label="Open Settings" size="lg" onPress={() => Linking.openSettings()} style={styles.permButton} />
        )}
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={() => setReady(true)}
        onMountError={(e) => Alert.alert('Camera unavailable', e.message)}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <IconButton icon="x" label="Close camera" variant="glass" onPress={() => router.back()} />
          <View style={styles.stylePill}>
            <Icon name="sparkles" size={14} color={color.accent} />
            <Text variant="label">{FILTER_BY_ID[style].name}</Text>
          </View>
          <View style={styles.spacer} />
        </View>

        <View style={styles.bottom}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styles}
          >
            {STYLES.map((f) => {
              const active = f.id === style;
              return (
                <PressableScale
                  key={f.id}
                  to={0.92}
                  onPress={() => {
                    tick();
                    setStyle(f.id);
                  }}
                  style={styles.styleItem}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${f.name} style`}
                >
                  <View style={[styles.ring, active && styles.ringActive]}>
                    <StylePreview style={f.id} width={52} height={52} radius={26} />
                  </View>
                  <Text variant="caption" style={[styles.styleName, active && styles.styleNameActive]} numberOfLines={1}>
                    {f.name}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          <View style={styles.controls}>
            <IconButton icon="image" label="Choose from photos" variant="glass" size={52} onPress={fromLibrary} />
            <PressableScale
              onPress={capture}
              disabled={!ready || shooting}
              to={0.9}
              style={styles.shutter}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <Animated.View entering={FadeIn} style={[styles.shutterInner, shooting && styles.shutterBusy]} />
            </PressableScale>
            <IconButton
              icon="switchCamera"
              label="Switch camera"
              variant="glass"
              size={52}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md },
  permIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
    marginBottom: space.md,
  },
  permissionText: { marginBottom: space.lg },
  permButton: { alignSelf: 'stretch' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space.lg,
  },
  spacer: { width: 44 },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.glass,
  },
  bottom: {
    gap: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  styles: { paddingHorizontal: space.lg, gap: space.md },
  styleItem: { alignItems: 'center', gap: 4, width: 64 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  ringActive: { borderColor: color.accent },
  styleName: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  styleNameActive: { color: color.accent },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: color.accent },
  shutterBusy: { opacity: 0.5 },
});
