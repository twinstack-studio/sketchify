import type { SkImage } from '@shopify/react-native-skia';
import { create } from 'zustand';

import { saveArtwork } from '@/lib/export';
import type { Picked } from '@/lib/picking';
import { FILTER_BY_ID, type StyleId } from '@/skia/filters';
import { loadImage } from '@/skia/render';
import { IDENTITY } from '@/skia/transforms';

export type JobStatus = 'queued' | 'working' | 'done' | 'failed';

export interface BatchJob {
  id: string;
  uri: string;
  name: string;
  status: JobStatus;
  artworkId?: string;
  error?: string;
}

interface BatchState {
  style: StyleId;
  jobs: BatchJob[];
  running: boolean;
  cancelled: boolean;
  setStyle: (style: StyleId) => void;
  add: (photos: Picked[]) => void;
  removeJob: (id: string) => void;
  clear: () => void;
  run: () => Promise<void>;
  cancel: () => void;
}

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 16));

export const useBatch = create<BatchState>()((set, get) => ({
  style: 'graphite',
  jobs: [],
  running: false,
  cancelled: false,
  setStyle: (style) => set({ style }),
  add: (photos) =>
    set((s) => ({
      jobs: [
        ...s.jobs,
        ...photos
          .filter((p) => !s.jobs.some((j) => j.uri === p.uri))
          .map((p, i) => ({
            id: `${Date.now().toString(36)}-${i}`,
            uri: p.uri,
            name: p.name ?? `Photo ${s.jobs.length + i + 1}`,
            status: 'queued' as const,
          })),
      ],
    })),
  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  clear: () => set({ jobs: [] }),
  cancel: () => set({ cancelled: true }),
  run: async () => {
    if (get().running) return;
    set({ running: true, cancelled: false });
    const update = (id: string, patch: Partial<BatchJob>) =>
      set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));

    const { style } = get();
    for (const job of get().jobs) {
      if (get().cancelled) break;
      if (job.status === 'done') continue;
      update(job.id, { status: 'working', error: undefined });
      // Let the list paint the "working" state before the render blocks the JS thread.
      await nextFrame();

      let image: SkImage | null = null;
      try {
        image = await loadImage(job.uri);
        const { artwork } = saveArtwork({
          image,
          sourceUri: job.uri,
          style,
          adjustments: FILTER_BY_ID[style].defaults,
          transform: IDENTITY,
        });
        update(job.id, { status: 'done', artworkId: artwork.id });
      } catch (e) {
        update(job.id, { status: 'failed', error: e instanceof Error ? e.message : 'Failed' });
      } finally {
        // Full-resolution decodes are large; a 60-photo queue must not keep any of them.
        image?.dispose();
      }
    }
    set({ running: false, cancelled: false });
  },
}));
