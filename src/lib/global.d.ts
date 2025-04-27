import { HistoryManager } from '../components/editor/history-manager';

declare global {
  interface Window {
    historyManager?: HistoryManager;
    lastEditorSelection?: {
      from: number;
      to: number;
      text: string;
    };
  }
}

export {};