import { Editor, JSONContent } from '@tiptap/react';

export type HistoryState = {
  // Page-related data to reconstruct document state
  pages: {
    content: JSONContent;  // The content of this page
    pageIndex: number;     // The index of this page
  }[];
  activePageIndex: number; // Currently active/focused page
  selection?: {            // Current selection state (if any)
    from: number;
    to: number;
  };
  timestamp: number;       // When this state was created
  type: string;            // What kind of operation created this state
};

// Global instance that can be accessed from anywhere
let globalHistoryManager: HistoryManager | null = null;

// Make sure TypeScript knows about our global window property
declare global {
  interface Window {
    historyManager?: HistoryManager;
  }
}

export class HistoryManager {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private mainEditor: Editor | null = null;
  private pageEditors: Map<number, Editor> = new Map();
  private activePageIndex: number = 0;
  private isUndoRedo = false;
  private maxStackSize = 100;
  private lastContent: string = '';
  private historyEvents: string[] = [];
  
  constructor(mainEditor: Editor | null, maxStackSize = 100) {
    console.log('🔄 History Manager initialized');
    this.mainEditor = mainEditor;
    this.maxStackSize = maxStackSize;
    
    // Reset and initialize state
    this.undoStack = [];
    this.redoStack = [];
    this.pageEditors = new Map();
    this.activePageIndex = 0;
    this.isUndoRedo = false;
    this.lastContent = '';
    this.historyEvents = [];
    
    // Set this instance as the global history manager
    globalHistoryManager = this;
    
    // Make history manager accessible globally via window
    window.historyManager = this;
    
    // Initialize with current editor state
    if (mainEditor) {
      this.saveInitialState();
    }
    
    // Listen for format commands to save history steps for formatting actions
    document.addEventListener('formatCommand', this.handleFormatCommand);
    
    // Listen for document change events (e.g., typing, deleting, formatting)
    document.addEventListener('content:changed', this.handleContentChanged);
    
    // Listen for page operations
    document.addEventListener('page:added', this.handlePageOperation);
    document.addEventListener('page:deleted', this.handlePageOperation);
    
    // Listen for undo/redo operations from the toolbar
    document.addEventListener('document:undo', () => this.undo());
    document.addEventListener('document:redo', () => this.redo());
    
    console.log('🔄 History Manager fully initialized and ready');
  }
  
  // Method to register a page editor with the history manager
  public registerPageEditor(pageIndex: number, editor: Editor): void {
    console.log(`🔄 Registering page editor ${pageIndex} with history manager`);
    this.pageEditors.set(pageIndex, editor);
    
    // Setup listeners for this editor
    editor.on('update', ({ editor, transaction }) => {
      if (this.isUndoRedo) return;
      
      // Only track content changes, not just selection changes
      if (transaction.docChanged) {
        console.log(`🔄 Content changed on page ${pageIndex}`);
        // Dispatch a global event other components can listen for
        const event = new CustomEvent('content:changed', { 
          detail: { pageIndex, source: 'editor-update' } 
        });
        document.dispatchEvent(event);
      }
    });
  }
  
  // Method to unregister a page editor (when page is deleted)
  public unregisterPageEditor(pageIndex: number): void {
    this.pageEditors.delete(pageIndex);
  }
  
  // Method to set the currently active page
  public setActivePage(pageIndex: number): void {
    this.activePageIndex = pageIndex;
  }
  
  private saveInitialState(): void {
    console.log('🔄 Saving initial history state');
    
    const initialState: HistoryState = {
      pages: [],
      activePageIndex: 0,
      timestamp: Date.now(),
      type: 'initial'
    };
    
    this.undoStack.push(initialState);
  }
  
  // Method to collect all page contents
  private collectAllPageContents(): HistoryState {
    const pages: { content: JSONContent; pageIndex: number }[] = [];
    
    this.pageEditors.forEach((editor, pageIndex) => {
      pages.push({
        content: editor.getJSON(),
        pageIndex
      });
    });
    
    // Sort pages by index
    pages.sort((a, b) => a.pageIndex - b.pageIndex);
    
    return {
      pages,
      activePageIndex: this.activePageIndex,
      timestamp: Date.now(),
      type: 'content-change'
    };
  }
  
  // Handler for format command events
  private handleFormatCommand = (event: Event): void => {
    if (this.isUndoRedo) return;
    
    const customEvent = event as CustomEvent;
    console.log(`🔄 Format command detected: ${customEvent.detail?.command}`);
    
    // Save the state before the format change
    this.saveCurrentState('format-change');
  }
  
  // Handler for content changed events
  private handleContentChanged = (event: Event): void => {
    if (this.isUndoRedo) return;
    
    const customEvent = event as CustomEvent;
    console.log(`🔄 Content changed on page ${customEvent.detail?.pageIndex}`);
    
    // Get all current content
    const currentState = this.collectAllPageContents();
    const currentContent = JSON.stringify(currentState.pages);
    
    // Only save if content actually changed
    if (currentContent !== this.lastContent) {
      this.saveCurrentState('content-change');
      this.lastContent = currentContent;
    }
  }
  
  // Handler for page operations
  private handlePageOperation = (event: Event): void => {
    if (this.isUndoRedo) return;
    
    const customEvent = event as CustomEvent;
    console.log(`🔄 Page operation: ${customEvent.type}`);
    
    // Save state after page operations
    this.saveCurrentState(customEvent.type);
  }

  // Method to save the current state of all pages
  public saveCurrentState(type: string = 'manual'): void {
    // Collect content from all editors
    const state = this.collectAllPageContents();
    state.type = type;
    
    // Add active editor's selection if available
    const activeEditor = this.pageEditors.get(this.activePageIndex);
    if (activeEditor && activeEditor.state.selection) {
      state.selection = {
        from: activeEditor.state.selection.from,
        to: activeEditor.state.selection.to
      };
    }
    
    console.log(`🔄 Saving history state (${type}), active page: ${this.activePageIndex}`);
    this.undoStack.push(state);
    
    // Keep stack size manageable
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new content is added
    if (type !== 'auto-save') {
      this.redoStack = [];
    }
    
    // Record event for debugging
    this.historyEvents.push(`Saved state (${type}), active page: ${this.activePageIndex}`);
  }

  // Method to apply a state to all editors
  private applyState(state: HistoryState): void {
    if (!state || !state.pages) {
      console.warn('🔄 Cannot apply invalid history state');
      return;
    }
    
    console.log(`🔄 Applying history state (${state.type}), ${state.pages.length} pages`);
    
    this.isUndoRedo = true;
    
    // Apply content to each page
    state.pages.forEach(page => {
      const editor = this.pageEditors.get(page.pageIndex);
      if (editor) {
        editor.commands.setContent(page.content);
      } else {
        console.warn(`🔄 Editor for page ${page.pageIndex} not found`);
      }
    });
    
    // Set active page
    if (state.activePageIndex !== undefined) {
      // Notify that active page has changed
      const event = new CustomEvent('page:activated', { 
        detail: { pageIndex: state.activePageIndex } 
      });
      document.dispatchEvent(event);
    }
    
    // Restore selection if available
    if (state.selection) {
      const activeEditor = this.pageEditors.get(state.activePageIndex);
      if (activeEditor) {
        activeEditor.commands.setTextSelection({
          from: state.selection.from,
          to: state.selection.to
        });
      }
    }
    
    this.isUndoRedo = false;
    
    // Update last content
    this.lastContent = JSON.stringify(state.pages);
  }

  public undo(): boolean {
    if (this.undoStack.length <= 1) {
      console.log('🔄 Nothing to undo');
      return false;
    }
    
    console.log(`🔄 Undoing (stack: ${this.undoStack.length})`);
    
    // Save current state to redo stack
    const currentState = this.collectAllPageContents();
    this.redoStack.push(currentState);
    
    // Remove current state from undo stack
    this.undoStack.pop();
    
    // Get the previous state
    const previousState = this.undoStack[this.undoStack.length - 1];
    
    if (previousState) {
      // Apply the previous state
      this.applyState(previousState);
      
      // Track the operation
      this.historyEvents.push(`Undo to state from ${new Date(previousState.timestamp).toLocaleTimeString()}`);
      return true;
    }
    
    return false;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) {
      console.log('🔄 Nothing to redo');
      return false;
    }
    
    console.log(`🔄 Redoing (stack: ${this.redoStack.length})`);
    
    // Get the next state from redo stack
    const nextState = this.redoStack.pop();
    
    if (nextState) {
      // Save current state to undo stack
      const currentState = this.collectAllPageContents();
      this.undoStack.push(currentState);
      
      // Apply the next state
      this.applyState(nextState);
      
      // Track the operation
      this.historyEvents.push(`Redo to state from ${new Date(nextState.timestamp).toLocaleTimeString()}`);
      return true;
    }
    
    return false;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getStackSizes(): { undo: number, redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }
  
  public getHistoryEvents(): string[] {
    return [...this.historyEvents];
  }
  
  // Method to manually add a history step
  public addHistoryStep(type: string = 'manual', data?: any): void {
    this.saveCurrentState(type);
    console.log(`🔄 Manual history step added (${type})`, data ? 'with data' : '');
  }
  
  // Method for cleanup
  public dispose(): void {
    console.log('🔄 Disposing history manager...');
    
    // Remove all event listeners
    document.removeEventListener('formatCommand', this.handleFormatCommand);
    document.removeEventListener('content:changed', this.handleContentChanged);
    document.removeEventListener('page:added', this.handlePageOperation);
    document.removeEventListener('page:deleted', this.handlePageOperation);
    
    // Use proper method for toolbar button event handlers
    const undoHandler = () => this.undo();
    const redoHandler = () => this.redo();
    document.removeEventListener('document:undo', undoHandler);
    document.removeEventListener('document:redo', redoHandler);
    
    // Clear all state
    this.undoStack = [];
    this.redoStack = [];
    this.pageEditors.clear();
    this.activePageIndex = 0;
    this.isUndoRedo = false;
    this.lastContent = '';
    this.historyEvents = [];
    
    // Clear global references
    globalHistoryManager = null;
    window.historyManager = undefined;
    
    console.log('🔄 History manager disposed');
  }
}

// Function to get the global history manager instance
export function getGlobalHistoryManager(): HistoryManager | null {
  return globalHistoryManager;
}