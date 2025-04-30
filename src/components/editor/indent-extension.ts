/**
 * Paragraph Indentation Extension for TipTap
 * 
 * Implements Google Docs style indentation for regular paragraphs:
 * - Tab: Increases indentation by 36px (0.5 inches)
 * - Shift+Tab: Decreases indentation
 * - Button clicks: Increases/decreases indentation via toolbar
 * 
 * This maintains cursor position during indentation changes and 
 * properly integrates with the History Manager for undo/redo.
 */
import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Transaction } from 'prosemirror-state';

// Default indentation amount (36px is what Google Docs uses)
export const INDENT_AMOUNT = 36;

/**
 * Extension that adds paragraph indentation commands and keyboard shortcuts
 */
export const IndentationExtension = Extension.create({
  name: 'indentation',

  // addCommands() {
  //   return {
  //     indent: () => ({ editor }) => {
  //       return indentParagraph(editor);
  //     },
  //     outdent: () => ({ editor }) => {
  //       return outdentParagraph(editor);
  //     },
  //   };
  // },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Skip for lists - they handle Tab themselves
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        return indentParagraph(editor);
      },
      'Shift-Tab': ({ editor }) => {
        // Skip for lists - they handle Shift+Tab themselves
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        return outdentParagraph(editor);
      },
    };
  },
});

/**
 * Helper function to increase paragraph indentation
 */
export function indentParagraph(editor: Editor): boolean {
  if (!editor || editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  // Create a transaction to update paragraph attributes
  const { tr } = editor.state;
  let transaction: Transaction | null = null;
  let changed = false;

  // Find all paragraphs in the current selection
  editor.state.doc.nodesBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    (node, pos) => {
      // Only handle paragraph nodes
      if (node.type.name === 'paragraph') {
        // Get current style or initialize empty string
        const style = node.attrs.style || '';
        
        // Extract current indentation level
        const currentIndent = style.includes('margin-left')
          ? parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0')
          : 0;
        
        // Calculate new style with increased indentation
        const newStyle = style.includes('margin-left')
          ? style.replace(/margin-left:\s*\d+px/, `margin-left: ${currentIndent + INDENT_AMOUNT}px`)
          : `margin-left: ${INDENT_AMOUNT}px;${style}`;
        
        // Update the node's attributes in the transaction
        if (!transaction) {
          transaction = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            style: newStyle,
          });
        } else {
          transaction = transaction.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            style: newStyle,
          });
        }
        
        changed = true;
      }
      return true; // Continue traversing
    }
  );

  // If we actually changed something, dispatch the transaction
  if (transaction && changed) {
    editor.view.dispatch(transaction);
    
    // Add to history
    if (window.historyManager) {
      window.historyManager.addHistoryStep('indent-paragraph');
    }
    
    return true;
  }

  return false;
}

/**
 * Helper function to decrease paragraph indentation
 */
export function outdentParagraph(editor: Editor): boolean {
  if (!editor || editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  // Create a transaction to update paragraph attributes
  const { tr } = editor.state;
  let transaction: Transaction | null = null;
  let changed = false;

  // Find all paragraphs in the current selection
  editor.state.doc.nodesBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    (node, pos) => {
      // Only handle paragraph nodes
      if (node.type.name === 'paragraph') {
        // Get current style
        const style = node.attrs.style || '';
        
        // Skip if no margin-left is present
        if (!style.includes('margin-left')) {
          return true;
        }
        
        // Extract current indentation level
        const currentIndent = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
        
        // Calculate new style with decreased indentation
        let newStyle: string;
        
        if (currentIndent <= INDENT_AMOUNT) {
          // Remove indentation completely
          newStyle = style.replace(/margin-left:\s*\d+px;?/, '');
        } else {
          // Reduce indentation
          newStyle = style.replace(
            /margin-left:\s*\d+px/,
            `margin-left: ${currentIndent - INDENT_AMOUNT}px`
          );
        }
        
        // Update the node's attributes in the transaction
        if (!transaction) {
          transaction = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            style: newStyle,
          });
        } else {
          transaction = transaction.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            style: newStyle,
          });
        }
        
        changed = true;
      }
      return true; // Continue traversing
    }
  );

  // If we actually changed something, dispatch the transaction
  if (transaction && changed) {
    editor.view.dispatch(transaction);
    
    // Add to history
    if (window.historyManager) {
      window.historyManager.addHistoryStep('outdent-paragraph');
    }
    
    return true;
  }

  return false;
}