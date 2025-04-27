// Type definitions for application

declare global {
  interface Window {
    showLineSpacingDialog?: () => void;
    historyManager?: any;
    lastClickedLink?: HTMLElement;
  }
}

export {};