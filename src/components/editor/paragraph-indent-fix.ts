/**
 * Google Docs-style Paragraph Indentation
 * 
 * This implementation exactly matches Google Docs behavior for Tab and Shift+Tab:
 * - Tab key indents current paragraph by 0.5 inches (36px)
 * - Shift+Tab outdents paragraph by the same amount
 * - Works on single paragraphs or multiple selected paragraphs
 * - Properly integrated with history manager for undo/redo
 * - Maintains cursor position after indent/outdent operations
 */

import { Editor } from '@tiptap/core';

// Standard 0.5 inch indentation (36px) like Google Docs
export const INDENT_AMOUNT = 36;

/**
 * Indent a paragraph or multiple paragraphs
 * Direct implementation with low-level ProseMirror operations
 */
export function indentParagraph(editor: Editor): boolean {
  if (!editor || !editor.isEditable) return false;
  
  // Skip if in a list (those have their own indentation handlers)
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false; 
  }
  
  // Use direct transaction for better control
  const { state, view } = editor;
  const { tr } = state;
  let hasChanges = false;
  
  // Get selection range
  const { from, to } = state.selection;
  
  // Track all paragraphs in the selection
  const paragraphPositions: Array<{ pos: number, node: any }> = [];
  
  // Find all paragraphs in the selection range
  state.doc.nodesBetween(from, to, (node, pos) => {
    // Only handle block nodes
    if (node.type.name === 'paragraph') {
      // Don't process the same node twice
      if (!paragraphPositions.some(p => p.pos === pos)) {
        paragraphPositions.push({ node, pos });
      }
      return false; // Don't continue traversing inside paragraphs
    }
    return true; // Continue traversal for other nodes
  });
  
  // Apply indent to each paragraph
  for (const { node, pos } of paragraphPositions) {
    // Get current style
    const style = node.attrs.style || '';
    
    // Parse current indentation
    const currentIndent = style.includes('margin-left') 
      ? parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0') 
      : 0;
    
    // Create new style with increased indentation
    let newStyle: string;
    if (style.includes('margin-left')) {
      newStyle = style.replace(/margin-left:\s*\d+px/, `margin-left: ${currentIndent + INDENT_AMOUNT}px`);
    } else {
      newStyle = `margin-left: ${INDENT_AMOUNT}px;${style}`;
    }
    
    // Update the node's attributes
    tr.setNodeMarkup(pos, undefined, { 
      ...node.attrs, 
      style: newStyle 
    });
    
    hasChanges = true;
  }
  
  // Only apply the transaction if we made changes
  if (hasChanges) {
    // Apply the transaction
    view.dispatch(tr);
    
    // Add to history for proper undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('indent-paragraph');
    }
    
    return true;
  }
  
  return false;
}

/**
 * Outdent a paragraph or multiple paragraphs
 * Direct implementation with low-level ProseMirror operations
 */
export function outdentParagraph(editor: Editor): boolean {
  if (!editor || !editor.isEditable) return false;
  
  // Skip if in a list (those have their own indentation handlers)
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }
  
  // Use direct transaction for better control
  const { state, view } = editor;
  const { tr } = state;
  let hasChanges = false;
  
  // Get selection range
  const { from, to } = state.selection;
  
  // Track all paragraphs in the selection
  const paragraphPositions: Array<{ pos: number, node: any }> = [];
  
  // Find all paragraphs in the selection range
  state.doc.nodesBetween(from, to, (node, pos) => {
    // Only handle block nodes
    if (node.type.name === 'paragraph') {
      // Don't process the same node twice
      if (!paragraphPositions.some(p => p.pos === pos)) {
        paragraphPositions.push({ node, pos });
      }
      return false; // Don't continue traversing inside paragraphs
    }
    return true; // Continue traversal for other nodes
  });
  
  // Apply outdent to each paragraph
  for (const { node, pos } of paragraphPositions) {
    // Get current style
    const style = node.attrs.style || '';
    
    // Skip if there's no margin to reduce
    if (!style.includes('margin-left')) continue;
    
    // Parse current indentation
    const currentIndent = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
    
    // Create new style with decreased indentation
    let newStyle: string;
    if (currentIndent <= INDENT_AMOUNT) {
      // Remove margin-left completely if we're at the first level
      newStyle = style.replace(/margin-left:\s*\d+px;?\s*/, '');
    } else {
      // Decrease the indent level
      newStyle = style.replace(
        /margin-left:\s*\d+px/, 
        `margin-left: ${currentIndent - INDENT_AMOUNT}px`
      );
    }
    
    // Update the node's attributes
    tr.setNodeMarkup(pos, undefined, { 
      ...node.attrs, 
      style: newStyle 
    });
    
    hasChanges = true;
  }
  
  // Only apply the transaction if we made changes
  if (hasChanges) {
    // Apply the transaction
    view.dispatch(tr);
    
    // Add to history for proper undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('outdent-paragraph');
    }
    
    return true;
  }
  
  return false;
}

/**
 * Handle Tab key press - directly indents paragraphs
 */
export function handleTabIndent(editor: Editor): boolean {
  // Skip if in a list (those have their own indentation handlers)
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }
  
  return indentParagraph(editor);
}

/**
 * Handle Shift+Tab key press - directly outdents paragraphs
 */
export function handleShiftTabOutdent(editor: Editor): boolean {
  // Skip if in a list (those have their own indentation handlers)
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }
  
  return outdentParagraph(editor);
}