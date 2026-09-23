/**
 * Rotate / flip / aspect-crop, expressed as one 3x3 matrix that maps source
 * image pixels to output pixels. The same matrix drives the live preview and
 * the full-resolution export, so the two can never disagree.
 */

export type Aspect = 'original' | '1:1' | '4:5' | '3:4' | '9:16' | '16:9';

export const ASPECTS: { id: Aspect; label: string; ratio: number | null }[] = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export interface Transform {
  quarterTurns: number; // 0..3, clockwise
  flipX: boolean;
  aspect: Aspect;
}

export const IDENTITY: Transform = { quarterTurns: 0, flipX: false, aspect: 'original' };

/** Row-major 3x3. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

const mul = (a: Mat3, b: Mat3): Mat3 => {
  const r = new Array(9).fill(0) as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
};
const translate = (x: number, y: number): Mat3 => [1, 0, x, 0, 1, y, 0, 0, 1];
const scale = (x: number, y: number): Mat3 => [x, 0, 0, 0, y, 0, 0, 0, 1];
const quarter = (q: number): Mat3 => {
  const t = ((q % 4) + 4) % 4;
  const c = [1, 0, -1, 0][t];
  const s = [0, 1, 0, -1][t];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

/** Size of the image after rotation and crop, before scaling. */
export function croppedSize(w: number, h: number, t: Transform) {
  const odd = t.quarterTurns % 2 === 1;
  const rw = odd ? h : w;
  const rh = odd ? w : h;
  const ratio = ASPECTS.find((a) => a.id === t.aspect)?.ratio ?? null;
  if (!ratio) return { width: rw, height: rh };
  return rw / rh > ratio
    ? { width: rh * ratio, height: rh }
    : { width: rw, height: rw / ratio };
}

/**
 * Output dimensions (long edge capped at `maxLong`, never upscaled past the
 * source unless `allowUpscale`) and the image → output matrix.
 */
export function layout(
  w: number,
  h: number,
  t: Transform,
  maxLong: number,
  allowUpscale = false,
): { width: number; height: number; matrix: Mat3 } {
  const crop = croppedSize(w, h, t);
  let s = maxLong / Math.max(crop.width, crop.height);
  if (!allowUpscale) s = Math.min(s, 1);
  const width = Math.max(1, Math.round(crop.width * s));
  const height = Math.max(1, Math.round(crop.height * s));

  let m = translate(-w / 2, -h / 2);
  if (t.flipX) m = mul(scale(-1, 1), m);
  m = mul(quarter(t.quarterTurns), m);
  m = mul(translate(crop.width / 2, crop.height / 2), m);
  m = mul(scale(width / crop.width, height / crop.height), m);
  return { width, height, matrix: m };
}

/** Fit a width × height box inside a frame, preserving aspect. */
export function fitInside(width: number, height: number, frameW: number, frameH: number) {
  const s = Math.min(frameW / width, frameH / height);
  return { width: width * s, height: height * s };
}
