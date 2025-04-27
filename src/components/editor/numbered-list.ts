/**
 * Google Docs-style Numbered List Extension
 * Implements the exact behavior of Google Docs numbered lists with:
 * - Proper multi-level nesting with Tab/Shift+Tab
 * - Different marker styles for each level (1., a., i., A., I.)
 * - Three-stage backspace behavior in empty items
 * - Correct Enter key behavior
 */

import { mergeAttributes, Extension } from '@tiptap/core';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import './numbered-list.css';

// Global storage for backspace handling state
// This tracks whether we're in "empty list item backspace mode"
// Google Docs has a multi-stage backspace behavior in empty list items
let backspaceState = {
  position: -1,
  level: 0,
  state: 0
};

/**
 * Tracks the backspace handling state for empty list items
 * Google Docs has a 3-stage backspace behavior in empty list items:
 * 1. First backspace: Remove just the list marker (keeps as a paragraph at same indentation)
 * 2. Second backspace: Decrease the indentation by one level 
 * 3. Third backspace: Exit the list entirely (convert to paragraph)
 */
enum BackspaceState {
  NORMAL = 0,         // Regular state
  REMOVE_MARKER = 1,  // First backspace - remove marker only
  DECREASE_INDENT = 2, // Second backspace - decrease indentation
  EXIT_LIST = 3       // Third backspace - exit list completely
}

// Helper to check positions
const backspaceStateManager = {
  isSamePosition(pos: number): boolean {
    return pos === backspaceState.position;
  },
  
  update(pos: number, level: number): void {
    const samePos = this.isSamePosition(pos);
    
    if (samePos) {
      // Same position - advance to next state
      backspaceState.state = Math.min(backspaceState.state + 1, BackspaceState.EXIT_LIST);
    } else {
      // New position - reset to first backspace state
      backspaceState.position = pos;
      backspaceState.level = level;
      backspaceState.state = BackspaceState.REMOVE_MARKER;
    }
    
    console.log(`Backspace state updated: position=${pos}, level=${level}, state=${backspaceState.state}`);
  },
  
  reset(): void {
    backspaceState.position = -1;
    backspaceState.level = 0;
    backspaceState.state = BackspaceState.NORMAL;
  }
};

/**
 * Helper function to get the current list nesting level at cursor position
 */
function getCurrentListLevel(editor: any): number {
  const { selection } = editor.state;
  const { $from } = selection;
  
  let level = 0;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'orderedList') {
      level++;
    }
  }
  
  return level;
}

/**
 * The main numbered list extension
 */
export const GoogleDocsNumberedList = OrderedList.extend({
  name: 'orderedList',
  
  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: true,
      keepAttributes: false,
    };
  },
  
  addAttributes() {
    return {
      // Standard ordered list attributes
      start: {
        default: 1,
        parseHTML: element => {
          return element.hasAttribute('start')
            ? parseInt(element.getAttribute('start') || '1', 10)
            : 1;
        },
        renderHTML: attributes => {
          return {
            start: attributes.start === 1 ? undefined : attributes.start,
          };
        },
      },
      // Add a level attribute to support correct numbering per level
      level: {
        default: 1,
        parseHTML: element => {
          return element.dataset.level ? parseInt(element.dataset.level, 10) : 1;
        },
        renderHTML: attributes => {
          return {
            'data-level': attributes.level,
          };
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
  
  renderHTML({ HTMLAttributes }) {
    return [
      'ol', 
      mergeAttributes(
        this.options.HTMLAttributes, 
        HTMLAttributes,
        { class: 'numbered-list' }
      ), 
      0
    ];
  },
  
  addCommands() {
    return {
      toggleOrderedList: () => ({ commands }) => {
        // Return if we can't find list item type
        if (!this.options.itemTypeName) {
          return false;
        }
        
        return commands.toggleList('orderedList', this.options.itemTypeName);
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      'Tab': ({ editor }) => {
        // Only handle Tab in ordered lists
        if (!editor.isActive('orderedList')) {
          return false;
        }
        
        // Sink the list item (increase indentation)
        if (editor.can().sinkListItem('listItem')) {
          editor.chain().sinkListItem('listItem').run();
          return true;
        }
        
        return false;
      },
      
      'Shift-Tab': ({ editor }) => {
        // Only handle Shift+Tab in ordered lists
        if (!editor.isActive('orderedList')) {
          return false;
        }
        
        // Lift the list item (decrease indentation)
        if (editor.can().liftListItem('listItem')) {
          editor.chain().liftListItem('listItem').run();
          return true;
        }
        
        return false;
      },
      
      'Backspace': ({ editor }) => {
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // Only handle backspace in empty list items
        if (!empty || !editor.isActive('orderedList') || $from.parent.content.size > 0) {
          backspaceStateManager.reset();
          return false;
        }
        
        // Record current position and level
        const level = getCurrentListLevel(editor);
        const pos = $from.pos;
        
        // Update backspace state
        backspaceStateManager.update(pos, level);
        
        // Handle based on current backspace state
        switch (backspaceState.state) {
          case BackspaceState.REMOVE_MARKER:
            // First backspace - remove marker but stay at same indentation            
            editor.chain().focus().toggleList('orderedList', 'listItem').run();
            return true;
            
          case BackspaceState.DECREASE_INDENT:
            // Second backspace - decrease indentation level
            if (level > 1 && editor.can().liftListItem('listItem')) {
              editor.chain().focus().liftListItem('listItem').run();
              return true;
            }
            // If can't decrease level, fall through to exit list
            
          case BackspaceState.EXIT_LIST:
            // Third backspace - exit list entirely
            editor.chain().focus().toggleList('orderedList', 'listItem').run();
            backspaceStateManager.reset();
            return true;
            
          default:
            return false;
        }
      },
      
      'Enter': ({ editor }) => {
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // Only handle Enter in empty list items
        if (!empty || !editor.isActive('orderedList') || $from.parent.content.size > 0) {
          return false;
        }
        
        // If we're in a nested list, first try to lift the item (reduce nesting)
        const level = getCurrentListLevel(editor);
        if (level > 1) {
          if (editor.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
            return true;
          }
        }
        
        // Otherwise exit the list completely
        editor.chain().focus().toggleList('orderedList', 'listItem').run();
        return true;
      }
    };
  }
});

/**
 * Extension to reset the backspace state when selection changes
 */
export const NumberedListBackspaceExtension = Extension.create({
  name: 'numberedListBackspace',
  
  onSelectionUpdate() {
    backspaceStateManager.reset();
  },
  
  onBlur() {
    backspaceStateManager.reset();
  }
});

/**
 * Custom list item for better Google Docs style Enter key behavior
 */
export const EnhancedListItem = ListItem.extend({
  name: 'listItem',
  
  addKeyboardShortcuts() {
    return {
      'Enter': ({ editor }) => {
        // Continue normal list item behavior for non-empty items
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        if (!empty || $from.parent.content.size > 0) {
          return false; // Let the default handler run
        }
        
        // For empty items, we'll handle in the orderedList extension
        return false;
      }
    };
  }
});