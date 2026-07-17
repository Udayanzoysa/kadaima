"use client";

import { create } from "zustand";

type GlobalLoaderState = {
  count: number;
  label: string;
  show: (label?: string) => void;
  hide: () => void;
  reset: () => void;
};

const DEFAULT_LABEL = "Kadaima is loading…";

export const useGlobalLoaderStore = create<GlobalLoaderState>((set) => ({
  count: 0,
  label: DEFAULT_LABEL,
  show: (label) =>
    set((state) => ({
      count: state.count + 1,
      label: label?.trim() || state.label || DEFAULT_LABEL,
    })),
  hide: () =>
    set((state) => ({
      count: Math.max(0, state.count - 1),
      label: state.count <= 1 ? DEFAULT_LABEL : state.label,
    })),
  reset: () => set({ count: 0, label: DEFAULT_LABEL }),
}));

export function showGlobalLoader(label?: string) {
  useGlobalLoaderStore.getState().show(label);
}

export function hideGlobalLoader() {
  useGlobalLoaderStore.getState().hide();
}

export function resetGlobalLoader() {
  useGlobalLoaderStore.getState().reset();
}

/** Run an async task under the full-site Kadaima loader. */
export async function withGlobalLoader<T>(
  task: () => Promise<T>,
  label?: string,
): Promise<T> {
  showGlobalLoader(label);
  try {
    return await task();
  } finally {
    hideGlobalLoader();
  }
}
