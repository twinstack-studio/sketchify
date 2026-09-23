/**
 * Draws the Sketchify mark (a gold pencil finishing a sketched line) with
 * canvaskit-wasm and writes every icon asset app.json points at.
 *
 *   node scripts/make-icons.mjs [outDir]
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const CK = await CanvasKitInit({
  locateFile: (f) => require.resolve(`canvaskit-wasm/bin/full/${f}`),
});

const outDir = process.argv[2] ?? 'assets';
mkdirSync(outDir, { recursive: true });

const C = {
  bg: '#0B0B0D',
  bgLift: '#1E1D22',
  paper: '#F4F1EA',
  goldHi: '#F3C66C',
  gold: '#E8B04B',
  goldLo: '#B9832A',
  wood: '#EFD9AE',
  graphite: '#2A2A31',
  ferrule: '#A8A39A',
  ferruleLo: '#7E7A73',
  eraser: '#D9776B',
};

// Motif geometry in a 1024 box; its bounds are roughly x 305..810, y 222..795.
const TIP = [318, 706];
const MOTIF_CENTER = [557, 508];

function paint(hex, mono, style = 'fill') {
  const p = new CK.Paint();
  p.setAntiAlias(true);
  p.setColor(CK.parseColorString(mono ? '#FFFFFF' : hex));
  if (style === 'stroke') {
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeCap(CK.StrokeCap.Round);
    p.setStrokeJoin(CK.StrokeJoin.Round);
  }
  return p;
}

function drawMotif(canvas, { mono = false, shadow = true } = {}) {
  // The sketched line the pencil has just drawn.
  const line = new CK.PathBuilder();
  line.moveTo(TIP[0], TIP[1]);
  line.cubicTo(392, 792, 486, 800, 552, 742);
  line.cubicTo(612, 690, 676, 690, 716, 736);
  line.cubicTo(740, 764, 768, 772, 798, 758);
  const ink = paint(C.paper, mono, 'stroke');
  ink.setStrokeWidth(30);
  canvas.drawPath(line.snapshot(), ink);

  canvas.save();
  canvas.translate(TIP[0], TIP[1]);
  canvas.rotate(-45, 0, 0);

  if (shadow && !mono) {
    const s = paint('#000000', false);
    s.setAlphaf(0.55);
    s.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 18, true));
    canvas.drawRRect(CK.RRectXY(CK.LTRBRect(40, -62, 620, 92), 34, 34), s);
  }

  const W = 72; // half width of the pencil
  // Graphite point and sharpened wood cone.
  const cone = new CK.PathBuilder();
  cone.moveTo(0, 0);
  cone.lineTo(150, -W);
  cone.lineTo(150, W);
  cone.close();
  canvas.drawPath(cone.snapshot(), paint(C.wood, mono));
  const point = new CK.PathBuilder();
  point.moveTo(0, 0);
  point.lineTo(54, -W * 0.36);
  point.lineTo(54, W * 0.36);
  point.close();
  canvas.drawPath(point.snapshot(), paint(C.graphite, mono));

  // Hexagonal body shown as three facets.
  const facets = [
    [-W, -W / 3, C.goldHi],
    [-W / 3, W / 3, C.gold],
    [W / 3, W, C.goldLo],
  ];
  for (const [top, bottom, hex] of facets) {
    canvas.drawRect(CK.LTRBRect(148, top, 500, bottom), paint(hex, mono));
  }
  // Scalloped edge where the paint meets the wood.
  for (const [cy, hex] of [[-W * (2 / 3), C.goldHi], [0, C.gold], [W * (2 / 3), C.goldLo]]) {
    canvas.drawOval(CK.LTRBRect(128, cy - W / 3, 170, cy + W / 3), paint(hex, mono));
  }

  // Eraser, then the metal ferrule over its seam.
  canvas.drawRRect(CK.RRectXY(CK.LTRBRect(520, -W, 628, W), 30, 30), paint(C.eraser, mono));
  canvas.drawRect(CK.LTRBRect(496, -W - 4, 560, W + 4), paint(C.ferrule, mono));
  if (!mono) {
    for (const x of [512, 530, 548]) {
      const band = paint(C.ferruleLo, false, 'stroke');
      band.setStrokeWidth(5);
      canvas.drawLine(x, -W - 4, x, W + 4, band);
    }
  }
  canvas.restore();
}

function render(size, { background, motifScale, mono = false, shadow = true }) {
  const surface = CK.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);

  if (background) {
    const bg = new CK.Paint();
    bg.setShader(
      CK.Shader.MakeRadialGradient(
        [size * 0.5, size * 0.42],
        size * 0.75,
        [CK.parseColorString(C.bgLift), CK.parseColorString(C.bg)],
        [0, 1],
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawRect(CK.LTRBRect(0, 0, size, size), bg);
  }

  canvas.save();
  canvas.translate(size / 2, size / 2);
  canvas.scale(motifScale * (size / 1024), motifScale * (size / 1024));
  canvas.translate(-MOTIF_CENTER[0], -MOTIF_CENTER[1]);
  drawMotif(canvas, { mono, shadow });
  canvas.restore();

  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes();
  image.delete();
  surface.delete();
  return bytes;
}

// Adaptive icons are masked to the centre ~66%, so the motif shrinks there.
const outputs = {
  'icon.png': render(1024, { background: true, motifScale: 1 }),
  'android-icon-foreground.png': render(512, { background: false, motifScale: 0.9 }),
  'android-icon-monochrome.png': render(432, { background: false, motifScale: 0.9, mono: true }),
  'splash-icon.png': render(1024, { background: false, motifScale: 1 }),
  'favicon.png': render(48, { background: true, motifScale: 1.1, shadow: false }),
};

for (const [name, bytes] of Object.entries(outputs)) {
  writeFileSync(join(outDir, name), bytes);
  console.log(`wrote ${join(outDir, name)}`);
}
