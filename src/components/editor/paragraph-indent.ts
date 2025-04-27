/**
 * Paragraph Indentation Extension for TipTap
 * 
 * Implements exact Google Docs style indentation for regular paragraphs:
 * - Tab: Increases indentation by 36px (0.5 inches in Google Docs)
 * - Shift+Tab: Decreases indentation
 * 
 * Key features:
 * - Maintains cursor position during indentation
 * - Preserves selection when indenting selected text
 * - Supports indenting multiple paragraphs at once
 * - Integrates with global undo/redo system
 * - Doesn't interfere with list indentation
 */
import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Transaction } from 'prosemirror-state';

// Default indentation amount (36px is what Google Docs uses)
const INDENT_AMOUNT = 36;

/**
 * Helper function to handle paragraph indentation
 * Uses transaction-based approach to maintain cursor position
 */
export const indentParagraph = (editor: Editor): boolean => {
  // Skip if in a list - let the list extension handle it
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  const { state, view } = editor;
  const { tr } = state;
  let transaction: Transaction | null = null;
  let didIndent = false;
  
  // Find all paragraphs in the current selection
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      // Get current style or initialize empty string
      const style = node.attrs.style || '';
      
      // Extract current margin value if it exists
      const currentMargin = style.includes('margin-left') ? 
        parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0') : 0;
      
      // Create new style with increased margin
      const newStyle = style.includes('margin-left') ? 
        style.replace(/margin-left:\s*\d+px/, `margin-left: ${currentMargin + INDENT_AMOUNT}px`) : 
        `margin-left: ${INDENT_AMOUNT}px;${style}`;
      
      // Update the paragraph attributes
      if (!transaction) {
        transaction = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          style: newStyle
        });
      } else {
        transaction = transaction.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          style: newStyle
        });
      }
      
      didIndent = true;
    }
    
    return true; // Continue traversing
  });
  
  // If we indented something, dispatch the transaction
  if (transaction && didIndent) {
    view.dispatch(transaction);
    
    // Add history step for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('indent-paragraph');
    }
    
    // Dispatch a global event for other components
    document.dispatchEvent(new CustomEvent('paragraph:indented'));
    
    return true;
  }
  
  return false;
};

/**
 * Helper function to handle paragraph outdentation
 * Uses transaction-based approach to maintain cursor position
 */
export const outdentParagraph = (editor: Editor): boolean => {
  // Skip if in a list - let the list extension handle it
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  const { state, view } = editor;
  const { tr } = state;
  let transaction: Transaction | null = null;
  let didOutdent = false;
  
  // Find all paragraphs in the current selection
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      // Get current style or initialize empty string
      const style = node.attrs.style || '';
      
      // Skip paragraphs without margin-left
      if (!style.includes('margin-left')) {
        return true;
      }
      
      // Extract current margin value
      const currentMargin = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
      
      // Calculate new style
      let newStyle = '';
      if (currentMargin <= INDENT_AMOUNT) {
        // Remove margin completely if it's at the first indent level
        newStyle = style.replace(/margin-left:\s*\d+px;?/, '');
      } else {
        // Reduce margin by INDENT_AMOUNT
        newStyle = style.replace(
          /margin-left:\s*\d+px/, 
          `margin-left: ${currentMargin - INDENT_AMOUNT}px`
        );
      }
      
      // Update the paragraph attributes
      if (!transaction) {
        transaction = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          style: newStyle
        });
      } else {
        transaction = transaction.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          style: newStyle
        });
      }
      
      didOutdent = true;
    }
    
    return true; // Continue traversing
  });
  
  // If we outdented something, dispatch the transaction
  if (transaction && didOutdent) {
    view.dispatch(transaction);
    
    // Add history step for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('outdent-paragraph');
    }
    
    // Dispatch a global event for other components
    document.dispatchEvent(new CustomEvent('paragraph:outdented'));
    
    return true;
  }
  
  return false;
};

/**
 * ParagraphIndent Extension
 * 
 * Adds Tab and Shift+Tab keyboard shortcuts for indenting regular paragraphs.
 * This implementation preserves cursor position and selection.
 */
export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',
  
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // If in a list, let the list extension handle it
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Handle Tab for paragraphs and prevent default behavior
        // which would normally move focus or insert a tab character
        if (indentParagraph(editor)) {
          return true;
        }
        
        return false;
      },
      'Shift-Tab': ({ editor }) => {
        // If in a list, let the list extension handle it
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Handle Shift+Tab for paragraphs and prevent default behavior
        if (outdentParagraph(editor)) {
          return true;
        }
        
        return false;
      },
    };
  },
});