import { printToFileAsync } from 'expo-print';

import { encodeBase64, loadImage, renderImage } from '@/skia/render';
import { FILTER_BY_ID } from '@/skia/filters';
import type { Artwork } from '@/store/library';

import { artworkUri } from './files';

// Points on an A4 page; each sketch is fitted onto its own page.
const PAGE_W = 595;
const PAGE_H = 842;

/**
 * One PDF with one sketch per page. Pages are re-encoded as 1600px JPEGs so
 * a 60-page set stays a reasonable size.
 */
export async function exportPdf(items: Artwork[], title = 'Sketchify'): Promise<string> {
  const pages: string[] = [];
  for (const item of items) {
    const image = await loadImage(artworkUri(item.file));
    try {
      const page = renderImage({
        image,
        style: 'original',
        adjustments: FILTER_BY_ID.original.defaults,
        maxLong: 1600,
      });
      try {
        pages.push(encodeBase64(page, 'jpg', 85));
      } finally {
        page.dispose();
      }
    } finally {
      image.dispose();
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page { width: ${PAGE_W}pt; height: ${PAGE_H}pt; display: flex; align-items: center;
          justify-content: center; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  img { max-width: ${PAGE_W - 48}pt; max-height: ${PAGE_H - 48}pt; object-fit: contain; }
</style></head><body>
${pages.map((b64) => `<div class="page"><img src="data:image/jpeg;base64,${b64}"/></div>`).join('\n')}
</body></html>`;

  const { uri } = await printToFileAsync({ html, width: PAGE_W, height: PAGE_H });
  return uri;
}
