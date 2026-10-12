"use client";

import { create } from "zustand";
import {
  cloneDesign,
  DEFAULT_DESIGN,
  type Design,
  type MatId,
  type Mood,
  type PartId,
} from "./config";

export type View = "home" | PartId;

export type SavedDesign = { id: string; design: Design; thumb: string; savedAt: number };
export type BagItem = {
  id: string;
  design: Design;
  size: string;
  price: number;
  thumb: string;
};

type Toast = { id: number; text: string };

type State = {
  design: Design;
  past: Design[];
  future: Design[];
  selected: PartId;
  hovered: PartId | null;
  mood: Mood;
  exploded: boolean;
  autoRotate: boolean;
  view: { target: View; nonce: number };
  ready: boolean;
  toast: Toast | null;
  saved: SavedDesign[];
  bag: BagItem[];

  select: (p: PartId, fly?: boolean) => void;
  hover: (p: PartId | null) => void;
  setColor: (p: PartId, color: string) => void;
  setMat: (p: PartId, mat: MatId) => void;
  setInitials: (text: string) => void;
  setInitialsColor: (color: string) => void;
  rename: (name: string) => void;
  loadDesign: (d: Design, keepName?: boolean) => void;
  undo: () => void;
  redo: () => void;
  setMood: (m: Mood) => void;
  toggleExplode: () => void;
  toggleRotate: () => void;
  flyTo: (v: View) => void;
  setReady: () => void;
  notify: (text: string) => void;
  hydrate: () => void;
  saveDesign: (thumb: string) => void;
  deleteSaved: (id: string) => void;
  addToBag: (item: Omit<BagItem, "id">) => void;
  removeFromBag: (id: string) => void;
  clearBag: () => void;
};

const SAVED_KEY = "forma.saved.v1";
const BAG_KEY = "forma.bag.v1";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useStudio = create<State>((set, get) => {
  // Every design edit goes through commit so undo/redo stays in sync.
  const commit = (mutate: (d: Design) => void, mergeKey?: string) => {
    const { design, past } = get();
    const next = cloneDesign(design);
    mutate(next);
    // Merge rapid edits of the same kind (e.g. dragging the color picker) into one undo step.
    const now = Date.now();
    const merge = mergeKey && lastKey === mergeKey && now - lastAt < 800;
    lastKey = mergeKey ?? null;
    lastAt = now;
    set({
      design: next,
      past: merge ? past : [...past.slice(-60), design],
      future: [],
    });
  };
  let lastKey: string | null = null;
  let lastAt = 0;

  return {
    design: cloneDesign(DEFAULT_DESIGN),
    past: [],
    future: [],
    selected: "upper",
    hovered: null,
    mood: "studio",
    exploded: false,
    autoRotate: false,
    view: { target: "home", nonce: 0 },
    ready: false,
    toast: null,
    saved: [],
    bag: [],

    select: (p, fly = true) => {
      set({ selected: p });
      if (fly) get().flyTo(p);
    },
    hover: (p) => set({ hovered: p }),
    setColor: (p, color) =>
      commit((d) => {
        d.parts[p].color = color;
      }, `color-${p}`),
    setMat: (p, mat) =>
      commit((d) => {
        d.parts[p].mat = mat;
      }),
    setInitials: (text) =>
      commit((d) => {
        d.initials = text.toUpperCase().replace(/[^A-Z0-9&.]/g, "").slice(0, 4);
      }, "initials"),
    setInitialsColor: (color) =>
      commit((d) => {
        d.initialsColor = color;
      }, "initials-color"),
    rename: (name) =>
      commit((d) => {
        d.name = name.slice(0, 32);
      }, "name"),
    loadDesign: (incoming, keepName = false) =>
      commit((d) => {
        const name = d.name;
        Object.assign(d, cloneDesign(incoming));
        if (keepName) d.name = name;
      }),
    undo: () => {
      const { past, design, future } = get();
      if (!past.length) return;
      set({ design: past[past.length - 1], past: past.slice(0, -1), future: [design, ...future] });
      lastKey = null;
    },
    redo: () => {
      const { past, design, future } = get();
      if (!future.length) return;
      set({ design: future[0], past: [...past, design], future: future.slice(1) });
      lastKey = null;
    },
    setMood: (mood) => set({ mood }),
    toggleExplode: () => set((s) => ({ exploded: !s.exploded })),
    toggleRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
    flyTo: (target) => set((s) => ({ view: { target, nonce: s.view.nonce + 1 } })),
    setReady: () => set({ ready: true }),
    notify: (text) => {
      const id = Date.now();
      set({ toast: { id, text } });
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 2600);
    },
    hydrate: () => {
      set({ saved: readLS<SavedDesign[]>(SAVED_KEY, []), bag: readLS<BagItem[]>(BAG_KEY, []) });
    },
    saveDesign: (thumb) => {
      const { design, saved } = get();
      const next = [{ id: uid(), design: cloneDesign(design), thumb, savedAt: Date.now() }, ...saved].slice(0, 24);
      set({ saved: next });
      writeLS(SAVED_KEY, next);
    },
    deleteSaved: (id) => {
      const next = get().saved.filter((s) => s.id !== id);
      set({ saved: next });
      writeLS(SAVED_KEY, next);
    },
    addToBag: (item) => {
      const next = [...get().bag, { ...item, id: uid() }];
      set({ bag: next });
      writeLS(BAG_KEY, next);
    },
    removeFromBag: (id) => {
      const next = get().bag.filter((b) => b.id !== id);
      set({ bag: next });
      writeLS(BAG_KEY, next);
    },
    clearBag: () => {
      set({ bag: [] });
      writeLS(BAG_KEY, []);
    },
  };
});
