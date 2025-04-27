/**
 * Custom Bullet List Backspace Handler for Google Docs-like behavior
 * 
 * Implements EXACT Google Docs backspace behavior in bullet lists:
 * - First backspace in empty bullet: Remove ONLY the bullet, keep cursor aligned
 * - Second backspace: Reduce indentation level (without moving cursor to prev line)
 * - Additional backspaces: Continue reducing indentation one level at a time
 */

import { Editor } from '@tiptap/react';
import { GLOBAL_FORMAT_STATE } from './format-detection';

// Holds backspace state across all editor instances
let backspaceStage = 0;
let lastBulletLevel = 0;
let lastBackspaceTime = 0;
let handlingMultiLevelIndent = false;

/**
 * Handles backspace in empty bullet list items and paragraphs created from bullets 
 * Implements EXACT Google Docs behavior for all stages
 */
export function handleEmptyBulletBackspace(editor: Editor): boolean {
  // HANDLE BULLETS:
  // Case 1: Check if we're at the start of an empty bullet list item
  if (editor.isActive('bulletList') && editor.isActive('listItem')) {
    // Get selection details
    const { selection } = editor.state;
    const { empty, $from } = selection;
    
    // Only handle if at start of list item and the item is empty
    if (!empty || $from.parentOffset > 0) return false;
    if ($from.parent.content.size > 0) return false;
    
    console.log('Empty bullet detected, stage:', backspaceStage);
    
    // Get current nesting level
    const currentLevel = getNestingLevel(editor);
    
    // Reset stage if too much time passed (1.5 seconds)
    const now = Date.now();
    if (now - lastBackspaceTime > 1500) {
      backspaceStage = 0;
    }
    lastBackspaceTime = now;
    
    // FIRST BACKSPACE IN EMPTY BULLET
    // Goal: ONLY remove bullet formatting but KEEP exact position
    if (backspaceStage === 0) {
      console.log('FIRST BACKSPACE - removing just the bullet');
      
      // Save level for later stages
      lastBulletLevel = currentLevel;
      backspaceStage = 1;
      
      // First, completely convert from bullet to paragraph (removes bullet)
      editor.chain().focus()
        .toggleList('bulletList', 'listItem')
        .run();
      
      // Next, apply indentation to maintain position
      if (currentLevel > 1) {
        const indentPx = (currentLevel - 1) * 24;
        editor.chain().focus()
          .updateAttributes('paragraph', {
            style: `margin-left: ${indentPx}px;`
          })
          .run();
      }
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('remove-bullet-keep-position');
      }
      
      // Update UI state
      GLOBAL_FORMAT_STATE.setBulletList(false);
      document.dispatchEvent(new CustomEvent('format:update'));
      
      return true;
    }
    
    return false; // Shouldn't reach here in bullet case
  }
  
  // HANDLE PARAGRAPHS (previously converted from bullets):
  // Case 2: Check for empty paragraph at start position that needs indentation handling
  else if (editor.isActive('paragraph')) {
    // Get selection details
    const { selection } = editor.state;
    const { empty, $from } = selection;
    
    // Only handle if at start of paragraph and it's empty
    if (!empty || $from.parentOffset > 0) return false;
    if ($from.parent.content.size > 0) return false;
    
    // Get paragraph node and style
    const node = $from.node();
    const style = node.attrs.style || '';
    
    // Reset stage if too much time passed
    const now = Date.now();
    if (now - lastBackspaceTime > 1500) {
      backspaceStage = 0;
    }
    lastBackspaceTime = now;
    
    // SECOND BACKSPACE - After bullet was removed, now reduce indentation
    if (backspaceStage === 1) {
      console.log('SECOND BACKSPACE - reducing indentation by one level');
      
      if (style.includes('margin-left')) {
        // Get current indentation
        const match = style.match(/margin-left:\s*(\d+)px/);
        if (match && match[1]) {
          const currentIndent = parseInt(match[1]);
          
          if (currentIndent > 0) {
            // Reduce by one level (24px)
            const newIndent = Math.max(0, currentIndent - 24);
            
            // Update stage for next backspace
            backspaceStage = (newIndent === 0) ? 2 : 1;
            
            // Apply new indentation or remove style
            if (newIndent === 0) {
              editor.chain().focus()
                .updateAttributes('paragraph', { style: '' })
                .run();
            } else {
              editor.chain().focus()
                .updateAttributes('paragraph', {
                  style: `margin-left: ${newIndent}px;`
                })
                .run();
            }
            
            // Record history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('decrease-indent');
            }
            
            return true;
          }
        }
      }
      
      // If no indentation, move to next stage
      backspaceStage = 2;
      return true; // Prevent default behavior
    }
    
    // THIRD BACKSPACE - Now let it go to previous line
    else if (backspaceStage === 2) {
      console.log('THIRD BACKSPACE - now let default behavior happen');
      backspaceStage = 0; // Reset for future bullets
      
      // Allow the editor to go to previous line by NOT handling the event
      return false;
    }
  }
  
  return false; // For any other case, let default behavior happen
}

/**
 * Gets the nesting level at the cursor position
 */
function getNestingLevel(editor: Editor): number {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Count bullet list ancestors
  let level = 0;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'bulletList') {
      level++;
    }
  }
  
  return Math.max(1, level); // Ensure at least level 1
}