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

export interface Project {
  id: string;
  name: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

interface AppState {
  segments: Segment[];
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: string, newTarget: string, newStatus: SegmentStatus, newVersion: number) => void;

  // App-wide
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;

  chapters: string[];
  setChapters: (chapters: string[]) => void;

  currentChapter: string | null;
  setCurrentChapter: (chapter: string | null) => void;
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

  chapters: [],
  setChapters: (chapters) => set({ chapters }),

  currentChapter: null,
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
}));
