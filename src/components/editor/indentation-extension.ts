/**
 * Direct Indentation Extension for TipTap
 *
 * This extension implements the indentation behavior found in Google Docs:
 * - Tab key indents the current paragraph by 0.5 inches (36px)
 * - Shift+Tab key outdents the current paragraph
 * - Multiple paragraphs can be indented/outdented at once when selected
 * - Cursor position is preserved
 * - History steps are created for proper undo/redo
 */

import { Extension } from '@tiptap/core';
import { handleTabIndent, handleShiftTabOutdent } from './paragraph-indent-fix';

export const IndentationExtension = Extension.create({
  name: 'indentation',

  // Add keyboard shortcuts for indentation
  addKeyboardShortcuts() {
    return {
      // Use Tab to indent paragraphs
      Tab: ({ editor }) => {
        // Skip if we're in a list (the list extensions handle their own indentation)
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Skip if we're in a table (Tab should navigate between cells)
        if (editor.isActive('table')) {
          return false;
        }
        
        // Apply indentation to paragraphs
        return handleTabIndent(editor);
      },
      
      // Use Shift+Tab to outdent paragraphs
      'Shift-Tab': ({ editor }) => {
        // Skip if we're in a list (the list extensions handle their own indentation)
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Skip if we're in a table (Shift+Tab should navigate between cells)
        if (editor.isActive('table')) {
          return false;
        }
        
        // Apply outdentation to paragraphs
        return handleShiftTabOutdent(editor);
      },
    };
  },
});