/**
 * Every Sketchify style is one SkSL runtime shader.
 *
 * This file is plain strings on purpose: no React Native imports, so Node can
 * import it directly and compile the exact same SkSL with canvaskit-wasm
 * (see scripts/render-shaders.mts).
 *
 * All styles share one uniform block and one `finish()` epilogue, so the same
 * six sliders drive all fourteen and a style can be swapped without touching
 * the uniform plumbing.
 *
 * Lengths are written in `u` units, where u = resolution.y / 900. A blur of
 * 12.0 * u is the same fraction of the picture in a 400px preview and in a
 * 4096px export, so what you tune is what you get. `px()` floors lengths at
 * one pixel: a sub-pixel hatch spacing degrades into noise.
 */

const PRELUDE = /* sksl */ `
uniform shader image;
uniform float2 resolution;
uniform float strength;
uniform float detail;
uniform float contrast;
uniform float brightness;
uniform float grain;
uniform float warmth;
uniform float invert;

float U() { return resolution.y / 900.0; }
float px(float len) { return max(len, 1.0); }

float3 src(float2 p) { return image.eval(p).rgb; }
float luma(float3 c) { return dot(c, float3(0.299, 0.587, 0.114)); }
float grayAt(float2 p) { return luma(src(p)); }

float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 s = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}

// 49-tap (7x7) gaussian of luminance, spread over radius r pixels.
float blurGray(float2 p, float r) {
  float sum = 0.0;
  float wsum = 0.0;
  float stride = r / 3.0;
  for (int y = -3; y <= 3; y++) {
    for (int x = -3; x <= 3; x++) {
      float2 o = float2(float(x), float(y));
      float k = exp(-dot(o, o) / 8.0);
      sum += grayAt(p + o * stride) * k;
      wsum += k;
    }
  }
  return sum / wsum;
}

// 49-tap gaussian of colour.
float3 blurColor(float2 p, float r) {
  float3 sum = float3(0.0);
  float wsum = 0.0;
  float stride = r / 3.0;
  for (int y = -3; y <= 3; y++) {
    for (int x = -3; x <= 3; x++) {
      float2 o = float2(float(x), float(y));
      float k = exp(-dot(o, o) / 8.0);
      sum += src(p + o * stride) * k;
      wsum += k;
    }
  }
  return sum / wsum;
}

// Sobel gradient magnitude of luminance at spacing d.
float sobel(float2 p, float d) {
  float tl = grayAt(p + float2(-d, -d));
  float t  = grayAt(p + float2( 0, -d));
  float tr = grayAt(p + float2( d, -d));
  float l  = grayAt(p + float2(-d,  0));
  float r  = grayAt(p + float2( d,  0));
  float bl = grayAt(p + float2(-d,  d));
  float b  = grayAt(p + float2( 0,  d));
  float br = grayAt(p + float2( d,  d));
  float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float gy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
  return length(float2(gx, gy));
}

// Colour-dodge sketch: gray divided by its own blur (cv2.divide(gray, blur)).
float dodge(float2 p, float r) {
  float g = grayAt(p);
  float b = blurGray(p, r);
  return clamp(g / max(b, 0.02), 0.0, 1.0);
}

// Distance to the nearest line of a family with the given direction and spacing.
float lineDist(float2 p, float2 dir, float spacing) {
  float t = dot(p, dir) / spacing;
  return abs(fract(t) - 0.5) * spacing;
}

float3 applyWarmth(float3 c, float w) {
  return c + float3(0.08, 0.02, -0.08) * w;
}

half4 finish(float2 p, float3 original, float3 styled) {
  float3 c = mix(original, styled, strength);
  c = (c - 0.5) * (1.0 + contrast) + 0.5;
  c += brightness * 0.35;
  float2 cell = floor(p / px(1.2 * U()));
  c += (hash(cell) - 0.5) * grain * 0.28;
  c = mix(c, 1.0 - c, invert);
  c = applyWarmth(c, warmth);
  return half4(clamp(c, 0.0, 1.0), 1.0);
}
`;

const shader = (body: string) => `${PRELUDE}\n${body}`;

export const SKSL = {
  original: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  return finish(p, o, o);
}`),

  graphite: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float r = mix(32.0, 8.0, detail) * U();
  float s = dodge(p, r);
  s = pow(s, 2.2);
  return finish(p, o, float3(s));
}`),

  pencil: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float g = grayAt(p);
  float m = blurGray(p, 7.0 * U());
  float c = mix(0.07, 0.012, detail);
  // Binary threshold: a narrow ramp keeps it reading as pen strokes, not an emboss.
  float line = smoothstep(-0.010, 0.010, g - m + c);
  return finish(p, o, float3(line));
}`),

  ink: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  // Difference of gaussians: ignores fine texture, keeps real contours.
  float fine = blurGray(p, 2.0 * U());
  float coarse = blurGray(p, mix(7.0, 4.5, detail) * U());
  float t = mix(0.035, 0.015, detail);
  float line = smoothstep(-t, -t * 0.4, fine - coarse);
  return finish(p, o, float3(line));
}
`),

  charcoal: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float r = mix(28.0, 10.0, detail) * U();
  float s = dodge(p, r);
  s = pow(s, 4.0);
  float g = grayAt(p);
  // Smudged tone plus a diagonal streak texture, like charcoal on rough paper.
  float tone = smoothstep(0.1, 0.9, g);
  float2 q = float2(p.x + p.y, p.x - p.y * 0.3) / px(3.0 * U());
  float streak = noise(float2(q.x * 0.15, q.y * 2.0));
  float paper = mix(0.82, 1.0, streak);
  float c = s * mix(0.55, 1.0, tone) * paper;
  return finish(p, o, float3(c));
}`),

  crosshatch: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float g = blurGray(p, 2.5 * U());
  float spacing = px(mix(12.0, 7.0, detail) * U());
  float w = max(spacing * 0.14, 0.6);
  float ink = 0.0;
  if (g < 0.72) { ink = max(ink, 1.0 - smoothstep(w * 0.5, w, lineDist(p, float2(0.7071, 0.7071), spacing))); }
  if (g < 0.52) { ink = max(ink, 1.0 - smoothstep(w * 0.5, w, lineDist(p, float2(0.7071, -0.7071), spacing))); }
  if (g < 0.34) { ink = max(ink, 1.0 - smoothstep(w * 0.5, w, lineDist(p, float2(1.0, 0.0), spacing * 0.8))); }
  if (g < 0.18) { ink = max(ink, 1.0 - smoothstep(w * 0.5, w, lineDist(p, float2(0.0, 1.0), spacing * 0.8))); }
  float outline = 1.0 - smoothstep(-0.03, -0.012, blurGray(p, 1.5 * U()) - blurGray(p, 5.0 * U()));
  ink = max(ink, outline);
  return finish(p, o, float3(1.0 - ink * 0.9));
}
`),

  stipple: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float cell = max(mix(9.0, 5.0, detail) * U(), 3.0);
  float2 id = floor(p / cell);
  float ink = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float2 nid = id + float2(float(x), float(y));
      float2 jitter = float2(hash(nid), hash(nid + 17.0)) * 0.8 + 0.1;
      float2 center = (nid + jitter) * cell;
      // Tone from a small cross of samples, so one noisy pixel can't make a blot.
      float h = cell * 0.5;
      float g = (grayAt(center) * 2.0 + grayAt(center + float2(h, 0)) + grayAt(center - float2(h, 0))
               + grayAt(center + float2(0, h)) + grayAt(center - float2(0, h))) / 6.0;
      float dark = smoothstep(0.12, 0.88, 1.0 - g);
      float radius = cell * 0.6 * sqrt(dark);
      float dist = length(p - center);
      ink = max(ink, 1.0 - smoothstep(radius - 0.6, radius + 0.6, dist));
    }
  }
  float outline = 1.0 - smoothstep(-0.03, -0.012, blurGray(p, 1.5 * U()) - blurGray(p, 5.0 * U()));
  ink = max(ink, outline * 0.85);
  return finish(p, o, float3(1.0 - ink));
}
`),

  blueprint: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float d = px(1.5 * U());
  float e = sobel(p, d);
  float t = mix(0.5, 0.15, detail);
  float line = smoothstep(t * 0.6, t, e);
  float gs = px(45.0 * U());
  float gw = max(0.6 * U(), 0.5);
  float gx = abs(fract(p.x / gs) - 0.5) * gs;
  float gy = abs(fract(p.y / gs) - 0.5) * gs;
  float grid = (1.0 - smoothstep(gw, gw + 0.8, min(gx, gy))) * 0.18;
  float3 paper = float3(0.05, 0.22, 0.52);
  float3 ink = float3(0.88, 0.94, 1.0);
  float3 c = mix(paper, ink, clamp(line + grid, 0.0, 1.0));
  return finish(p, o, c);
}`),

  noir: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float g = grayAt(p);
  float k = mix(1.6, 2.6, detail);
  g = clamp((g - 0.5) * k + 0.5, 0.0, 1.0);
  g = g * g * (3.0 - 2.0 * g);
  float2 uv = p / resolution - 0.5;
  float vignette = 1.0 - smoothstep(0.35, 0.85, length(uv * float2(resolution.x / resolution.y, 1.0)));
  return finish(p, o, float3(g * mix(0.35, 1.0, vignette)));
}`),

  sepia: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float r = mix(30.0, 10.0, detail) * U();
  float s = pow(dodge(p, r), 1.8);
  float g = grayAt(p);
  float tone = mix(s, s * (0.55 + 0.45 * g), 0.6);
  float3 dark = float3(0.26, 0.16, 0.08);
  float3 light = float3(0.98, 0.92, 0.78);
  return finish(p, o, mix(dark, light, tone));
}`),

  comic: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float3 c = blurColor(p, 2.0 * U());
  float levels = 4.0;
  float3 poster = floor(c * levels + 0.5) / levels;
  float cell = px(mix(10.0, 6.0, detail) * U());
  float2 rp = float2(p.x + p.y, p.y - p.x) * 0.7071;
  float2 local = fract(rp / cell) - 0.5;
  float dark = 1.0 - luma(c);
  float ht = 1.0 - smoothstep(0.0, 0.08, length(local) - 0.5 * sqrt(dark));
  float3 shaded = poster * (1.0 - ht * 0.35);
  float e = sobel(p, px(1.5 * U()));
  float edge = smoothstep(0.3, 0.55, e);
  return finish(p, o, mix(shaded, float3(0.04), edge));
}`),

  cel: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float3 c = blurColor(p, 3.0 * U());
  float l = luma(c);
  float bands = mix(3.0, 6.0, detail);
  float q = floor(l * bands + 0.5) / bands;
  float3 cel = c * (q / max(l, 0.04));
  float e = sobel(p, px(1.8 * U()));
  float edge = smoothstep(0.25, 0.45, e);
  return finish(p, o, mix(clamp(cel, 0.0, 1.0), float3(0.05), edge));
}`),

  watercolour: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float2 wobble = float2(noise(p / px(40.0 * U())), noise(p / px(40.0 * U()) + 9.0)) - 0.5;
  float2 q = p + wobble * 10.0 * U();
  float3 wash = blurColor(q, mix(14.0, 5.0, detail) * U());
  wash = floor(wash * 6.0 + 0.5) / 6.0 * 0.5 + wash * 0.5;
  float e = sobel(q, px(3.0 * U()));
  float pigment = smoothstep(0.1, 0.6, e) * 0.35;
  float paper = noise(p / px(2.5 * U())) * 0.08 + noise(p / px(18.0 * U())) * 0.1;
  float3 c = mix(float3(1.0), wash, 0.85) - pigment - paper * 0.5;
  return finish(p, o, c);
}`),

  neon: shader(`
half4 main(float2 p) {
  float3 o = src(p);
  float d = px(1.5 * U());
  float e = sobel(p, d);
  float glow = sobel(p, px(6.0 * U()));
  float t = mix(0.45, 0.15, detail);
  float3 c = blurColor(p, 4.0 * U());
  float3 hue = c / max(max(c.r, max(c.g, c.b)), 0.05);
  hue = mix(float3(0.1, 1.0, 0.9), hue, 0.7);
  float core = smoothstep(t * 0.6, t, e);
  float halo = smoothstep(0.05, 0.9, glow) * 0.55;
  float3 col = hue * (core * 1.4 + halo) + float3(core * 0.35);
  return finish(p, o, col);
}`),
} as const;

export type StyleId = keyof typeof SKSL;
