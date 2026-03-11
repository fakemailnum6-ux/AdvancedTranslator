import { create } from 'zustand';

export type SegmentStatus = 'NEW' | 'TRANSLATED' | 'EDITED' | 'APPROVED' | 'LOCKED';

export interface Project {
  id: string;
  name: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export interface ChapterData {
  id: string;
  chapter_id: string;
  source_text: string;
  target_text: string;
  status: SegmentStatus;
  version: number;
}

interface AppState {
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

  // Document data
  chapterData: ChapterData | null;
  setChapterData: (data: ChapterData | null) => void;
  updateChapterTargetText: (text: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  loadDemoProject: () => {
    set({
      activeProjectId: "demo-project",
      chapters: ["ch1", "ch2", "ch3"],
      currentChapter: "ch1",
      chapterData: {
        id: "demo-uuid",
        chapter_id: "ch1",
        source_text: "This is paragraph 1 of chapter 1. It flows continuously without any table borders or segmentation lines.\n\nThis is paragraph 2 of chapter 1.",
        target_text: "Это абзац 1 главы 1. Он идет сплошным текстом без каких-либо границ таблиц или линий сегментации.\n\nЭто абзац 2 главы 1.",
        status: "NEW",
        version: 1
      }
    });
  },

  chapters: [],
  setChapters: (chapters) => set({ chapters }),

  currentChapter: null,
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

  chapterData: null,
  setChapterData: (data) => set({ chapterData: data }),
  updateChapterTargetText: (text) => set((state) => ({
    chapterData: state.chapterData ? { ...state.chapterData, target_text: text } : null
  })),
}));
