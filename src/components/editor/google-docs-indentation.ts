/**
 * Google Docs-style Paragraph Indentation Extension
 * 
 * This extension provides exact Google Docs behavior for Tab/Shift+Tab indentation:
 * - Indents entire paragraphs by 0.5 inches (36px)
 * - Works for single or multiple selected paragraphs
 * - Maintains cursor position during indent/outdent operations
 * - Supports tables and other block elements
 * - Integrates with history manager for proper undo/redo
 * - Can be triggered by toolbar buttons or keyboard shortcuts
 */

import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';

// Standard 0.5 inch indentation (36px) like Google Docs
export const INDENT_AMOUNT = 36;

/**
 * Helper function to indent single or multiple paragraphs
 * Works with cursor in paragraph, selection spanning multiple paragraphs,
 * or with block elements selected
 */
export function indentParagraphs(editor: Editor): boolean {
  if (!editor) return false;
  
  // Skip if we're in a list - list extensions handle their own indentation
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  // Save selection for restoring later
  const { from, to } = editor.state.selection;
  let modified = false;
  let tr = editor.state.tr;
  
  // Find all block nodes in the selection and indent each one
  const blocks: {node: any, pos: number}[] = [];
  
  // First pass: collect all blocks to modify
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    // Only handle full block elements (paragraph, table, etc)
    if (node.isBlock && !node.isText) {
      // Find if we already added this exact block
      const alreadyIncluded = blocks.some(block => 
        block.pos <= pos && block.pos + block.node.nodeSize > pos
      );
      
      if (!alreadyIncluded) {
        blocks.push({ node, pos });
      }
      
      // Don't descend into children of block nodes we're indenting as a unit
      return false;
    }
    
    return true;
  });
  
  // Second pass: apply indentation to each block
  blocks.forEach(({ node, pos }) => {
    // Get existing style
    const style = node.attrs.style || '';
    
    // Calculate current margin
    const currentMargin = style.includes('margin-left') ? 
      parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0') : 0;
    
    // Create new style with increased margin
    let newStyle: string;
    if (style.includes('margin-left')) {
      newStyle = style.replace(/margin-left:\s*\d+px/, `margin-left: ${currentMargin + INDENT_AMOUNT}px`);
    } else {
      newStyle = `margin-left: ${INDENT_AMOUNT}px;${style}`;
    }
    
    // Apply the new style to the node
    tr = tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      style: newStyle,
    });
    
    modified = true;
  });
  
  // Only dispatch if we actually changed something
  if (modified) {
    // Apply the transaction
    editor.view.dispatch(tr);
    
    // Add to history manager for proper undo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('indent-paragraph');
    }
    
    return true;
  }
  
  return false;
}

/**
 * Helper function to outdent single or multiple paragraphs
 * Works with cursor in paragraph, selection spanning multiple paragraphs,
 * or with block elements selected
 */
export function outdentParagraphs(editor: Editor): boolean {
  if (!editor) return false;
  
  // Skip if we're in a list - list extensions handle their own indentation
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return false;
  }

  // Save selection for restoring later
  const { from, to } = editor.state.selection;
  let modified = false;
  let tr = editor.state.tr;
  
  // Find all block nodes in the selection and outdent each one
  const blocks: {node: any, pos: number}[] = [];
  
  // First pass: collect all blocks to modify
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    // Only handle full block elements (paragraph, table, etc)
    if (node.isBlock && !node.isText) {
      // Find if we already added this exact block
      const alreadyIncluded = blocks.some(block => 
        block.pos <= pos && block.pos + block.node.nodeSize > pos
      );
      
      if (!alreadyIncluded) {
        blocks.push({ node, pos });
      }
      
      // Don't descend into children of block nodes we're outdenting as a unit
      return false;
    }
    
    return true;
  });
  
  // Second pass: apply outdentation to each block
  blocks.forEach(({ node, pos }) => {
    // Get existing style
    const style = node.attrs.style || '';
    
    // Skip if there's no margin-left to reduce
    if (!style.includes('margin-left')) {
      return;
    }
    
    // Calculate current margin
    const currentMargin = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
    
    // Create new style with reduced margin
    let newStyle: string;
    if (currentMargin <= INDENT_AMOUNT) {
      // Remove margin completely if it's at or below first indent level
      newStyle = style.replace(/margin-left:\s*\d+px;?\s*/, '');
    } else {
      // Reduce margin by INDENT_AMOUNT
      newStyle = style.replace(
        /margin-left:\s*\d+px/, 
        `margin-left: ${currentMargin - INDENT_AMOUNT}px`
      );
    }
    
    // Apply the new style to the node
    tr = tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      style: newStyle,
    });
    
    modified = true;
  });
  
  // Only dispatch if we actually changed something
  if (modified) {
    // Apply the transaction
    editor.view.dispatch(tr);
    
    // Add to history manager for proper undo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('outdent-paragraph');
    }
    
    return true;
  }
  
  return false;
}

/**
 * Extension that adds Tab/Shift+Tab keyboard shortcuts and commands
 * for paragraph indentation with exact Google Docs behavior
 */
export const GoogleDocsIndentation = Extension.create({
  name: 'googleDocsIndentation',
  
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Skip if we're in a list (use their native handlers)
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Handle indenting tables specially if cursor is in a table
        if (editor.isActive('table')) {
          // In tables, Tab should navigate to next cell by default
          return false;
        }
        
        // Handle paragraph indentation
        return indentParagraphs(editor);
      },
      'Shift-Tab': ({ editor }) => {
        // Skip if we're in a list (use their native handlers)
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false;
        }
        
        // Handle indenting tables specially if cursor is in a table
        if (editor.isActive('table')) {
          // In tables, Shift+Tab should navigate to previous cell by default
          return false;
        }
        
        // Handle paragraph outdentation
        return outdentParagraphs(editor);
      },
    };
  },
  
  addCommands() {
    return {
      // Cast to any to avoid TypeScript errors with command structure
      indentParagraph: () => ({ editor }: { editor: Editor }) => {
        return indentParagraphs(editor);
      },
      outdentParagraph: () => ({ editor }: { editor: Editor }) => {
        return outdentParagraphs(editor);
      },
    } as any;
  },
});