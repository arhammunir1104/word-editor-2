/**
 * Google Docs Numbered List Backspace Handler
 * 
 * Implements EXACT Google Docs backspace behavior in multiple stages for numbered lists:
 * 1. First backspace in empty numbered item: Remove ONLY the number, keep position/indentation
 * 2. Subsequent backspaces: Reduce indentation levels ONE BY ONE
 * 3. Final backspace: Only after ALL indentation is gone, go to previous line
 * 
 * This matches Google Docs behavior exactly.
 */

import { Editor } from '@tiptap/react';
import { GLOBAL_FORMAT_STATE } from './format-detection';

// Track backspace state globally across the editor
let backspaceStage = 0;
let lastOperationTime = 0;
let lastIndentation = 0;

/**
 * Main handler for multi-stage backspace in numbered lists
 * This fully implements Google Docs exact backspace behavior
 */
export function handleBackspaceInNumberedLists(editor: Editor): boolean {
  // Get selection details
  const { selection } = editor.state;
  const { empty, $from } = selection;
  
  // Only handle for empty nodes at start position
  if (!empty || $from.parentOffset > 0) return false;
  if ($from.parent.content.size > 0) return false; 
  
  // Reset stage if too much time passed (1.5 seconds)
  const now = Date.now();
  if (now - lastOperationTime > 1500) {
    console.log('Resetting numbering backspace stage due to timeout');
    backspaceStage = 0;
  }
  
  // Update timestamp
  lastOperationTime = now;
  
  // SCENARIO 1: EMPTY ORDERED LIST ITEM - FIRST BACKSPACE
  if (backspaceStage === 0 && editor.isActive('orderedList') && editor.isActive('listItem')) {
    console.log('STAGE 1: NUMBER REMOVAL - Removing number but keeping position');
    
    // Get current nesting level
    const currentLevel = getNestingLevel(editor);
    lastIndentation = (currentLevel - 1) * 24;
    
    // Convert from numbered list to paragraph (removes the number)
    editor.chain().focus()
      .toggleList('orderedList', 'listItem')
      .run();
    
    // Apply indentation to maintain position exactly
    if (currentLevel > 1) {
      editor.chain().focus()
        .updateAttributes('paragraph', {
          style: `margin-left: ${lastIndentation}px;`
        })
        .run();
    }
    
    // Update UI state
    GLOBAL_FORMAT_STATE.setOrderedList(false);
    document.dispatchEvent(new CustomEvent('format:update'));
    
    // Add to history
    if (window.historyManager) {
      window.historyManager.addHistoryStep('remove-number-keep-position');
    }
    
    // Update stage for next backspace
    backspaceStage = 1;
    
    return true;
  }
  
  // SCENARIO 2: PARAGRAPH WITH INDENTATION - SUBSEQUENT BACKSPACES
  // This is shared with bullet lists, but keeping separate for clarity
  if (backspaceStage >= 1 && editor.isActive('paragraph')) {
    // Get the paragraph node
    const node = $from.node();
    const style = node.attrs.style || '';
    
    console.log('STAGE 2+: INDENTATION REDUCTION - Handling numbered list paragraph backspace, style:', style);
    
    // Check if paragraph has indentation to decrease
    if (style.includes('margin-left')) {
      // Extract current indentation
      const match = style.match(/margin-left:\s*(\d+)px/);
      if (match && match[1]) {
        const currentIndent = parseInt(match[1]);
        
        if (currentIndent > 0) {
          // Reduce by one level (24px) exactly like Google Docs
          const newIndent = Math.max(0, currentIndent - 24);
          console.log(`Reducing indentation: ${currentIndent}px -> ${newIndent}px`);
          
          // Apply the new indentation
          if (newIndent === 0) {
            // Remove indentation style completely
            editor.chain().focus()
              .updateAttributes('paragraph', { style: '' })
              .run();
          } else {
            // Apply reduced indentation
            editor.chain().focus()
              .updateAttributes('paragraph', {
                style: `margin-left: ${newIndent}px;`
              })
              .run();
          }
          
          // Add to history
          if (window.historyManager) {
            window.historyManager.addHistoryStep('decrease-indent');
          }
          
          // Maintain stage for further indentation reductions
          return true;
        }
      }
    }
    
    // No more indentation to reduce, move to final stage
    console.log('STAGE 3: EXIT - No more indentation, allowing cursor to previous line');
    backspaceStage = 0; // Reset for future operations
    return false; // Let default backspace behavior happen (go to previous line)
  }

  // For any other case, let the default behavior happen
  return false;
}

/**
 * Calculates nesting level at cursor position
 */
function getNestingLevel(editor: Editor): number {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Count ordered list ancestors
  let level = 0;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'orderedList') {
      level++;
    }
  }
  
  return Math.max(1, level); // Ensure at least level 1
}