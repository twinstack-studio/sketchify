import { File } from 'expo-file-system';
import { create } from 'zustand';

import { artworkUri } from '@/lib/files';
import { mimeFor } from '@/lib/sharing';
import { BUCKET, supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import { useLibrary } from './library';

interface SyncState {
  running: boolean;
  done: number;
  total: number;
  error: string | null;
  syncNow: () => Promise<void>;
}

/**
 * One-way backup: uploads every artwork that changed since its last upload,
 * then records it in the `sketches` table (see supabase/schema.sql).
 */
export const useSync = create<SyncState>()((set, get) => ({
  running: false,
  done: 0,
  total: 0,
  error: null,
  syncNow: async () => {
    const userId = useAuth.getState().session?.user.id;
    if (!supabase || !userId || get().running) return;

    const pending = useLibrary
      .getState()
      .items.filter((i) => !i.syncedAt || i.syncedAt < i.updatedAt);
    set({ running: true, done: 0, total: pending.length, error: null });

    try {
      for (const item of pending) {
        // Stable per artwork, so a re-edit overwrites its old upload.
        const path = `${userId}/${item.id}.${item.file.split('.').pop()}`;
        const bytes = await new File(artworkUri(item.file)).bytes();
        const upload = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: mimeFor(item.file), upsert: true });
        if (upload.error) throw upload.error;

        const row = await supabase.from('sketches').upsert({
          id: item.id,
          user_id: userId,
          path,
          style: item.style,
          adjustments: item.adjustments,
          transform: item.transform,
          width: item.width,
          height: item.height,
          favourite: item.favourite,
          created_at: new Date(item.createdAt).toISOString(),
          updated_at: new Date(item.updatedAt).toISOString(),
        });
        if (row.error) throw row.error;

        useLibrary.getState().markSynced(item.id, Date.now());
        set((s) => ({ done: s.done + 1 }));
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sync failed' });
    } finally {
      set({ running: false });
    }
  },
}));

/** Deletes the cloud copy of an artwork, if there is one. Best effort. */
export async function deleteRemote(id: string, file: string) {
  const userId = useAuth.getState().session?.user.id;
  if (!supabase || !userId) return;
  await supabase.storage.from(BUCKET).remove([`${userId}/${id}.${file.split('.').pop()}`]);
  await supabase.from('sketches').delete().eq('id', id);
}
