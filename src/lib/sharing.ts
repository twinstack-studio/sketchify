import type { Asset } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const ALBUM = 'Sketchify';

export class PermissionDenied extends Error {
  constructor() {
    super('Allow photo access in Settings to save sketches to your gallery.');
  }
}

/** Saves files to the photo library, into a "Sketchify" album where supported. */
export async function saveToGallery(uris: string[]) {
  // Loaded on first use: the module has no web build, and the web preview
  // should still open every screen.
  const { Asset, Album, requestPermissionsAsync } =
    require('expo-media-library') as typeof import('expo-media-library');
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) throw new PermissionDenied();

  const assets: Asset[] = [];
  for (const uri of uris) assets.push(await Asset.create(uri));

  // Albums need broader access than "add only"; saving to the roll is enough.
  try {
    const existing = await Album.get(ALBUM);
    if (existing) await existing.add(assets);
    else await Album.create(ALBUM, assets);
  } catch {
    // Not fatal: the photos are already in the library.
  }
}

export async function share(uri: string, mimeType?: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Share sketch' });
}

export const mimeFor = (file: string) =>
  file.endsWith('.png')
    ? 'image/png'
    : file.endsWith('.webp')
      ? 'image/webp'
      : file.endsWith('.pdf')
        ? 'application/pdf'
        : 'image/jpeg';
