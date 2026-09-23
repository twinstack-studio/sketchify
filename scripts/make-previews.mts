/// <reference types="node" />
/**
 * Renders every style on the bundled sample photo into assets/previews/,
 * so style pickers show real results without running 13 shaders at once.
 *
 *   npm run make-previews
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { FILTERS, uniformArray } from '../src/skia/filters.ts';

const W = 360;
const H = 432;

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const CK = await CanvasKitInit({
  locateFile: (f: string) => require.resolve(`canvaskit-wasm/bin/full/${f}`),
});

const image = CK.MakeImageFromEncoded(readFileSync('assets/sample.jpg'));
if (!image) throw new Error('could not decode assets/sample.jpg');

// Cover-fit the photo into W x H.
const s = Math.max(W / image.width(), H / image.height());
const tx = (W - image.width() * s) / 2;
const ty = (H - image.height() * s) / 2;
const matrix = [s, 0, tx, 0, s, ty, 0, 0, 1];

mkdirSync('assets/previews', { recursive: true });
for (const f of FILTERS) {
  const effect = CK.RuntimeEffect.Make(f.sksl);
  if (!effect) throw new Error(`${f.id} failed to compile`);
  const child = image.makeShaderOptions(
    CK.TileMode.Clamp, CK.TileMode.Clamp, CK.FilterMode.Linear, CK.MipmapMode.None, matrix,
  );
  const shader = effect.makeShaderWithChildren(uniformArray(W, H, f.defaults), [child]);
  const surface = CK.MakeSurface(W, H)!;
  const paint = new CK.Paint();
  paint.setShader(shader);
  surface.getCanvas().drawRect(CK.XYWHRect(0, 0, W, H), paint);
  const bytes = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.JPEG, 86)!;
  writeFileSync(`assets/previews/${f.id}.jpg`, bytes);
  console.log(`✓ ${f.id} (${Math.round(bytes.length / 1024)} KB)`);
  surface.delete();
}
