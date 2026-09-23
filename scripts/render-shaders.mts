/// <reference types="node" />
/**
 * Compiles every style's SkSL with canvaskit-wasm (the same Skia a phone
 * runs) and renders it against a real photo.
 *
 *   node scripts/render-shaders.mts <photo> [outDir] [height...]
 *
 * Writes one PNG per style and height, plus a contact sheet per height.
 * Exits non-zero if any shader fails to compile.
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { FILTERS, uniformArray } from '../src/skia/filters.ts';
import { IDENTITY, layout } from '../src/skia/transforms.ts';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');

const [photo, outDir = 'scripts/out', ...heightArgs] = process.argv.slice(2);
if (!photo) {
  console.error('usage: node scripts/render-shaders.mts <photo> [outDir] [height...]');
  process.exit(2);
}
const heights = heightArgs.length ? heightArgs.map(Number) : [400, 900];
mkdirSync(outDir, { recursive: true });

const CK = await CanvasKitInit({
  locateFile: (f: string) => require.resolve(`canvaskit-wasm/bin/full/${f}`),
});

const image = CK.MakeImageFromEncoded(readFileSync(photo));
if (!image) throw new Error(`could not decode ${photo}`);

let failed = 0;
const only = process.env.STYLES?.split(',');
const effects = FILTERS.filter((f) => !only || only.includes(f.id)).map((f) => {
  let error = '';
  const effect = CK.RuntimeEffect.Make(f.sksl, (e: string) => (error = e));
  if (!effect) {
    failed++;
    console.error(`✗ ${f.id}: ${error}`);
  } else {
    console.log(`✓ ${f.id} compiled`);
  }
  return { f, effect };
});
if (failed) process.exit(1);

for (const height of heights) {
  // Size by height, so `u` (resolution.y / 900) is what varies between runs.
  const aspect = image.width() / image.height();
  const { width, height: h, matrix } = layout(
    image.width(), image.height(), IDENTITY, height * Math.max(aspect, 1), true,
  );
  const cols = 5;
  const rows = Math.ceil(effects.length / cols);
  const sheet = CK.MakeSurface(cols * width, rows * (h + 28))!;
  const sheetCanvas = sheet.getCanvas();
  sheetCanvas.clear(CK.WHITE);
  const font = new CK.Font(null, 18);
  const label = new CK.Paint();
  label.setColor(CK.BLACK);

  effects.forEach(({ f, effect }, i) => {
    const surface = CK.MakeSurface(width, h)!;
    const child = image.makeShaderOptions(
      CK.TileMode.Clamp, CK.TileMode.Clamp, CK.FilterMode.Linear, CK.MipmapMode.None, matrix,
    );
    const shader = effect!.makeShaderWithChildren(uniformArray(width, h, f.defaults), [child]);
    const paint = new CK.Paint();
    paint.setShader(shader);
    surface.getCanvas().drawRect(CK.XYWHRect(0, 0, width, h), paint);
    const snap = surface.makeImageSnapshot();
    writeFileSync(join(outDir, `${f.id}-${height}.png`), snap.encodeToBytes()!);
    const x = (i % cols) * width;
    const y = Math.floor(i / cols) * (h + 28);
    sheetCanvas.drawImage(snap, x, y + 28, null);
    sheetCanvas.drawText(f.name, x + 6, y + 20, label, font);
    snap.delete(); shader.delete(); child.delete(); paint.delete(); surface.delete();
  });

  const out = sheet.makeImageSnapshot();
  writeFileSync(join(outDir, `sheet-${height}.png`), out.encodeToBytes()!);
  console.log(`rendered ${effects.length} styles at ${width}x${h} → ${outDir}/sheet-${height}.png`);
}
