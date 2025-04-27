/**
 * Google Docs-style numbered lists implementation
 * 
 * Accurately replicates Google Docs numbered list behavior:
 * - Level 1: 1. 2. 3. (numbers)
 * - Level 2: a. b. c. (lowercase letters)
 * - Level 3: i. ii. iii. (lowercase roman numerals)
 * - Level 4: A. B. C. (uppercase letters)
 * - Level 5: I. II. III. (uppercase roman numerals)
 * - Level 6+: Cycles back to level 1 style
 * 
 * Features:
 * - Automatic sequential numbering
 * - Proper nesting behavior with Tab/Shift+Tab
 * - Proper handling of Enter/Backspace/Delete
 * - Integration with global undo/redo
 */

// Import the CSS file to apply styling for numbered lists
import './google-docs-numbered-list.css';

import { mergeAttributes, Extension, Editor, CommandProps } from '@tiptap/core';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { HistoryManager } from './history-manager';
import { ListItem } from '@tiptap/extension-list-item';
import { Plugin, PluginKey } from 'prosemirror-state';
import { GLOBAL_FORMAT_STATE } from './format-detection';

// Type declarations for our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    orderedList: {
      /**
       * Toggle a Google Docs style numbered list
       */
      toggleOrderedList: () => ReturnType;
    }
  }
}

// Define the backapace handler state 
enum BackspaceState {
  NORMAL = 0,         // Normal state, not backspacing on an empty item
  REMOVE_MARKER = 1,  // First backspace - remove only the number (convert to paragraph)
  DECREASE_INDENT = 2, // Second backspace - decrease indentation level
  EXIT_LIST = 3       // Third backspace - exit list entirely
}

// Storage for backspace state across editors
const emptyItemBackspace = {
  pos: -1,
  state: BackspaceState.NORMAL,
  level: 0,
  lastTime: 0,
  
  // Check if this is the same position as last time
  isSamePosition(pos: number): boolean {
    return this.pos === pos && (Date.now() - this.lastTime) < 2000;
  },
  
  // Set position and advance the state
  update(pos: number, level: number): void {
    if (this.isSamePosition(pos)) {
      // Advance to next state if at same position
      this.state = Math.min(this.state + 1, BackspaceState.EXIT_LIST);
    } else {
      // Reset to first state if at new position
      this.state = BackspaceState.REMOVE_MARKER;
      this.pos = pos;
      this.level = level;
    }
    this.lastTime = Date.now();
  },
  
  // Reset the state
  reset(): void {
    this.pos = -1;
    this.state = BackspaceState.NORMAL;
    this.level = 0;
    this.lastTime = 0;
  }
};

/**
 * Calculate the nesting level of an ordered list at the current position
 */
function calculateNestingLevel(editor: Editor): number {
  if (!editor || !editor.state) return 1;
  
  const { selection } = editor.state;
  const { $from } = selection;
  let level = 0;
  
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node && node.type.name === 'orderedList') {
      level++;
    }
  }
  
  return Math.max(1, level);
}

/**
 * Get the appropriate CSS class for a numbered list level
 */
function getListClassForLevel(level: number): string {
  // Use modulo to cycle through the styles (levels beyond 5 cycle back)
  const normalizedLevel = ((level - 1) % 5) + 1;
  return `gdoc-numbered-list-l${normalizedLevel}`;
}

/**
 * Plugin to maintain proper numbered list styles
 */
const NumberedListStylesPlugin = new Plugin({
  key: new PluginKey('google-docs-numbered-list-styles'),
  
  // This runs after a transaction to update list classes and attributes
  appendTransaction: (transactions, oldState, newState) => {
    // Skip if no content changes
    if (!transactions.some(tr => tr.docChanged)) return null;
    
    // Use setTimeout to let DOM settle
    setTimeout(() => {
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) return;
      
      // Find all ordered lists and apply proper styling
      const orderedLists = editorElement.querySelectorAll('ol[data-type="orderedList"]');
      
      orderedLists.forEach(list => {
        // Calculate level by counting ancestor ordered lists
        let level = 1;
        let parent = list.parentElement;
        
        while (parent) {
          if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
            level++;
          }
          parent = parent.parentElement;
        }
        
        // Get the appropriate class based on level
        const levelClass = getListClassForLevel(level);
        
        // Remove any existing level classes
        for (let i = 1; i <= 5; i++) {
          list.classList.remove(`gdoc-numbered-list-l${i}`);
        }
        
        // Add the correct level class and data attribute
        list.classList.add(levelClass);
        list.setAttribute('data-level', level.toString());
      });
    }, 0);
    
    return null;
  },
});

/**
 * Helper function to safely handle backspace in numbered lists
 * Mimics Google Docs' 3-stage backspace behavior
 */
export function handleNumberedListBackspace(editor: Editor): boolean {
  if (!editor || !editor.isActive('orderedList')) return false;
  
  const { selection } = editor.state;
  const { empty, $from } = selection;
  
  // Only handle empty list items at the start position
  if (!empty || $from.parentOffset !== 0 || $from.parent.content.size > 0) {
    emptyItemBackspace.reset();
    return false;
  }
  
  console.log('Backspace in empty numbered list item detected');
  
  // Calculate the nesting level
  const level = calculateNestingLevel(editor);
  console.log(`Current numbered list nesting level: ${level}`);
  
  // Update the backspace state for this position
  emptyItemBackspace.update($from.pos, level);
  console.log(`Backspace state: ${emptyItemBackspace.state}`);
  
  // Handle based on current backspace state
  switch (emptyItemBackspace.state) {
    case BackspaceState.REMOVE_MARKER:
      // First backspace: Just remove the number but keep as paragraph
      try {
        console.log('STAGE 1: Removing only the number marker');
        
        // We'll wrap this in a setTimeout to ensure editor state is stable
        setTimeout(() => {
          try {
            // Convert list item to paragraph
            editor.chain().focus().liftListItem('orderedListItem').run();
            
            // Update format state
            GLOBAL_FORMAT_STATE.setOrderedList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Add to history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('numbered-list-remove-marker');
            }
          } catch (error) {
            console.error('Error in delayed marker removal:', error);
          }
        }, 0);
        
        return true;
      } catch (error) {
        console.error('Error removing number marker:', error);
        return false;
      }
      
    case BackspaceState.DECREASE_INDENT:
      // Second backspace: Decrease indent level if possible
      if (level > 1) {
        try {
          console.log('STAGE 2: Decreasing indentation level');
          
          // We'll wrap this in a setTimeout to ensure editor state is stable
          setTimeout(() => {
            try {
              if (editor.can().liftListItem('orderedListItem')) {
                // Reduce indentation level
                editor.chain().focus().liftListItem('orderedListItem').run();
                
                // Update list styling
                setTimeout(() => {
                  // Find all ordered lists and update their styling
                  const orderedLists = editor.view.dom.querySelectorAll('ol[data-type="orderedList"]');
                  orderedLists.forEach((list: Element) => {
                    // Calculate level by counting ancestor ordered lists
                    let level = 1;
                    let parent = list.parentElement;
                    
                    while (parent) {
                      if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                        level++;
                      }
                      parent = parent.parentElement;
                    }
                    
                    // Apply the right class
                    const levelClass = getListClassForLevel(level);
                    
                    // Remove existing level classes
                    for (let i = 1; i <= 5; i++) {
                      list.classList.remove(`gdoc-numbered-list-l${i}`);
                    }
                    
                    // Add the new class and data attribute
                    list.classList.add(levelClass);
                    list.setAttribute('data-level', level.toString());
                  });
                  
                  // Add to history
                  if (window.historyManager) {
                    window.historyManager.addHistoryStep('numbered-list-decrease-indent');
                  }
                }, 10);
              } else {
                // If we can't decrease indent, move to stage 3
                emptyItemBackspace.state = BackspaceState.EXIT_LIST;
                handleNumberedListBackspace(editor);
              }
            } catch (error) {
              console.error('Error in delayed indent decrease:', error);
            }
          }, 0);
          
          return true;
        } catch (error) {
          console.error('Error decreasing indent:', error);
          return false;
        }
      }
      
      // If we can't decrease indent, fall through to EXIT_LIST
      console.log('No more indent levels to decrease - moving to STAGE 3');
      emptyItemBackspace.state = BackspaceState.EXIT_LIST;
      return handleNumberedListBackspace(editor);
      
    case BackspaceState.EXIT_LIST:
      // Third backspace: Exit the list entirely
      try {
        console.log('STAGE 3: Exiting list entirely');
        
        // We'll wrap this in a setTimeout to ensure editor state is stable
        setTimeout(() => {
          try {
            // Lift list item to convert to paragraph
            editor.chain().focus().liftListItem('orderedListItem').run();
            
            // Update UI state
            GLOBAL_FORMAT_STATE.setOrderedList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Add to history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('numbered-list-exit');
            }
            
            // Reset for next time
            emptyItemBackspace.reset();
          } catch (error) {
            console.error('Error in delayed list exit:', error);
          }
        }, 0);
        
        return true;
      } catch (error) {
        console.error('Error exiting list:', error);
        return false;
      }
  }
  
  return false;
}

/**
 * Google Docs-style Numbered List extension
 */
export const GoogleDocsNumberedList = OrderedList.extend({
  name: 'orderedList',
  
  addOptions() {
    return {
      ...this.parent?.(),
      itemTypeName: 'orderedListItem',
      HTMLAttributes: {
        class: 'gdoc-numbered-list-l1',
      },
      keepMarks: true,
      keepAttributes: true,
    };
  },
  
  addAttributes() {
    return {
      // Store the level for styling
      level: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-level') || '1', 10);
        },
        renderHTML: attributes => {
          return { 'data-level': attributes.level };
        },
      },
      // Standard attribute for starting number
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
    // Apply default styling that will be updated by the plugin
    const attrs = { ...HTMLAttributes };
    attrs.class = 'gdoc-numbered-list-l1';
    attrs['data-level'] = '1';
    
    return ['ol', mergeAttributes(attrs), 0];
  },
  
  addProseMirrorPlugins() {
    return [NumberedListStylesPlugin];
  },
  
  // Add custom command that properly toggles ordered lists
  addCommands() {
    return {
      toggleOrderedList: () => ({ editor, chain }) => {
        try {
          // Get current state of numbered list
          const isActive = editor.isActive('orderedList');
          
          // Update global format state for toolbar consistency
          GLOBAL_FORMAT_STATE.setOrderedList(!isActive);
          document.dispatchEvent(new CustomEvent('format:update'));
          
          // Toggle the ordered list
          if (isActive) {
            // If currently active, lift list items to convert to paragraphs
            return editor.chain().focus().liftListItem('orderedListItem').run();
          } else {
            // If not active, wrap in ordered list
            const success = editor.chain().focus().wrapInList('orderedList').run();
            
            // Apply styling with a small delay to ensure DOM is updated
            setTimeout(() => {
              try {
                const editorDom = editor.view.dom;
                if (!editorDom) return;
                
                const orderedLists = editorDom.querySelectorAll('ol[data-type="orderedList"]');
                orderedLists.forEach((list: Element) => {
                  // Calculate level
                  let level = 1;
                  let parent = list.parentElement;
                  
                  while (parent) {
                    if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                      level++;
                    }
                    parent = parent.parentElement;
                  }
                  
                  // Apply the right class
                  const levelClass = getListClassForLevel(level);
                  list.classList.add(levelClass);
                  list.setAttribute('data-level', level.toString());
                });
              } catch (error) {
                console.error('Error updating list styles:', error);
              }
            }, 10);
            
            return success;
          }
        } catch (error) {
          console.error('Error toggling numbered list:', error);
          return false;
        }
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      // Tab: Increase nesting level
      Tab: ({ editor }) => {
        if (!editor.isActive('orderedList')) return false;
        
        try {
          console.log('Tab key pressed in ordered list - increasing nesting level');
          
          // First ensure any current transaction is completed
          editor.view.focus();
          
          // Add a small delay to ensure state is stable
          setTimeout(() => {
            try {
              // Check again if we can sink the list item
              if (editor.can().sinkListItem('orderedListItem')) {
                // Increase nesting level
                editor.chain().focus().sinkListItem('orderedListItem').run();
                
                // Update list styling after indentation
                setTimeout(() => {
                  // Find all ordered lists and update their styling
                  const orderedLists = editor.view.dom.querySelectorAll('ol[data-type="orderedList"]');
                  orderedLists.forEach((list: Element) => {
                    // Calculate level by counting ancestor ordered lists
                    let level = 1;
                    let parent = list.parentElement;
                    
                    while (parent) {
                      if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                        level++;
                      }
                      parent = parent.parentElement;
                    }
                    
                    // Apply the right class
                    const levelClass = getListClassForLevel(level);
                    
                    // Remove existing level classes
                    for (let i = 1; i <= 5; i++) {
                      list.classList.remove(`gdoc-numbered-list-l${i}`);
                    }
                    
                    // Add the new class and data attribute
                    list.classList.add(levelClass);
                    list.setAttribute('data-level', level.toString());
                  });
                  
                  // Add history step
                  if (window.historyManager) {
                    window.historyManager.addHistoryStep('numbered-list-indent');
                  }
                  
                  // Dispatch event for any components that need to react
                  document.dispatchEvent(new CustomEvent('orderedList:indented'));
                }, 10);
              }
            } catch (error) {
              console.error('Error in delayed indentation:', error);
            }
          }, 0);
        } catch (error) {
          console.error('Error indenting numbered list:', error);
        }
        
        // Still return true to prevent default browser Tab behavior
        return true;
      },
      
      // Shift+Tab: Decrease nesting level
      'Shift-Tab': ({ editor }) => {
        if (!editor.isActive('orderedList')) return false;
        
        try {
          console.log('Shift+Tab key pressed in ordered list - decreasing nesting level');
          
          // First ensure any current transaction is completed
          editor.view.focus();
          
          // Add a small delay to ensure state is stable
          setTimeout(() => {
            try {
              // Check again if we can lift the list item
              if (editor.can().liftListItem('orderedListItem')) {
                // Decrease nesting level
                editor.chain().focus().liftListItem('orderedListItem').run();
                
                // Update list styling after outdentation
                setTimeout(() => {
                  // Find all ordered lists and update their styling
                  const orderedLists = editor.view.dom.querySelectorAll('ol[data-type="orderedList"]');
                  orderedLists.forEach((list: Element) => {
                    // Calculate level by counting ancestor ordered lists
                    let level = 1;
                    let parent = list.parentElement;
                    
                    while (parent) {
                      if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                        level++;
                      }
                      parent = parent.parentElement;
                    }
                    
                    // Apply the right class
                    const levelClass = getListClassForLevel(level);
                    
                    // Remove existing level classes
                    for (let i = 1; i <= 5; i++) {
                      list.classList.remove(`gdoc-numbered-list-l${i}`);
                    }
                    
                    // Add the new class and data attribute
                    list.classList.add(levelClass);
                    list.setAttribute('data-level', level.toString());
                  });
                  
                  // Add history step
                  if (window.historyManager) {
                    window.historyManager.addHistoryStep('numbered-list-outdent');
                  }
                  
                  // Dispatch event for any components that need to react
                  document.dispatchEvent(new CustomEvent('orderedList:outdented'));
                }, 10);
              }
            } catch (error) {
              console.error('Error in delayed outdentation:', error);
            }
          }, 0);
        } catch (error) {
          console.error('Error outdenting numbered list:', error);
        }
        
        // Still return true to prevent default browser Shift+Tab behavior
        return true;
      },
      
      // Backspace: Handle empty list items
      Backspace: ({ editor }) => {
        if (!editor.isActive('orderedList')) return false;
        
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // Only handle if at start of empty list item
        if (!empty || $from.parentOffset !== 0 || $from.parent.content.size > 0) {
          return false;
        }
        
        // Use the specialized backspace handler
        return handleNumberedListBackspace(editor);
      },
    };
  },
});

/**
 * Custom list item extension with Google Docs behavior for Enter key
 */
export const GoogleDocsListItem = ListItem.extend({
  name: 'orderedListItem',
  
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
      // Enter: Special handling for empty list items
      Enter: ({ editor }) => {
        // Only handle if we're in a list item
        if (!editor.isActive('orderedListItem')) return false;
        
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // Only handle if in an empty list item
        if (!empty || $from.parent.content.size > 0) return false;
        
        // Only handle if in a numbered list (not a bullet list)
        if (!editor.isActive('orderedList')) return false;
        
        try {
          // Calculate current nesting level
          const level = calculateNestingLevel(editor);
          
          if (level > 1) {
            // If nested, first try to decrease indentation
            editor.chain().focus().liftListItem('orderedListItem').run();
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('numbered-list-enter-decrease-level');
            }
          } else {
            // If at top level, exit the list completely
            editor.chain().focus().liftListItem('orderedListItem').run();
            
            // Update format state
            GLOBAL_FORMAT_STATE.setOrderedList(false);
            document.dispatchEvent(new CustomEvent('format:update'));
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('numbered-list-enter-exit');
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error handling Enter in numbered list:', error);
          return false;
        }
      },
    };
  },
});

/**
 * Extension to reset backspace state when editor state changes
 */
export const NumberedListBackspaceExtension = Extension.create({
  name: 'numbered-list-backspace-handler',
  
  // Reset state on various editor events
  onSelectionUpdate() {
    emptyItemBackspace.reset();
  },
  
  onBlur() {
    emptyItemBackspace.reset();
  },
  
  onFocus() {
    emptyItemBackspace.reset();
  },
});

// Use HistoryManager type already defined in history-manager.ts
// No need to declare the Window interface again as it's
// already defined in history-manager.ts file