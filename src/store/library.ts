import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deleteArtwork } from '@/lib/files';
import type { Adjustments, StyleId } from '@/skia/filters';
import type { Transform } from '@/skia/transforms';

import { persistStorage } from './storage';

export interface Artwork {
  id: string;
  /** File names inside the app's documents directory (absolute URIs change between installs on iOS). */
  file: string;
  source: string;
  width: number;
  height: number;
  style: StyleId;
  adjustments: Adjustments;
  transform: Transform;
  favourite: boolean;
  createdAt: number;
  updatedAt: number;
  /** Set once the item has been uploaded; cleared when it changes again. */
  syncedAt?: number;
}

interface LibraryState {
  items: Artwork[];
  upsert: (item: Artwork) => void;
  toggleFavourite: (id: string) => void;
  markSynced: (id: string, at: number) => void;
  remove: (id: string) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      items: [],
      upsert: (item) =>
        set((s) => ({
          items: [item, ...s.items.filter((i) => i.id !== item.id)].sort(
            (a, b) => b.updatedAt - a.updatedAt,
          ),
        })),
      toggleFavourite: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, favourite: !i.favourite } : i)),
        })),
      markSynced: (id, at) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, syncedAt: at } : i)) })),
      remove: (id) => {
        const item = get().items.find((i) => i.id === id);
        // Another artwork can share a source photo (re-edit saves as a new
        // piece), so only delete the source when nothing else points to it.
        if (item) {
          const sharedSource = get().items.some((i) => i.id !== id && i.source === item.source);
          deleteArtwork(item.file, sharedSource ? undefined : item.source);
        }
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
    }),
    { name: 'library', storage: persistStorage },
  ),
);

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
