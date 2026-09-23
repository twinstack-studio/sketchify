import { useImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

/**
 * A bundled photo (Unsplash, free licence) that shows off every style before
 * the user has picked anything, and lets them try the editor straight away.
 */
const SAMPLE = require('../../assets/sample.jpg');

/** The sample decoded for Skia; null until it has loaded. */
export const useSampleImage = () => useImage(SAMPLE);

/** A file URI for the sample, so it can open in the editor like any photo. */
export async function sampleUri(): Promise<string> {
  const asset = await Asset.fromModule(SAMPLE).downloadAsync();
  return asset.localUri ?? asset.uri;
}
