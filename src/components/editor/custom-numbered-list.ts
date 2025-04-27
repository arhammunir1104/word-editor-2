/**
 * Final Ordered List Extension for TipTap
 * 
 * This implementation replicates Google Docs ordered/numbered list behavior exactly:
 * - Level 1: 1. 2. 3. (numbers)
 * - Level 2: a. b. c. (lowercase letters)
 * - Level 3: i. ii. iii. (lowercase roman numerals)
 * - Level 4: A. B. C. (uppercase letters)
 * - Level 5+: cycles back to level 1 style
 * 
 * Implements all Google Docs keyboard interactions:
 * - Tab: Increase nesting level
 * - Shift+Tab: Decrease nesting level
 * - Enter on empty item: Exit list or reduce nesting
 * - Enter on non-empty item: Create new item at same level
 * - Backspace at start of empty item: Un-nest or exit list
 * - Delete at end of item: Merge with next item
 */

import { mergeAttributes, Extension } from '@tiptap/core';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Editor } from '@tiptap/core';
import { GLOBAL_FORMAT_STATE } from './format-detection';
import { Plugin, PluginKey } from 'prosemirror-state';
import { handleBackspaceInNumberedLists } from './ordered-backspace';

// Function to properly sanitize CSS classnames
function sanitizeClass(className: string): string {
  return className.replace(/[^\w-]/g, '');
}

/**
 * Helper function to determine the actual nesting level at a position in the document
 * Returns the number of levels deep we are (1 = top level, 2 = first nested, etc.)
 */
function calculateOrderedListNestingLevel(editor: Editor, pos?: number): number {
  if (!editor || !editor.state) return 1;
  
  // Use the current selection if no position is provided
  const resolvedPos = pos !== undefined 
    ? editor.state.doc.resolve(pos) 
    : editor.state.selection.$from;
  
  // Traverse upward to count ordered list ancestors
  let level = 0;
  
  for (let depth = resolvedPos.depth; depth > 0; depth--) {
    const node = resolvedPos.node(depth);
    if (node && node.type.name === 'orderedList') {
      level++;
    }
  }
  
  return Math.max(1, level); // Minimum level is 1
}

/**
 * Returns the appropriate CSS class for ordered list nesting level
 */
function getOrderedListClassForLevel(level: number): string {
  // Use modulo to cycle through our 4 list types (1-4)
  const normalizedLevel = ((level - 1) % 4) + 1;
  return `numbered-list-l${normalizedLevel}`;
}

/**
 * Auto-update classes for ordered lists based on nesting level
 */
const OrderedListStylesPlugin = new Plugin({
  key: new PluginKey('ordered-list-styles'),
  appendTransaction: (transactions, oldState, newState) => {
    // Skip if there were no content changes
    if (!transactions.some(tr => tr.docChanged)) return null;
    
    // After editor initializes, set a short timeout to let the DOM settle
    setTimeout(() => {
      // Find all ordered lists in the document and apply appropriate styling
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) return;
      
      const orderedLists = editorElement.querySelectorAll('ol[data-type="orderedList"]');
      
      orderedLists.forEach(listElement => {
        // Calculate the nesting level by counting parent ordered lists
        let level = 1; // Start at level 1 (top level)
        let parent = listElement.parentElement;
        
        while (parent) {
          if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
            level++;
          }
          parent = parent.parentElement;
        }
        
        // Apply the appropriate class for this level
        const levelClass = getOrderedListClassForLevel(level);
        
        // Remove any existing level classes
        for (let i = 1; i <= 4; i++) {
          listElement.classList.remove(`numbered-list-l${i}`);
        }
        
        // Add the correct level class
        listElement.classList.add(levelClass);
        listElement.setAttribute('data-level', level.toString());
      });
    }, 0);
    
    return null;
  },
});

/**
 * Custom Google Docs-style ordered list extension with proper nesting support
 */
export const CustomNumberedList = OrderedList.extend({
  name: 'orderedList',
  
  addOptions() {
    return {
      ...this.parent?.(),
      itemTypeName: 'listItem',
      HTMLAttributes: {
        class: 'numbered-list-l1', // Default class
      },
      keepMarks: true,
      keepAttributes: true,
    };
  },
  
  addAttributes() {
    return {
      // Add level attribute for styling
      level: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-level') || '1', 10);
        },
        renderHTML: attributes => {
          return { 'data-level': attributes.level };
        },
      },
      // Standard attributes for ordered lists
      start: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('start') || '1', 10);
        },
        renderHTML: attributes => {
          if (attributes.start === 1) {
            return {};
          }
          return { start: attributes.start };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'ol',
      },
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    // Always include the base class for styling
    const attrs = { ...HTMLAttributes };
    
    // Apply default styling that will be updated by the plugin
    attrs.class = 'numbered-list-l1'; // Initial class
    attrs['data-level'] = '1'; // Initial level
    
    return ['ol', mergeAttributes(attrs), 0];
  },
  
  addProseMirrorPlugins() {
    return [OrderedListStylesPlugin];
  },
  
  addCommands() {
    return {
      // We'll use a direct approach without relying on recursive calls
      toggleList: () => ({ editor }) => {
        // Get current state
        const isActive = editor.isActive('orderedList');
        
        // Update global format state UI
        GLOBAL_FORMAT_STATE.setOrderedList(!isActive);
        document.dispatchEvent(new CustomEvent('format:update'));
        
        // Use underlying core commands to prevent stack overflow
        let success = false;
        
        if (isActive) {
          // If active, convert to paragraphs
          success = editor.chain().focus().liftListItem('listItem').run();
        } else {
          // If not active, convert to ordered list
          success = editor.chain().focus().wrapInList('orderedList').run();
        }
        
        // Add a small delay to update styling after DOM changes
        setTimeout(() => {
          try {
            const editorElement = editor.view.dom;
            if (!editorElement) return;
            
            // Update all ordered lists with appropriate classes
            const orderedLists = editorElement.querySelectorAll('ol[data-type="orderedList"]');
            orderedLists.forEach(list => {
              // Determine nesting level
              let level = 1;
              let parent = list.parentElement;
              
              while (parent) {
                if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                  level++;
                }
                parent = parent.parentElement;
              }
              
              // Apply the correct class based on the nesting level
              const levelClass = getOrderedListClassForLevel(level);
              
              // Remove existing level classes
              for (let i = 1; i <= 4; i++) {
                list.classList.remove(`numbered-list-l${i}`);
              }
              
              // Add appropriate class and data attribute
              list.classList.add(levelClass);
              list.setAttribute('data-level', level.toString());
            });
          } catch (error) {
            console.error('Error updating ordered list styles:', error);
          }
        }, 10);
        
        // Add step to history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('toggle-ordered-list');
        }
        
        return success;
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      // Tab: Increase nesting level (indent)
      Tab: ({ editor }) => {
        // Only handle if we're in an ordered list
        if (!editor.isActive('orderedList')) {
          return false;
        }
        
        // Sink the list item to increase indentation
        if (editor.can().sinkListItem('listItem')) {
          editor.chain().focus().sinkListItem('listItem').run();
          
          // Record history step
          if (window.historyManager) {
            window.historyManager.addHistoryStep('numbered-list-indent');
          }
          
          // Dispatch an event for other components to react
          document.dispatchEvent(new CustomEvent('orderedList:indented'));
          
          return true;
        }
        
        // Return true even if we can't sink further to prevent default tab behavior
        return true;
      },
      
      // Shift+Tab: Decrease nesting level (outdent)
      'Shift-Tab': ({ editor }) => {
        // Only handle if we're in an ordered list
        if (!editor.isActive('orderedList')) {
          return false;
        }
        
        // Lift the list item to decrease indentation
        if (editor.can().liftListItem('listItem')) {
          editor.chain().focus().liftListItem('listItem').run();
          
          // Record history step
          if (window.historyManager) {
            window.historyManager.addHistoryStep('numbered-list-outdent');
          }
          
          // Dispatch an event for other components to react
          document.dispatchEvent(new CustomEvent('orderedList:outdented'));
          
          return true;
        }
        
        // Return true even if we can't lift further to prevent default behavior
        return true;
      },
      
      // Backspace: Special handling for empty list items
      Backspace: ({ editor }) => {
        // Only handle if we're in an ordered list
        if (!editor.isActive('orderedList')) {
          return false;
        }
        
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // Only handle if we're at the start of an empty list item
        if (!empty || $from.parentOffset !== 0 || $from.parent.content.size > 0) {
          return false;
        }
        
        // Use our specialized handler from ordered-backspace.ts
        return handleBackspaceInNumberedLists(editor);
      },
    };
  },
});

/**
 * Custom list item extension with Google Docs behavior for Enter/Backspace
 */
export const CustomListItem = ListItem.extend({
  name: 'listItem',
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'li',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes), 0];
  },
  
  addKeyboardShortcuts() {
    return {
      // Enter key: Special handling for empty list items
      Enter: ({ editor }) => {
        // Only handle if we're in an empty list item
        if (!editor.isActive('listItem')) {
          return false;
        }
        
        const { state } = editor;
        const { selection } = state;
        const { empty, $from } = selection;
        
        // Only handle if cursor is in an empty list item
        if (!empty || $from.parent.content.size > 0) {
          return false;
        }
        
        // Check if we're in an ordered list
        const inOrderedList = editor.isActive('orderedList');
        if (!inOrderedList) {
          return false;
        }
        
        // Try to lift (un-nest) the current list item first
        if (editor.can().liftListItem('listItem')) {
          // Lift the list item to reduce indentation
          editor.chain().focus().liftListItem('listItem').run();
          
          // Record history step
          if (window.historyManager) {
            window.historyManager.addHistoryStep('exit-numbered-list-item');
          }
          
          return true;
        } 
        
        // If we can't lift anymore (already at top level), exit the list entirely
        // Use more direct commands instead of toggleList to avoid recursion
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('exit-numbered-list');
        }
        
        // Ensure we update global format state
        GLOBAL_FORMAT_STATE.setOrderedList(false);
        document.dispatchEvent(new CustomEvent('format:update'));
        
        return true;
      },
    };
  },
});