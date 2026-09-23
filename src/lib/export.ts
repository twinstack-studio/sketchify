import type { SkImage } from '@shopify/react-native-skia';

import type { Adjustments, StyleId } from '@/skia/filters';
import { encode, renderImage } from '@/skia/render';
import type { Transform } from '@/skia/transforms';
import { newId, useLibrary, type Artwork } from '@/store/library';
import { useSettings } from '@/store/settings';

import { artworkUri, deleteArtwork, keepSource, writeArtwork } from './files';

interface SaveArgs {
  image: SkImage;
  /** Where the source photo currently is (picker, camera, or our own copy). */
  sourceUri: string;
  style: StyleId;
  adjustments: Adjustments;
  transform: Transform;
  /** Re-editing an existing piece overwrites it instead of adding a new one. */
  replaces?: Artwork;
}

/** Renders at the export resolution, writes the file and records it in the library. */
export function saveArtwork({
  image,
  sourceUri,
  style,
  adjustments,
  transform,
  replaces,
}: SaveArgs): { artwork: Artwork; uri: string } {
  const { format, resolution, watermark } = useSettings.getState();
  const rendered = renderImage({ image, style, adjustments, transform, maxLong: resolution, watermark });
  try {
    const id = replaces?.id ?? newId();
    // A fresh file name per save, so image caches never show a stale version.
    const file = `${id}-${Date.now().toString(36)}.${format}`;
    const uri = writeArtwork(file, encode(rendered, format));
    const source = replaces?.source ?? keepSource(sourceUri, `${id}.src`);
    if (replaces) deleteArtwork(replaces.file);

    const now = Date.now();
    const artwork: Artwork = {
      id,
      file,
      source,
      width: rendered.width(),
      height: rendered.height(),
      style,
      adjustments,
      transform,
      favourite: replaces?.favourite ?? false,
      createdAt: replaces?.createdAt ?? now,
      updatedAt: now,
    };
    useLibrary.getState().upsert(artwork);
    return { artwork, uri };
  } finally {
    rendered.dispose();
  }
}

export { artworkUri };
