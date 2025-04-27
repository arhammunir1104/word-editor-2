/**
 * FixedBulletList Extension for TipTap
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
import { TextSelection } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { GLOBAL_FORMAT_STATE } from './format-detection';

/**
 * Custom Google Docs-style bullet list extension
 */
export const FixedBulletList = BulletList.extend({
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
        console.log('Toggling bullet list');
        
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
export const FixedListItem = ListItem.extend({
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
  
  // These are critical for proper splitting behavior
  content: 'paragraph block*',
  defining: true,
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
      // Handle special Enter key behavior - COMPLETE REWRITE TO FIX DUPLICATE BULLETS
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
        
        // COMPLETELY NEW APPROACH TO PREVENT DOUBLE BULLETS
        // Instead of using default behaviors, we'll manually handle the Enter key
        try {
          // Create direct PM transaction for precise control
          const state = editor.state;
          const { tr } = state;
          const { selection } = state;
          const { $from, $to } = selection;
          
          // Find the list item node and its position
          let listItem: ProseMirrorNode | null = null;
          let listItemPos = -1;
          
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'listItem') {
              listItem = node;
              listItemPos = $from.before(depth);
              break;
            }
          }
          
          if (!listItem) {
            console.log('Could not find list item node');
            return false;
          }
          
          console.log('Creating new list item manually');
          
          // Split the content at cursor position to get text before/after
          const endOfNode = $from.end();
          const contentAfterCursor = state.doc.textBetween(
            $from.pos,
            endOfNode,
            '\n'
          );
          
          // If cursor is in middle of text, we need to split the text
          if (contentAfterCursor.length > 0) {
            // Regular split behavior - create new item with text after cursor
            const listType = state.schema.nodes.bulletList;
            const listItemType = state.schema.nodes.listItem;
            const paraType = state.schema.nodes.paragraph;
            
            // Create paragraph with remaining text
            const newPara = paraType.create(
              null,
              contentAfterCursor.length > 0 
                ? state.schema.text(contentAfterCursor) 
                : null
            );
            
            // Create new list item with the paragraph
            const newListItem = listItemType.create(null, newPara);
            
            // Delete content after cursor in current item
            tr.deleteRange($from.pos, endOfNode);
            
            // Insert new list item after current one
            const insertPos = $from.after(1);
            tr.insert(insertPos, newListItem);
            
            // Place cursor in new list item
            const newPos = insertPos + 2; // +2 to get inside paragraph 
            tr.setSelection(TextSelection.create(tr.doc, newPos));
            
            editor.view.dispatch(tr);
            return true;
          } else {
            // Cursor at end of text - create empty list item
            const listItemType = state.schema.nodes.listItem;
            const paraType = state.schema.nodes.paragraph;
            
            // Create an empty paragraph
            const newPara = paraType.create();
            
            // Create new empty list item 
            const newListItem = listItemType.create(null, newPara);
            
            // Insert new list item after current one
            const insertPos = $from.after(1);
            tr.insert(insertPos, newListItem);
            
            // Place cursor in new list item
            const newPos = insertPos + 2; // +2 to get inside paragraph
            tr.setSelection(TextSelection.create(tr.doc, newPos));
            
            editor.view.dispatch(tr);
            
            // Update history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('create-list-item');
            }
            
            return true;
          }
        } catch (error) {
          console.error('Error in manual list item creation:', error);
        }
        
        // If our custom approach fails, fall back to built-in behavior
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
function getCurrentListLevel(editor: Editor): number {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // First check if we're in a bullet list
  if (!editor.isActive('bulletList')) {
    return 0; // Not in a bullet list
  }
  
  // Track each bullet list level we encounter as we move up the tree
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