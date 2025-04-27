/**
 * CustomBulletList Extension
 * 
 * Perfect replication of Google Docs bullet list behavior with exact styling and keyboard interactions:
 * - Level 1: • (solid round bullet)
 * - Level 2: ◦ (hollow round bullet)
 * - Level 3: ▪ (solid square bullet)
 * - Level 4: ‣ (triangle bullet)
 * - Level 5+: cycles back to level 1 style (for level 6, use level 1 bullet style, etc.)
 * 
 * Supports all Google Docs keyboard shortcuts:
 * - ENTER: Create new bullet at same level, or exit list if empty
 * - BACKSPACE: Un-nest or exit list when at start of empty bullet
 * - TAB: Increase nesting level
 * - SHIFT+TAB: Decrease nesting level
 * - DELETE: Merge with next bullet when at end of text
 */

import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import { Editor, NodeViewRenderer } from '@tiptap/react';
import { GLOBAL_FORMAT_STATE } from './format-detection';

// Counter to generate unique list IDs
let listCounter = 0;

/**
 * Custom Google Docs-style bullet list extension
 */
export const CustomBulletList = BulletList.extend({
  name: 'bulletList',
  
  addOptions() {
    return {
      ...this.parent?.(),
      itemTypeName: 'listItem',
      keepMarks: true,     // Keep text formatting when creating new bullets
      HTMLAttributes: {
        class: 'custom-bullet-list',
      },
    };
  },
  
  // Define how the bullet list renders in HTML
  renderHTML({ node, HTMLAttributes }) {
    // Get the level attribute from node attributes
    const level = node.attrs.level || 1;
    
    // Calculate display level (cycling between 1-5)
    const displayLevel = ((level - 1) % 5) + 1;
    
    // Combine with our custom class
    const attrs = {
      ...HTMLAttributes,
      class: `custom-bullet-list level-${displayLevel}`,
      'data-level': displayLevel.toString(),
    };
    
    return ['ul', attrs, 0];
  },
  
  // Define list attributes
  addAttributes() {
    return {
      // Bullet list level (1-5, then cycles)
      level: {
        default: 1,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-level') || '1', 10);
        },
        renderHTML: attributes => {
          // Calculate display level (cycling between 1-5)
          const level = attributes.level || 1;
          const displayLevel = ((level - 1) % 5) + 1;
          
          return {
            'data-level': displayLevel,
            class: `level-${displayLevel}`
          };
        }
      },
      // Add a unique ID for precise DOM manipulation
      listId: {
        default: null,
        parseHTML: element => {
          return element.getAttribute('data-list-id') || `list-${listCounter++}`;
        },
        renderHTML: attributes => {
          const id = attributes.listId || `list-${listCounter++}`;
          return { 'data-list-id': id };
        }
      }
    };
  },
  
  // Custom node view with enhanced nesting level detection
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listElement = document.createElement('ul');
      
      // Add class for styling
      listElement.classList.add('custom-bullet-list');
      
      // Determine nesting level by analyzing position in document
      let level = 1;
      
      // Only calculate if we have a valid position
      if (typeof getPos === 'function') {
        const pos = getPos();
        const resolvedPos = editor.state.doc.resolve(pos);
        
        // Count depth of bullet list nesting
        let nestingDepth = 0;
        let parentDepth = resolvedPos.depth;
        
        // Walk up the tree to count bullet list ancestors
        while (parentDepth > 0) {
          const parentNode = resolvedPos.node(parentDepth);
          if (parentNode.type.name === 'bulletList') {
            nestingDepth++;
          }
          parentDepth--;
        }
        
        // Level is based on nesting depth (first level is 1)
        level = nestingDepth;
        if (level === 0) level = 1; // Ensure minimum level of 1
        
        // Log the detected level (useful for debugging)
        console.log(`Bullet list at pos ${pos} has nesting level ${level}`);
      }
      
      // Apply cycling for levels beyond 5
      const displayLevel = ((level - 1) % 5) + 1;
      
      // Set data attributes and classes
      listElement.setAttribute('data-level', displayLevel.toString());
      listElement.classList.add(`level-${displayLevel}`);
      
      // Generate unique ID if not present
      const listId = node.attrs.listId || `list-${listCounter++}`;
      listElement.setAttribute('data-list-id', listId);
      
      // Apply any other HTML attributes
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          listElement.setAttribute(key, value.toString());
        }
      });
      
      // Update global format state when list is created
      // This helps properly sync the toolbar button state
      if (editor.isActive('bulletList')) {
        GLOBAL_FORMAT_STATE.setBulletList(true);
        GLOBAL_FORMAT_STATE.setBulletListLevel(displayLevel);
      }
      
      return {
        dom: listElement,
        contentDOM: listElement,
        update: (updatedNode) => {
          // Check if this is still a bullet list
          if (updatedNode.type.name !== 'bulletList') {
            return false;
          }
          
          // Update level if it changed
          if (updatedNode.attrs.level !== node.attrs.level) {
            const newDisplayLevel = ((updatedNode.attrs.level - 1) % 5) + 1;
            listElement.setAttribute('data-level', newDisplayLevel.toString());
            
            // Update classes for styling
            for (let i = 1; i <= 5; i++) {
              listElement.classList.remove(`level-${i}`);
            }
            listElement.classList.add(`level-${newDisplayLevel}`);
          }
          
          // Indicate the node view can be reused
          return true;
        },
      };
    };
  },
  
  // Enhanced keyboard shortcuts with perfect Google Docs compatibility
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Tab': ({ editor }) => {
        // Only handle Tab if we're in a list
        if (editor.isActive('bulletList') || editor.isActive('listItem')) {
          // Make sure we're inside a list item that can be nested further
          if (editor.can().sinkListItem('listItem')) {
            console.log('Nesting bullet list item with Tab');
            
            // Before sinking, remember current list level
            const prevLevel = getCurrentListLevel(editor);
            
            // Apply the sink list item command to nest the bullet
            editor.chain().focus().sinkListItem('listItem').run();
            
            // After sinking, get new list level
            const newLevel = getCurrentListLevel(editor);
            
            // Update GLOBAL_FORMAT_STATE with new level to update toolbar
            GLOBAL_FORMAT_STATE.setBulletList(true);
            GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            
            // Notify of format change for UI updates
            document.dispatchEvent(new CustomEvent('format:applied'));
            document.dispatchEvent(new CustomEvent('format:update', {
              detail: { source: 'tab-indent' }
            }));
            
            // Notify history manager content changed
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { source: 'format-sinkListItem' } 
            }));
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('indent-list');
            }
            
            return true;
          }
        }
        return false;
      },
      'Shift-Tab': ({ editor }) => {
        // Only handle Shift+Tab if we're in a list
        if (editor.isActive('bulletList') || editor.isActive('listItem')) {
          if (editor.can().liftListItem('listItem')) {
            console.log('Un-nesting bullet list item with Shift+Tab');
            
            // Before lifting, remember current list level
            const prevLevel = getCurrentListLevel(editor);
            
            // Apply the lift list item command to unnest the bullet
            editor.chain().focus().liftListItem('listItem').run();
            
            // After lifting, determine if we're still in a list and what level
            const isStillInList = editor.isActive('bulletList');
            const newLevel = isStillInList ? getCurrentListLevel(editor) : 0;
            
            // Update GLOBAL_FORMAT_STATE with new level
            GLOBAL_FORMAT_STATE.setBulletList(isStillInList);
            if (isStillInList) {
              GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            }
            
            // Notify of format change
            document.dispatchEvent(new CustomEvent('format:applied'));
            document.dispatchEvent(new CustomEvent('format:update', {
              detail: { source: 'shift-tab-outdent' }
            }));
            
            // Notify history manager content changed
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { source: 'format-liftListItem' } 
            }));
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('outdent-list');
            }
            
            return true;
          }
        }
        return false;
      }
    };
  },
  
  // Additional commands to enhance bulleting functionality
  addCommands() {
    return {
      ...this.parent?.(),
      
      // Command to set specific bullet list nesting level
      setBulletListLevel: (level: number) => ({ commands, chain }: { commands: any; chain: any }) => {
        // Ensure level is valid (1-5)
        level = Math.max(1, Math.min(5, level));
        
        // First make sure we're in a bullet list
        if (!commands.toggleBulletList()) {
          return false;
        }
        
        // Set the appropriate level using sinkListItem/liftListItem
        const currentLevel = getCurrentListLevel(chain().editor);
        
        if (currentLevel < level) {
          // Need to increase nesting
          for (let i = currentLevel; i < level; i++) {
            if (!commands.sinkListItem('listItem')) {
              break;
            }
          }
        } else if (currentLevel > level) {
          // Need to decrease nesting
          for (let i = currentLevel; i > level; i--) {
            if (!commands.liftListItem('listItem')) {
              break;
            }
          }
        }
        
        return true;
      }
    };
  }
});

/**
 * Enhanced ListItem that perfectly handles all Google Docs keyboard behaviors:
 * - Enter on empty bullet: Exit list or reduce nesting
 * - Enter on non-empty bullet: Create new bullet at same level
 * - Backspace at start: Reduce nesting or exit list
 * - Delete at end: Merge with next bullet
 */
export const CustomListItem = ListItem.extend({
  name: 'listItem',
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'custom-list-item',
      },
    };
  },
  
  content: 'paragraph block*',
  
  // Enable proper Enter key behavior for new bullets
  defining: true,
  
  // Make sure bullets split properly on Enter
  parseHTML() {
    return [
      {
        tag: 'li',
      },
    ];
  },
  
  // Perfect Google Docs keyboard shortcut behavior
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      
      // Handle Backspace at beginning of empty list item (Google Docs behavior)
      'Backspace': ({ editor }) => {
        const { empty, $from } = editor.state.selection;

        // Only handle empty list items
        if (!empty || !editor.isActive('listItem')) {
          return false;
        }

        // Check if we're at the start of the list item and it's empty
        if ($from.parentOffset === 0 && $from.parent.content.size === 0) {
          // Get current list level before modification
          const currentLevel = getCurrentListLevel(editor);
          
          // Check if we're in a nested list
          if (editor.can().liftListItem('listItem')) {
            console.log('Un-nesting list item with Backspace');
            
            // Lift the list item (reduce nesting)
            editor.chain().focus().liftListItem('listItem').run();
            
            // Check if we're still in a list after lifting
            const isStillInList = editor.isActive('bulletList');
            
            // Update format state
            GLOBAL_FORMAT_STATE.setBulletList(isStillInList);
            if (isStillInList) {
              const newLevel = getCurrentListLevel(editor);
              GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
            }
            
            // Notify of format change
            document.dispatchEvent(new CustomEvent('format:applied'));
            document.dispatchEvent(new CustomEvent('format:update', {
              detail: { source: 'backspace-lift' }
            }));
            
            // Notify content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { source: 'lift-list-item-backspace' } 
            }));
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('lift-list-item');
            }
            
            return true;
          } else {
            // If not nested, convert to normal paragraph (exit list)
            console.log('Exiting list with Backspace');
            editor.commands.toggleBulletList();
            
            // Update format state
            GLOBAL_FORMAT_STATE.setBulletList(false);
            
            // Notify of format change
            document.dispatchEvent(new CustomEvent('format:applied'));
            document.dispatchEvent(new CustomEvent('format:update', {
              detail: { source: 'backspace-exit-list' }
            }));
            
            // Notify content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { source: 'exit-list-backspace' } 
            }));
            
            // Add history step
            if (window.historyManager) {
              window.historyManager.addHistoryStep('exit-list');
            }
            
            return true;
          }
        }
        
        return false;
      },
      
      // Handle Enter key exactly like Google Docs
      'Enter': ({ editor }) => {
        const { empty, $from } = editor.state.selection;
        
        // Only handle if we're in a list item
        if (empty && editor.isActive('listItem')) {
          // If the list item is empty, handle specially
          if ($from.parent.content.size === 0) {
            // Check if we're in a nested list
            if (editor.can().liftListItem('listItem')) {
              // Get current level before un-nesting
              const currentLevel = getCurrentListLevel(editor);
              
              // Un-nest the list (reduce level but stay in list)
              editor.chain().focus().liftListItem('listItem').run();
              
              // Update format state with new level
              const isStillInList = editor.isActive('bulletList');
              GLOBAL_FORMAT_STATE.setBulletList(isStillInList);
              
              if (isStillInList) {
                const newLevel = getCurrentListLevel(editor);
                GLOBAL_FORMAT_STATE.setBulletListLevel(((newLevel - 1) % 5) + 1);
              }
              
              // Notify content change for history and UI
              document.dispatchEvent(new CustomEvent('format:update', {
                detail: { source: 'enter-lift' }
              }));
              document.dispatchEvent(new CustomEvent('content:changed', { 
                detail: { source: 'lift-list-item-enter' } 
              }));
              
              // Add history step
              if (window.historyManager) {
                window.historyManager.addHistoryStep('lift-list-item');
              }
              
              return true;
            } else {
              // If not nested, convert to normal paragraph
              editor.commands.toggleBulletList();
              
              // Update format state
              GLOBAL_FORMAT_STATE.setBulletList(false);
              
              // Notify format and content change 
              document.dispatchEvent(new CustomEvent('format:update', {
                detail: { source: 'enter-exit-list' }
              }));
              document.dispatchEvent(new CustomEvent('content:changed', { 
                detail: { source: 'exit-list-enter' } 
              }));
              
              // Add history step
              if (window.historyManager) {
                window.historyManager.addHistoryStep('exit-list');
              }
              
              return true;
            }
          }
          
          // If we're in a non-empty bullet, we'll let the default splitListItem
          // behavior handle it (which is to create a new bullet at the same level)
          return false;
        }
        
        // Default behavior for standard Enter handling
        return false;
      },
      
      // Handle Delete key at the end of list items (merge with next item)
      'Delete': ({ editor }) => {
        const { empty, $from, $to } = editor.state.selection;
        
        // Only handle empty selections in list items
        if (!empty || !editor.isActive('listItem')) {
          return false;
        }
        
        // Check if cursor is at the end of the list item content
        if ($from.parentOffset === $from.parent.content.size) {
          // Let the default behavior handle it, which will merge with the next node
          return false;
        }
        
        return false;
      }
    };
  },
  
  // Custom node view for list items with level information
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      // Create the list item element
      const listItemElement = document.createElement('li');
      listItemElement.classList.add('custom-list-item');
      
      // Determine the nesting level by finding parent bullet list
      let level = 1;
      
      if (typeof getPos === 'function') {
        const pos = getPos();
        const resolvedPos = editor.state.doc.resolve(pos);
        
        // Find the nearest bulletList parent
        for (let depth = resolvedPos.depth; depth > 0; depth--) {
          const parentNode = resolvedPos.node(depth);
          if (parentNode.type.name === 'bulletList') {
            // Get the level from the parent bullet list
            level = parentNode.attrs.level || 1;
            break;
          }
        }
      }
      
      // Apply cycling for levels beyond 5
      const displayLevel = ((level - 1) % 5) + 1;
      
      // Set level as data attribute
      listItemElement.setAttribute('data-level', displayLevel.toString());
      listItemElement.classList.add(`level-${displayLevel}`);
      
      // Apply any custom attributes
      Object.entries(HTMLAttributes || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          listItemElement.setAttribute(key, value.toString());
        }
      });
      
      return {
        dom: listItemElement,
        contentDOM: listItemElement,
        update: (updatedNode) => {
          // Only reuse if it's still a list item
          return updatedNode.type.name === 'listItem';
        }
      };
    };
  }
});

/**
 * Helper function to determine the current list level at cursor position
 */
function getCurrentListLevel(editor: Editor): number {
  const { $from } = editor.state.selection;
  let level = 1;
  let foundBulletList = false;
  
  // Walk up the document structure to find the bullet list parent
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'bulletList') {
      // Get level from the bullet list's attributes
      level = node.attrs.level || 1;
      foundBulletList = true;
      break;
    }
  }
  
  // If no bullet list was found, return 0 (not in a list)
  if (!foundBulletList) {
    return 0;
  }
  
  return level;
}