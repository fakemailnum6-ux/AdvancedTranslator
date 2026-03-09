import { create } from 'zustand';

export type SegmentStatus = 'NEW' | 'TRANSLATED' | 'EDITED' | 'APPROVED' | 'LOCKED';

export interface InlineTags {
  [key: string]: { prefix: string; suffix: string };
}

export interface Segment {
  id: string;
  chapter_id: string;
  segment_index: number;
  source_text: string;
  target_text: string;
  inline_tags: InlineTags;
  status: SegmentStatus;
  version: number;
}

interface AppState {
  segments: Segment[];
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: string, newTarget: string, newStatus: SegmentStatus, newVersion: number) => void;

  // App-wide
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  segments: [],
  setSegments: (segments) => set({ segments }),

  updateSegment: (id, newTarget, newStatus, newVersion) =>
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id
          ? { ...seg, target_text: newTarget, status: newStatus, version: newVersion }
          : seg
      )
    })),

  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
