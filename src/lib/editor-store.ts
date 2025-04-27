import { create } from "zustand";

interface EditorStore {
  documentId: number | null;
  title: string;
  isDarkMode: boolean;
  setDocumentId: (id: number) => void;
  setTitle: (title: string) => void;
  toggleDarkMode: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  documentId: null,
  title: "Untitled document",
  isDarkMode: false,
  setDocumentId: (id) => set({ documentId: id }),
  setTitle: (title) => set({ title }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
