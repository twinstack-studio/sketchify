import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './storage';

export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ExportResolution = 1440 | 2560 | 4096;

export const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
];

export const RESOLUTIONS: { id: ExportResolution; label: string }[] = [
  { id: 1440, label: 'Standard · 1440' },
  { id: 2560, label: 'High · 2560' },
  { id: 4096, label: 'Max · 4096' },
];

interface SettingsState {
  onboarded: boolean;
  format: ExportFormat;
  resolution: ExportResolution;
  watermark: boolean;
  saveToGallery: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      format: 'jpg',
      resolution: 2560,
      watermark: false,
      saveToGallery: true,
      set: (patch) => set(patch),
    }),
    { name: 'settings', storage: persistStorage },
  ),
);
