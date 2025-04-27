/**
 * Google Docs-style bullet lists implementation
 * 
 * Accurately replicates Google Docs behavior:
 * - Shows correct bullet symbol per nesting level (•, ◦, ▪, ‣)
 * - Correctly handles keyboard behaviors (Enter, Backspace, Tab)
 * - Prevents double bullets on Enter key
 * - Integrates with history manager for undo/redo
 * - Handles all indent/outdent cases properly
 */

import { mergeAttributes } from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import { Editor } from '@tiptap/react';
import { GLOBAL_FORMAT_STATE } from './format-detection';

/**
 * Custom bullet list with Google Docs-style bullets
 */
export const FinalBulletList = BulletList.extend({
  name: 'bulletList',
  
  // Add storage to track bullet list state
  addStorage() {
    return {
      bulletBackspaceState: {
        stage: 0,
        level: 0,
        lastTime: Date.now()
      },
      bulletWasRemoved: false
    };
  },
  
  addOptions() {
    return {
      ...this.parent?.(),
      itemTypeName: 'listItem',
      HTMLAttributes: {},
    };
  },
  
  addAttributes() {
    return {
      // Store the nesting level for proper bullet display
      nestLevel: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-nest-level') || '1', 10);
        },
        renderHTML: attributes => {
          return { 'data-nest-level': attributes.nestLevel || 1 };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'ul' },
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    // Determine the visual nesting level (cycles at level 5)
    const nestLevel = node.attrs.nestLevel || 1;
    const visualLevel = ((nestLevel - 1) % 4) + 1;
    
    return [
      'ul',
      mergeAttributes(HTMLAttributes, { 
        'data-nest-level': visualLevel.toString(),
        'class': 'ProseMirror-bulletlist',
      }),
      0
    ];
  },
  
  addCommands() {
    return {
      ...this.parent?.(),
      
      // Improved toggleBulletList that properly updates nesting state
      toggleBulletList: () => ({ editor }) => {
        const { commands } = editor;
        
        // First create or remove the list
        const result = commands.toggleList('bulletList', 'listItem');
        
        // Add history step - important for proper undo/redo
        if (window.historyManager) {
          window.historyManager.addHistoryStep('toggle-bullet-list');
        }
        
        // Then update UI state
        if (editor.isActive('bulletList')) {
          GLOBAL_FORMAT_STATE.setBulletList(true);
          
          // Determine nesting level
          const level = getNestingLevel(editor);
          const visualLevel = ((level - 1) % 4) + 1;
          GLOBAL_FORMAT_STATE.setBulletListLevel(visualLevel);
        } else {
          GLOBAL_FORMAT_STATE.setBulletList(false);
        }
        
        // Always notify of state change
        document.dispatchEvent(new CustomEvent('format:update'));
        
        return result;
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      // Improved Tab implementation for proper indentation
      Tab: ({ editor }) => {
        // Only apply when in bullet list
        if (!editor.isActive('bulletList')) return false;
        
        console.log('Tab pressed while in bullet list');
        
        // Use direct command
        if (editor.can().sinkListItem('listItem')) {
          // Indent (nest) the list item
          editor.chain().focus().sinkListItem('listItem').run();
          
          // Add history step
          if (window.historyManager) {
            window.historyManager.addHistoryStep('indent-bullet');
          }
          
          // Important: Update global format state for correct styling
          const level = getNestingLevel(editor);
          const visualLevel = ((level - 1) % 4) + 1;
          GLOBAL_FORMAT_STATE.setBulletListLevel(visualLevel);
          document.dispatchEvent(new CustomEvent('format:update'));
          
          // Prevent default Tab behavior
          return true;
        }
        
        // If sinkListItem isn't applicable, prevent default behavior anyway
        // This matches Google Docs where Tab doesn't move focus in lists
        return true;
      },
      
      // Improved Shift+Tab implementation
      'Shift-Tab': ({ editor }) => {
        // Only apply when in bullet list
        if (!editor.isActive('bulletList')) return false;
        
        console.log('Shift+Tab pressed while in bullet list');
        
        // Use direct command
        if (editor.can().liftListItem('listItem')) {
          // Un-nest the list item
          editor.chain().focus().liftListItem('listItem').run();
          
          // Add history step
          if (window.historyManager) {
            window.historyManager.addHistoryStep('outdent-bullet');
          }
          
          // Important: Update global format state based on current state
          if (editor.isActive('bulletList')) {
            const level = getNestingLevel(editor);
            const visualLevel = ((level - 1) % 4) + 1;
            GLOBAL_FORMAT_STATE.setBulletListLevel(visualLevel);
          } else {
            GLOBAL_FORMAT_STATE.setBulletList(false);
          }
          
          document.dispatchEvent(new CustomEvent('format:update'));
          
          return true;
        }
        
        return false;
      },
    };
  },
});

/**
 * Fixed list item that implements correct Enter/Backspace behavior
 */
export const FinalListItem = ListItem.extend({
  name: 'listItem',
  
  // Add storage for tracking bullet state
  addStorage() {
    return {
      bulletBackspaceState: {
        stage: 0,
        level: 0,
        lastTime: Date.now()
      },
      bulletWasRemoved: false
    };
  },
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},
    };
  },
  
  addAttributes() {
    return {
      // Store nesting level for appropriate bullets
      nestLevel: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-nest-level') || '1', 10);
        },
        renderHTML: attributes => {
          return { 'data-nest-level': attributes.nestLevel || 1 };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'li' },
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    // Determine the visual nesting level (cycles at level 5)
    const nestLevel = getNestLevelFromParent(node) || 1;
    const visualLevel = ((nestLevel - 1) % 4) + 1;
    
    return [
      'li',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'listItem',
        'data-nest-level': visualLevel.toString() 
      }),
      0
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      // Google Docs-style Enter key behavior for lists
      Enter: ({ editor }) => {
        // Skip if not in a list item
        if (!editor.isActive('listItem')) return false;
        
        const { state } = editor;
        const { selection } = state;
        const { empty, $from } = selection;
        
        // Handle empty list items - Google Docs behavior
        if (empty && $from.parent.content.size === 0) {
          console.log('Enter in empty list item');
          
          // Try to lift (un-nest) the item first
          if (editor.can().liftListItem('listItem')) {
            // Reduce nesting level by one
            editor.chain().focus().liftListItem('listItem').run();
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('lift-bullet-item');
            }
            
            // Update format state for toolbar display
            if (editor.isActive('bulletList')) {
              const level = getNestingLevel(editor);
              const visualLevel = ((level - 1) % 4) + 1;
              GLOBAL_FORMAT_STATE.setBulletListLevel(visualLevel);
            } else {
              GLOBAL_FORMAT_STATE.setBulletList(false);
            }
            
            document.dispatchEvent(new CustomEvent('format:update'));
            
            return true;
          } else {
            // If can't lift (already at top level), exit the list entirely
            editor.chain().focus().toggleList('bulletList', 'listItem').run();
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('exit-bullet-list');
            }
            
            // Update format state
            GLOBAL_FORMAT_STATE.setBulletList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            return true;
          }
        }
        
        // For non-empty list items, create a new bullet at same level
        if (editor.isActive('bulletList')) {
          console.log('Enter in non-empty list item');
          
          try {
            // Use the splitListItem command which properly creates a new list item
            editor.chain().focus().splitListItem('listItem').run();
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('split-bullet-item');
            }
            
            return true;
          } catch (error) {
            console.error('Error splitting list item:', error);
            // Fall back to default Enter behavior
            return false;
          }
        }
        
        return false;
      },
      
      // We now delegate backspace handling to handleEmptyBulletBackspace in custom-bullet-handler.ts
      Backspace: ({ editor }) => {
        // External handler in custom-bullet-handler.ts has the cleanest implementation
        // Just pass through
        return false;
      },
    };
  },
});

/**
 * Helper function to get the nesting level at the cursor position
 */
function getNestingLevel(editor: Editor): number {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Track how many bullet list parents we have
  let level = 0;
  
  // Traverse up the document tree to count bullet list ancestors
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'bulletList') {
      level++;
    }
  }
  
  return Math.max(1, level); // Ensure at least level 1
}

/**
 * Helper function to determine a list item's nesting level from parent nodes
 */
function getNestLevelFromParent(node: any): number {
  // Track the node's parent lists to determine nesting
  let parent = node.parent;
  let level = 1;
  
  // Walk up the tree to count bullet list ancestors
  while (parent && parent.type) {
    if (parent.type.name === 'bulletList') {
      level++;
    }
    parent = parent.parent;
  }
  
  return level;
}