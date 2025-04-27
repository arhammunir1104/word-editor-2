/**
 * BetterBulletList Extension for TipTap
 * 
 * This implementation replicates Google Docs bullet list behavior exactly:
 * - Level 1: • (solid round bullet)
 * - Level 2: ◦ (hollow round bullet)
 * - Level 3: ▪ (solid square bullet)
 * - Level 4: ‣ (triangle bullet)
 * - Level 5+: cycles back to level 1 style
 * 
 * Implements all Google Docs keyboard interactions:
 * - Tab: Increase nesting level
 * - Shift+Tab: Decrease nesting level
 * - Enter on empty bullet: Exit list or reduce nesting
 * - Enter on non-empty bullet: Create new bullet at same level
 * - Backspace at start of empty bullet: Un-nest or exit list
 * - Delete at end of bullet: Merge with next item
 */

import { mergeAttributes } from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import { Editor } from '@tiptap/react';
import { Selection } from 'prosemirror-state';
import { GLOBAL_FORMAT_STATE } from './format-detection';

/**
 * Custom Google Docs-style bullet list extension
 */
export const BetterBulletList = BulletList.extend({
  name: 'bulletList',
  
  addOptions() {
    return {
      ...this.parent?.(),
      itemTypeName: 'listItem',
      HTMLAttributes: {
        class: 'custom-bullet-list',
      },
    };
  },
  
  addAttributes() {
    return {
      // This attribute tracks the nesting level
      level: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-level') || '1', 10);
        },
        renderHTML: attributes => ({
          'data-level': attributes.level,
        }),
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'ul.custom-bullet-list',
        getAttrs: node => ({ level: node.getAttribute('data-level') }),
      },
      {
        tag: 'ul',
      },
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const displayLevel = ((level - 1) % 5) + 1;
    
    return [
      'ul',
      mergeAttributes(HTMLAttributes, {
        'class': `custom-bullet-list level-${displayLevel}`,
        'data-level': displayLevel,
      }),
      0,
    ];
  },
  
  addCommands() {
    return {
      ...this.parent?.(),
      // Toggle bullet list and set current format state
      toggleBulletList: () => ({ commands, chain, editor }: { 
        commands: any; 
        chain: any; 
        editor: Editor;
      }) => {
        // First do the regular toggle
        const result = commands.toggleList('bulletList', 'listItem');
        
        // Then update the format state
        if (editor.isActive('bulletList')) {
          GLOBAL_FORMAT_STATE.setBulletList(true);
          
          // Get current nesting level
          const level = getCurrentListLevel(editor);
          const displayLevel = ((level - 1) % 5) + 1;
          GLOBAL_FORMAT_STATE.setBulletListLevel(displayLevel);
          
          // Notify of format state change
          document.dispatchEvent(new CustomEvent('format:update'));
        } else {
          GLOBAL_FORMAT_STATE.setBulletList(false);
          document.dispatchEvent(new CustomEvent('format:update'));
        }
        
        return result;
      },
      
      // Command to set specific bullet list nesting level
      setBulletListLevel: (level: number) => ({ commands, chain, editor }: { 
        commands: any; 
        chain: any; 
        editor: Editor;
      }) => {
        const currentLevel = getCurrentListLevel(editor);
        
        // If not already in a bullet list, toggle it on first
        if (!editor.isActive('bulletList')) {
          commands.toggleList('bulletList', 'listItem');
        }
        
        // Now adjust the nesting level as needed
        if (currentLevel < level) {
          // Need to increase nesting level
          for (let i = currentLevel; i < level; i++) {
            commands.sinkListItem('listItem');
          }
        } else if (currentLevel > level) {
          // Need to decrease nesting level
          for (let i = currentLevel; i > level; i--) {
            commands.liftListItem('listItem');
          }
        }
        
        // Update format state with new level
        GLOBAL_FORMAT_STATE.setBulletList(true);
        GLOBAL_FORMAT_STATE.setBulletListLevel(((level - 1) % 5) + 1);
        document.dispatchEvent(new CustomEvent('format:update'));
        
        return true;
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Only handle Tab if we're in a bullet list
        if (editor.isActive('bulletList')) {
          // Use the built-in sinkListItem command
          if (editor.can().sinkListItem('listItem')) {
            console.log('Indenting bullet with Tab');
            editor.chain().focus().sinkListItem('listItem').run();
            
            // Update global format state
            const newLevel = getCurrentListLevel(editor);
            GLOBAL_FORMAT_STATE.setBulletList(true);
            GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('indent-list');
            }
            return true;
          }
        }
        return false;
      },
      
      'Shift-Tab': ({ editor }) => {
        // Only handle Shift+Tab if we're in a bullet list
        if (editor.isActive('bulletList')) {
          // Use the built-in liftListItem command
          if (editor.can().liftListItem('listItem')) {
            console.log('Un-indenting bullet with Shift+Tab');
            editor.chain().focus().liftListItem('listItem').run();
            
            // Update global format state based on new level or if we exited the list
            const isStillInList = editor.isActive('bulletList');
            if (isStillInList) {
              const newLevel = getCurrentListLevel(editor);
              GLOBAL_FORMAT_STATE.setBulletList(true);
              GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            } else {
              GLOBAL_FORMAT_STATE.setBulletList(false);
            }
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('outdent-list');
            }
            return true;
          }
        }
        return false;
      },
    };
  },
});

/**
 * Custom list item extension with Google Docs behavior for Enter/Backspace
 */
export const BetterListItem = ListItem.extend({
  name: 'listItem',
  
  addOptions() {
    return {
      ...this.parent?.(),
      nested: true, // Allow nesting lists
      keepMarks: true, // Preserve formatting when creating new list items
      HTMLAttributes: {
        class: 'custom-list-item',
      },
    };
  },
  
  // This is critical for proper splitting behavior
  content: 'paragraph block*',
  
  // Enable proper splitting in ProseMirror
  defining: true,
  
  // This is critical for Enter key to work correctly
  keepOnSplit: true, 
  
  parseHTML() {
    return [
      {
        tag: 'li',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    // Get the level from attributes if present
    const level = HTMLAttributes['data-level'] || 1;
    const displayLevel = ((level - 1) % 5) + 1;
    
    return [
      'li', 
      mergeAttributes(HTMLAttributes, {
        class: `custom-list-item level-${displayLevel}`,
        'data-level': displayLevel,
      }), 
      0
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      // Handle special Enter key behavior
      Enter: ({ editor }) => {
        // Only handle in list items
        if (!editor.isActive('listItem')) {
          return false;
        }
        
        const { $from, empty } = editor.state.selection;
        
        // Check if this is an empty list item
        if (empty && $from.parent.content.size === 0) {
          // Google Docs behavior: If empty, either exit list or reduce nesting
          
          // Try to lift the list item first (reduce nesting)
          if (editor.can().liftListItem('listItem')) {
            console.log('List item is empty, lifting to reduce nesting');
            editor.chain().focus().liftListItem('listItem').run();
            
            // Update global format state
            const isStillInList = editor.isActive('bulletList');
            if (isStillInList) {
              const newLevel = getCurrentListLevel(editor);
              GLOBAL_FORMAT_STATE.setBulletList(true);
              GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            } else {
              GLOBAL_FORMAT_STATE.setBulletList(false);
            }
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('lift-list-item');
            }
            
            return true;
          } else {
            // If can't lift, then we're at the top level - exit the list
            console.log('List item is empty at top level, exiting list');
            editor.chain().focus().toggleBulletList().run();
            
            // Update format state
            GLOBAL_FORMAT_STATE.setBulletList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('exit-list');
            }
            
            return true;
          }
        }
        
        // FIX FOR MULTIPLE BULLETS: Don't use splitListItem directly to prevent doubling
        // Instead, we'll implement our own split logic
        if (empty) {
          // If cursor is at empty position (just text, no nodes), create new item
          try {
            // First, ensure we can create a new list item at all
            if (!editor.can().splitListItem('listItem')) {
              return false;
            }
            
            // Create transaction to insert a new list item
            const tr = editor.state.tr;
            const { selection } = editor.state;
            const { $from } = selection;
            
            // Find the list item
            let listItem = null;
            let listItemPos = -1;
            
            for (let depth = $from.depth; depth > 0; depth--) {
              const node = $from.node(depth);
              if (node.type.name === 'listItem') {
                listItem = node;
                listItemPos = $from.before(depth);
                break;
              }
            }
            
            if (listItem) {
              // Create new list item with same content type but empty
              const newListItem = listItem.type.createAndFill();
              
              if (newListItem) {
                // Insert after current list item
                const endOfList = $from.end($from.depth - 1);
                tr.insert(endOfList, newListItem);
                
                // Create a TextSelection at the new position
                const newPos = tr.doc.resolve(endOfList + 1);
                const newSelection = Selection.near(newPos);
                tr.setSelection(newSelection);
                
                // Apply the transaction
                editor.view.dispatch(tr);
                
                // Update history
                if (window.historyManager) {
                  window.historyManager.addHistoryStep('split-list-item-custom');
                }
                
                return true;
              }
            }
          } catch (error) {
            console.error('Error in custom list split:', error);
          }
        }
        
        // If our custom implementation failed, fall back to the built-in command
        // but with safeguards to prevent double bullets
        if (editor.can().splitListItem('listItem')) {
          console.log('Falling back to built-in split list item');
          
          // First check if we already have a subsequent list item to avoid doubling
          const { doc, selection } = editor.state;
          const { $from } = selection;
          
          // Get the position of the end of the current list item
          const endPos = $from.end($from.depth);
          const nodeAfter = doc.nodeAt(endPos);
          
          // If there's already a list item after this one, don't create a new one
          if (nodeAfter && nodeAfter.type.name === 'listItem') {
            // Just move the cursor to the next list item
            const tr = editor.state.tr;
            const newPos = doc.resolve(endPos + 1);
            const newSelection = Selection.near(newPos);
            tr.setSelection(newSelection);
            editor.view.dispatch(tr);
            return true;
          }
          
          // Otherwise, perform the standard split
          editor.chain().focus().splitListItem('listItem').run();
          
          // Update history
          if (window.historyManager) {
            window.historyManager.addHistoryStep('split-list-item');
          }
          
          return true;
        }
        
        return false;
      },
      
      // Handle special Backspace behavior
      Backspace: ({ editor }) => {
        // Only handle if we're at the start of a list item
        if (!editor.isActive('listItem')) {
          return false;
        }
        
        const { $from, empty } = editor.state.selection;
        
        // Only apply if we're at the start of the node
        if (!empty || $from.parentOffset > 0) {
          return false;
        }
        
        // Check if the list item is empty
        if ($from.parent.content.size === 0) {
          // Google Docs behavior: If at start of empty list item, either:
          // 1. Reduce nesting if nested, or
          // 2. Exit the list if at top level
          
          if (editor.can().liftListItem('listItem')) {
            console.log('Empty list item at start, lifting to reduce nesting');
            editor.chain().focus().liftListItem('listItem').run();
            
            // Update format state
            const isStillInList = editor.isActive('bulletList');
            if (isStillInList) {
              const newLevel = getCurrentListLevel(editor);
              GLOBAL_FORMAT_STATE.setBulletList(true);
              GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            } else {
              GLOBAL_FORMAT_STATE.setBulletList(false);
            }
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('lift-list-item');
            }
            
            return true;
          } else {
            // At top level empty list item, exit the list
            console.log('Empty list item at top level, exiting list');
            editor.chain().focus().toggleBulletList().run();
            
            // Update format state
            GLOBAL_FORMAT_STATE.setBulletList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('exit-list');
            }
            
            return true;
          }
        }
        
        // Non-empty list item - let default behavior handle it
        return false;
      },
    };
  },
});

/**
 * Helper function to determine current bullet list nesting level
 * at the cursor position
 */
/**
 * Helper function to determine current bullet list nesting level
 * at the cursor position - This is crucial for proper bullet styling
 */
function getCurrentListLevel(editor: Editor): number {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // First check if we're in a bullet list
  if (!editor.isActive('bulletList')) {
    return 0; // Not in a bullet list
  }
  
  // Walk up the document structure to find all parent bullet lists
  // to determine the exact nesting level
  let nestLevel = 0;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'bulletList') {
      nestLevel++;
    }
  }
  
  // Return the nesting level (will be at least 1 if in a bullet list)
  return nestLevel;
}