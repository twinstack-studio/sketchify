import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const mmkv = createMMKV({ id: 'sketchify' });

const adapter: StateStorage = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key);
  },
};

/** Synchronous persistence: stores are hydrated before the first render. */
export const persistStorage = createJSONStorage(() => adapter);
