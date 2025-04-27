/**
 * Enhanced backspace handler for ordered lists to match Google Docs exact behavior:
 * 
 * 1. FIRST backspace in empty item: Remove ONLY the bullet while keeping position and indentation
 * 2. SECOND backspace: Decrease indentation by one level (if there are levels to decrease)
 * 3. THIRD backspace: Only after ALL indentation is removed, move to the previous line
 */

import { Editor } from '@tiptap/react';
import { GLOBAL_FORMAT_STATE } from './format-detection';

// Define the state of an empty list item (with 3 phases of backspacing)
enum EmptyItemBackspaceState {
  NOT_EMPTY = 0,             // List item has content
  PHASE_1_REMOVE_MARKER = 1, // First backspace - remove only the bullet/number
  PHASE_2_DECREASE_INDENT = 2, // Second backspace - decrease indentation level
  PHASE_3_EXIT_LIST = 3      // Third backspace - move to previous line
}

/**
 * Tracks the current state of backspacing in an empty list item
 * Resets when cursor moves or item content changes
 */
const emptyItemState = {
  // Track the position and backspace phase
  pos: -1,
  phase: EmptyItemBackspaceState.NOT_EMPTY,
  
  // Helper to determine if we're in the same position
  isSamePos(currentPos: number): boolean {
    return this.pos === currentPos;
  },
  
  // Set the position and increment the phase if it's the same position
  updatePos(currentPos: number): void {
    if (this.isSamePos(currentPos)) {
      this.phase += 1;
    } else {
      this.pos = currentPos;
      this.phase = EmptyItemBackspaceState.PHASE_1_REMOVE_MARKER;
    }
  },
  
  // Reset when cursor moves or content changes
  reset(): void {
    this.pos = -1;
    this.phase = EmptyItemBackspaceState.NOT_EMPTY;
  }
};

/**
 * Handler function for backspace in numbered lists
 * 
 * Implements Google Docs three-stage backspace behavior:
 * 1. First remove just the number/marker
 * 2. Then decrease indentation level by level
 * 3. Finally connect with the previous paragraph
 */
export function handleBackspaceInNumberedLists(editor: Editor): boolean {
  if (!editor || !editor.state) return false;
  
  const { selection } = editor.state;
  const { $from, empty } = selection;
  
  // Only handle if we're in an ordered list, at the start of an empty list item
  const isListItem = $from.parent.type.name === 'listItem';
  const isOrderedList = $from.node($from.depth - 1)?.type.name === 'orderedList';
  
  if (!isListItem || !isOrderedList) {
    emptyItemState.reset(); // Reset if not in a list item
    return false;
  }
  
  // Check if it's an empty list item
  const isEmpty = $from.parent.content.size === 0;
  
  // Only process empty list items
  if (!empty || !isEmpty) {
    emptyItemState.reset(); // Reset if item is not empty
    return false;
  }
  
  // Check cursor position - must be at start of the item
  const isAtStart = $from.parentOffset === 0;
  if (!isAtStart) {
    emptyItemState.reset();
    return false;
  }
  
  // Update the backspace state for this position
  emptyItemState.updatePos($from.pos);
  
  // Handle based on the current phase
  switch (emptyItemState.phase) {
    case EmptyItemBackspaceState.PHASE_1_REMOVE_MARKER:
      // FIRST BACKSPACE: Toggle off ordered list but keep cursor position
      // This effectively removes only the number/bullet
      
      // First, we need to check if this is already a paragraph
      if (!isOrderedList) {
        emptyItemState.reset();
        return false;
      }
      
      // Use direct command to convert list item to paragraph (avoiding toggleList)
      editor.chain()
        .focus()
        .liftListItem('listItem')
        .run();
      
      // Update global format state
      GLOBAL_FORMAT_STATE.setOrderedList(false);
      document.dispatchEvent(new CustomEvent('format:update'));
      
      // Add history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('ordered-list-backspace-remove-marker');
      }
      
      return true;
      
    case EmptyItemBackspaceState.PHASE_2_DECREASE_INDENT:
      // SECOND BACKSPACE: Decrease indentation level if possible
      
      // Check if we can lift (reduce indentation)
      if (editor.can().liftListItem('listItem')) {
        // Lift the list item to reduce indentation
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('ordered-list-backspace-decrease-indent');
        }
        
        return true;
      }
      
      // If we can't decrease indentation further, move to phase 3
      emptyItemState.phase = EmptyItemBackspaceState.PHASE_3_EXIT_LIST;
      return handleBackspaceInNumberedLists(editor);
      
    case EmptyItemBackspaceState.PHASE_3_EXIT_LIST:
      // THIRD BACKSPACE: exit the list entirely or join with previous node
      
      // Let the default backspace behavior handle this
      // but make sure we reset our state so next backspace behaves normally
      emptyItemState.reset();
      
      // Toggle off the list completely using direct command (avoiding toggleList)
      editor.chain()
        .focus()
        .liftListItem('listItem')
        .run();
      
      // Update UI state
      GLOBAL_FORMAT_STATE.setOrderedList(false);
      document.dispatchEvent(new CustomEvent('format:update'));
      
      // Add to history
      if (window.historyManager) {
        window.historyManager.addHistoryStep('exit-ordered-list');
      }
      
      return true;
      
    default:
      return false;
  }
}

// Add an extension that hooks up to editor events to reset the backspace state
import { Extension } from '@tiptap/core';

export const OrderedBackspaceExtension = Extension.create({
  name: 'ordered-backspace-handler',
  
  // Reset state on various editor events
  onSelectionUpdate() {
    emptyItemState.reset();
  },
  
  onBlur() {
    emptyItemState.reset();
  },
  
  onFocus() {
    emptyItemState.reset();
  }
});