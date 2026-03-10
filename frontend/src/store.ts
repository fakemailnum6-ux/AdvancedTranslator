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

  // Continuous Editor Sync
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;

  // App-wide
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  loadDemoProject: () => void;

  isSidebarOpen: boolean;
  toggleSidebar: () => void;

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

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  loadDemoProject: () => {
    set({
      activeProjectId: "demo-project",
      chapters: ["ch_1", "ch_2", "ch_3"],
      currentChapter: "ch_1",
      segments: Array.from({ length: 50 }).map((_, i) => ({
        id: `seg_${i}`,
        chapter_id: 'ch_1',
        segment_index: i,
        source_text: `This is dummy segment ${i} with an inline <1>tag</1> to demonstrate the layout.`,
        target_text: `Это фиктивный сегмент ${i} с тегом для демонстрации интерфейса.`,
        inline_tags: { "1": { prefix: "<b>", suffix: "</b>" } },
        status: i % 5 === 0 ? 'LOCKED' : (i % 2 === 0 ? 'NEW' : 'EDITED'),
        version: 1,
      })) as any
    });
  },

  chapters: [],
  setChapters: (chapters) => set({ chapters }),

  currentChapter: null,
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

  activeSegmentId: null,
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
}));
