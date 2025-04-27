// Shared types for the editor

// Type definition for history manager
export interface HistoryManager {
  addHistoryStep: (name: string) => void;
}

// Extend Window interface using module augmentation approach
export {}; // Make this a module

declare global {
  interface Window {
    historyManager?: HistoryManager;
  }
}