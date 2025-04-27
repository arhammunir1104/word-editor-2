/**
 * Enhanced Undo/Redo Manager for Google Docs-like functionality
 * 
 * This implements an action-stack based state management system that tracks
 * atomic changes to the document.
 */

import { Editor, JSONContent } from '@tiptap/react';

// Types of actions that can be tracked for undo/redo
export enum ActionType {
  TEXT_CHANGE = 'TEXT_CHANGE',
  FORMATTING_CHANGE = 'FORMATTING_CHANGE',
  HEADER_EDIT = 'HEADER_EDIT',
  FOOTER_EDIT = 'FOOTER_EDIT',
  PAGE_LAYOUT = 'PAGE_LAYOUT'
}

// Document position for restoring cursor & scroll position
export interface DocumentPosition {
  selection?: {
    from: number;
    to: number;
    anchor: number;
    head: number;
  };
  scrollPosition?: {
    x: number;
    y: number;
  };
}

// Data captured for each transaction
export interface TransactionData {
  before: any;
  after: any;
  description: string;
}

// Action stored in the undo/redo stack
export interface HistoryAction {
  type: ActionType;
  data: TransactionData;
  position: DocumentPosition;
  timestamp: number;
  batchId?: string;
}

// Document state
export interface DocumentState {
  content: JSONContent;
  headers?: string[];
  footers?: string[];
}

class UndoManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private batchTimeWindow: number = 750; // Time window for batching typing actions (ms)
  private currentBatchId: string | null = null;
  private batchTimeout: any = null;
  private editor: Editor | null = null;

  // Initialize with an editor
  public setEditor(editor: Editor): void {
    this.editor = editor;
    this.setupListeners();
  }

  // Set up listeners to track changes
  private setupListeners(): void {
    if (!this.editor) return;
    
    // Track document changes
    this.editor.on('transaction', ({ transaction }) => {
      if (!transaction.docChanged) return;
      
      // Capture state before the change is applied
      const beforeContent = this.editor!.getJSON();
      const position = this.captureDocumentPosition();
      
      // Wait for the change to be applied
      setTimeout(() => {
        const afterContent = this.editor!.getJSON();
        
        // Skip if content didn't actually change
        if (JSON.stringify(beforeContent) === JSON.stringify(afterContent)) return;
        
        // Add to history
        this.addAction({
          type: ActionType.TEXT_CHANGE,
          data: {
            before: beforeContent,
            after: afterContent,
            description: 'Text edit'
          },
          position,
          timestamp: Date.now(),
          batchId: this.shouldBatchActions() ? this.currentBatchId! : undefined
        });
      }, 0);
    });
  }
  
  // Capture the current document position (selection and scroll)
  private captureDocumentPosition(): DocumentPosition {
    if (!this.editor || !this.editor.view) {
      return {
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        }
      };
    }
    
    try {
      const { from, to, anchor, head } = this.editor.state.selection;
      return {
        selection: { from, to, anchor, head },
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        }
      };
    } catch (error) {
      console.warn('Error capturing position:', error);
      return {
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        }
      };
    }
  }
  
  // Determine if we should batch actions (like typing)
  private shouldBatchActions(): boolean {
    if (!this.currentBatchId) {
      // Start a new batch
      this.currentBatchId = `batch-${Date.now()}`;
      
      // End the batch after the time window
      clearTimeout(this.batchTimeout);
      this.batchTimeout = setTimeout(() => {
        this.currentBatchId = null;
      }, this.batchTimeWindow);
      
      return false;
    }
    
    // We're in an active batch
    clearTimeout(this.batchTimeout);
    this.batchTimeout = setTimeout(() => {
      this.currentBatchId = null;
    }, this.batchTimeWindow);
    
    return true;
  }

  // Add an action to the history
  private addAction(action: HistoryAction): void {
    // If this action should be batched with the previous one
    if (action.batchId && this.undoStack.length > 0) {
      const lastAction = this.undoStack[this.undoStack.length - 1];
      
      if (lastAction.batchId === action.batchId) {
        // Update the previous action instead of adding a new one
        lastAction.data.after = action.data.after;
        lastAction.position = action.position;
        lastAction.timestamp = action.timestamp;
        
        // Clear redo stack
        this.redoStack = [];
        return;
      }
    }
    
    // Add a new action
    this.undoStack.push(action);
    
    // Clear redo stack since we've made a new change
    this.redoStack = [];
    
    console.log(`Added action to history: ${action.data.description}`);
  }

  // Perform an undo operation
  public undo(): void {
    if (!this.editor || this.undoStack.length === 0) {
      console.log('Nothing to undo');
      return;
    }
    
    // Get the last action
    const action = this.undoStack.pop();
    if (!action) return;
    
    // Move to redo stack
    this.redoStack.push(action);
    
    console.log(`Undoing: ${action.data.description}`);
    
    // Apply the change
    this.editor.commands.setContent(action.data.before);
    
    // Restore position
    setTimeout(() => {
      try {
        if (action.position.selection) {
          const { from, to } = action.position.selection;
          this.editor!.commands.setTextSelection({ from, to });
        }
        
        if (action.position.scrollPosition) {
          const { x, y } = action.position.scrollPosition;
          window.scrollTo(x, y);
        }
      } catch (error) {
        console.warn('Could not restore position:', error);
      }
    }, 0);
  }

  // Perform a redo operation
  public redo(): void {
    if (!this.editor || this.redoStack.length === 0) {
      console.log('Nothing to redo');
      return;
    }
    
    // Get the last undone action
    const action = this.redoStack.pop();
    if (!action) return;
    
    // Move back to undo stack
    this.undoStack.push(action);
    
    console.log(`Redoing: ${action.data.description}`);
    
    // Apply the change
    this.editor.commands.setContent(action.data.after);
    
    // Restore position
    setTimeout(() => {
      try {
        if (action.position.selection) {
          const { from, to } = action.position.selection;
          this.editor!.commands.setTextSelection({ from, to });
        }
        
        if (action.position.scrollPosition) {
          const { x, y } = action.position.scrollPosition;
          window.scrollTo(x, y);
        }
      } catch (error) {
        console.warn('Could not restore position:', error);
      }
    }, 0);
  }
  
  // Check if undo is available
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  // Check if redo is available
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  // Clear history
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatchId = null;
    clearTimeout(this.batchTimeout);
  }
}

// Export a singleton instance
export const undoManager = new UndoManager();