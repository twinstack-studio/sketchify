import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
  matchFont,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia';
import { Platform } from 'react-native';

import { effectFor } from './effects';
import { uniformArray, type Adjustments, type StyleId } from './filters';
import { IDENTITY, layout, type Transform } from './transforms';

export async function loadImage(uri: string): Promise<SkImage> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('This photo could not be opened.');
  return image;
}

export interface RenderJob {
  image: SkImage;
  style: StyleId;
  adjustments: Adjustments;
  transform?: Transform;
  /** Long edge of the output in pixels. Never upscales past the source. */
  maxLong: number;
  watermark?: boolean;
}

/** Renders a style offscreen. The caller owns (and must dispose) the result. */
export function renderImage({
  image,
  style,
  adjustments,
  transform = IDENTITY,
  maxLong,
  watermark,
}: RenderJob): SkImage {
  const { width, height, matrix } = layout(image.width(), image.height(), transform, maxLong);
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Not enough graphics memory for this size.');

  const child = image.makeShaderOptions(
    TileMode.Clamp,
    TileMode.Clamp,
    FilterMode.Linear,
    MipmapMode.None,
    Skia.Matrix(matrix),
  );
  const shader = effectFor(style).makeShaderWithChildren(
    uniformArray(width, height, adjustments),
    [child],
  );
  const paint = Skia.Paint();
  paint.setShader(shader);
  const canvas = surface.getCanvas();
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  if (watermark) drawWatermark(canvas, width, height);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  // Pull the pixels off the GPU so the image outlives the surface.
  const result = snapshot.makeNonTextureImage() ?? snapshot;
  if (result !== snapshot) snapshot.dispose();
  paint.dispose();
  shader.dispose();
  child.dispose();
  surface.dispose();
  return result;
}

function drawWatermark(canvas: SkCanvas, width: number, height: number) {
  const size = Math.round(height / 42);
  const font = matchFont({
    fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
    fontSize: size,
    fontWeight: 'bold',
  });
  const text = 'Sketchify';
  const w = font.measureText(text).width;
  const pad = size * 0.9;
  const shadow = Skia.Paint();
  shadow.setColor(Skia.Color('rgba(0,0,0,0.35)'));
  const ink = Skia.Paint();
  ink.setColor(Skia.Color('rgba(255,255,255,0.85)'));
  canvas.drawText(text, width - w - pad + 1, height - pad + 1, shadow, font);
  canvas.drawText(text, width - w - pad, height - pad, ink, font);
}

export type Format = 'png' | 'jpg' | 'webp';

export function encode(image: SkImage, format: Format, quality = 92): Uint8Array {
  const fmt =
    format === 'png' ? ImageFormat.PNG : format === 'webp' ? ImageFormat.WEBP : ImageFormat.JPEG;
  return image.encodeToBytes(fmt, quality);
}

/** A small copy for thumbnails, so fourteen live previews stay cheap. */
export function downscale(image: SkImage, maxLong: number): SkImage {
  return renderImage({
    image,
    style: 'original',
    adjustments: {
      strength: 0,
      detail: 0,
      contrast: 0,
      brightness: 0,
      grain: 0,
      warmth: 0,
      invert: 0,
    },
    maxLong,
  });
}

export function encodeBase64(image: SkImage, format: Format, quality = 92): string {
  const fmt =
    format === 'png' ? ImageFormat.PNG : format === 'webp' ? ImageFormat.WEBP : ImageFormat.JPEG;
  return image.encodeToBase64(fmt, quality);
}
