/**
 * Google Docs Paragraph Indentation Extension
 * 
 * This extension exactly replicates Google Docs Tab/Shift+Tab keyboard behavior:
 * - Tab: Increases paragraph indentation by 0.5 inches (36px)
 * - Shift+Tab: Decreases paragraph indentation by 0.5 inches (36px)
 * - Handles only paragraph/heading indentation (lists use their own handling)
 * - Properly preserves cursor position
 * - Integrates with the global history manager for undo/redo
 */

import { Extension } from '@tiptap/core';
import { indentParagraphsDirect, outdentParagraphsDirect } from './direct-paragraph-indent';

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addKeyboardShortcuts() {
    return {
      // Tab key to indent paragraphs when not in a list
      'Tab': ({ editor }) => {
        // Only handle Tab if we're not in a list - lists have their own Tab behavior
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Also don't handle Tab if there's no selection or we're in a special context
        if (!editor.state.selection || editor.isActive('codeBlock')) {
          return false;
        }
        
        // Use our direct DOM manipulation approach
        const changed = indentParagraphsDirect(editor);
        
        // Log to help with debugging
        if (changed) {
          console.log('Tab key: Applied paragraph indentation');
        }
        
        // Return true to prevent default Tab behavior if we handled it
        // This stops the default behavior of inserting a Tab character or moving focus
        return changed;
      },
      
      // Shift+Tab to outdent paragraphs when not in a list
      'Shift-Tab': ({ editor }) => {
        // Only handle Shift+Tab if we're not in a list
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Also don't handle Shift+Tab if there's no selection or we're in a special context
        if (!editor.state.selection || editor.isActive('codeBlock')) {
          return false;
        }
        
        // Use our direct DOM manipulation approach
        const changed = outdentParagraphsDirect(editor);
        
        // Log to help with debugging
        if (changed) {
          console.log('Shift+Tab key: Applied paragraph outdentation');
        }
        
        // Return true to prevent default Shift+Tab behavior
        return changed;
      },
    };
  },
});

export default ParagraphIndent;