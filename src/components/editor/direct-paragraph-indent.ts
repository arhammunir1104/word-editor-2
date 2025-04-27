/**
 * Google Docs Paragraph Indentation
 * 
 * This implements Google Docs-style paragraph indentation exactly:
 * - Standard indentation of 0.5 inches (36px) per level
 * - Works with both keyboard shortcuts and toolbar buttons
 * - Handles single and multiple paragraph selections
 * - Preserves cursor position when indenting
 * - Integrates with the global history manager
 * - Uses direct DOM manipulation for robustness
 */

import { Editor } from '@tiptap/core';

// Add the intersectsNode method that TypeScript doesn't know about but browsers support
declare global {
  interface Range {
    intersectsNode(node: Node): boolean;
  }
}

// Google Docs standard indent amount (0.5 inches = 36px)
export const INDENT_AMOUNT = 36;

/**
 * Get all selected paragraph elements in the editor
 * This function correctly identifies all paragraphs in a selection,
 * with special handling for cursor position (collapsed selection)
 */
function getSelectedParagraphs(editor: Editor): HTMLElement[] {
  // Make sure we have a valid editor and DOM
  if (!editor || !editor.view || !editor.view.dom) {
    console.error('Editor or DOM not available');
    return [];
  }

  // Get the current selection
  const { state } = editor;
  const { empty, from, to } = state.selection;

  // Get editor DOM and all paragraph elements
  const editorDom = editor.view.dom;
  
  // Use querySelectorAll to get more than just paragraphs - also get headings
  // This ensures we handle all block elements that can be indented (like Google Docs)
  const allParagraphs = editorDom.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
  
  // If selection is collapsed (just cursor position), get the current paragraph
  if (empty) {
    // Find the current node at cursor position
    const pos = editor.state.selection.$from;
    const depth = pos.depth;
    
    // Find the closest block node (paragraph or heading)
    for (let d = depth; d > 0; d--) {
      const node = pos.node(d);
      // Check if this is a block node we can indent
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        // Find this node in the DOM
        const nodePos = pos.before(d);
        const domNode = editor.view.nodeDOM(nodePos) as HTMLElement;
        
        if (domNode) {
          return [domNode];
        }
      }
    }
    
    // Fallback to browser selection if ProseMirror approach fails
    const browserSelection = window.getSelection();
    if (browserSelection && browserSelection.rangeCount > 0) {
      const range = browserSelection.getRangeAt(0);
      let currentNode = range.startContainer;
      
      // Navigate up to find a paragraph or heading element
      while (currentNode && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentNode.nodeName)) {
        if (currentNode.parentNode) {
          currentNode = currentNode.parentNode;
        } else {
          break;
        }
      }
      
      if (currentNode && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentNode.nodeName)) {
        return [currentNode as HTMLElement];
      }
    }
    
    return [];
  }
  
  // For a selection range, find all paragraphs that intersect with the selection
  const selectedParagraphs: HTMLElement[] = [];
  
  // Browser selection approach - more reliable for complex DOM structures
  const browserSelection = window.getSelection();
  if (browserSelection && browserSelection.rangeCount > 0) {
    const range = browserSelection.getRangeAt(0);
    
    // This checks if a node intersects with the selection range
    Array.from(allParagraphs).forEach(paragraph => {
      if (range.intersectsNode(paragraph)) {
        selectedParagraphs.push(paragraph as HTMLElement);
      }
    });
  }
  
  return selectedParagraphs;
}

/**
 * Check if we're in a list context (bullet or ordered list)
 * In list context, indentation should use list nesting instead of paragraph margins
 */
function isInList(editor: Editor): boolean {
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}

/**
 * Indent paragraphs directly via DOM manipulation
 * This implements the Google Docs behavior exactly
 */
export function indentParagraphsDirect(editor: Editor): boolean {
  // Don't handle indentation if we're in a list - let the list extension handle it
  if (isInList(editor)) {
    return false;
  }
  
  // Save selection state before making changes
  const { from, to } = editor.state.selection;
  
  // Get all selected paragraphs
  const paragraphs = getSelectedParagraphs(editor);
  
  // If no paragraphs found, exit
  if (paragraphs.length === 0) {
    console.warn('No paragraphs found to indent');
    return false;
  }
  
  // Track if anything changed
  let changed = false;
  
  // Process each paragraph
  paragraphs.forEach(paragraph => {
    // Skip if this is a list item - they have their own indentation logic
    if (paragraph.closest('ul, ol')) {
      console.log('Skipping list item for indentation - using list nesting instead');
      return;
    }
    
    // Get current margin (if any)
    const currentStyle = paragraph.style.marginLeft || '0px';
    const currentMargin = parseInt(currentStyle) || 0;
    
    // Set new margin with standard Google Docs amount (0.5 inches = 36px)
    const newMargin = currentMargin + INDENT_AMOUNT;
    paragraph.style.marginLeft = `${newMargin}px`;
    changed = true;
    
    // Log the change with more details for debugging
    console.log(`Google Docs Indentation: Paragraph indented from ${currentMargin}px to ${newMargin}px`);
    console.log(`- Node type: ${paragraph.nodeName}`);
    
    // Safely handle textContent which might be null/undefined
    const content = paragraph.textContent || '';
    console.log(`- Content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
  });
  
  // If we changed anything, add history step for undo/redo
  if (changed && window.historyManager) {
    window.historyManager.addHistoryStep('indent-paragraph-direct');
  }
  
  return changed;
}

/**
 * Outdent paragraphs directly via DOM manipulation
 * This implements the Google Docs behavior exactly
 */
export function outdentParagraphsDirect(editor: Editor): boolean {
  // Don't handle outdentation if we're in a list - let the list extension handle it
  if (isInList(editor)) {
    return false;
  }
  
  // Save selection state before making changes
  const { from, to } = editor.state.selection;
  
  // Get all selected paragraphs
  const paragraphs = getSelectedParagraphs(editor);
  
  // If no paragraphs found, exit
  if (paragraphs.length === 0) {
    console.warn('No paragraphs found to outdent');
    return false;
  }
  
  // Track if anything changed
  let changed = false;
  
  // Process each paragraph
  paragraphs.forEach(paragraph => {
    // Skip if this is a list item - they have their own outdentation logic
    if (paragraph.closest('ul, ol')) {
      console.log('Skipping list item for outdentation - using list nesting instead');
      return;
    }
    
    // Get current margin (if any)
    const currentStyle = paragraph.style.marginLeft || '0px';
    const currentMargin = parseInt(currentStyle) || 0;
    
    // Only outdent if there's margin to reduce
    if (currentMargin > 0) {
      // Calculate new margin (never go below 0)
      const newMargin = Math.max(0, currentMargin - INDENT_AMOUNT);
      
      // Set new margin - if it's 0, remove the style completely (like Google Docs)
      if (newMargin === 0) {
        paragraph.style.removeProperty('margin-left');
        console.log('Google Docs Outdentation: Completely removed margin (reset to 0)');
      } else {
        paragraph.style.marginLeft = `${newMargin}px`;
        console.log(`Google Docs Outdentation: Paragraph outdented from ${currentMargin}px to ${newMargin}px`);
      }
      
      changed = true;
      console.log(`- Node type: ${paragraph.nodeName}`);
      
      // Safely handle textContent which might be null/undefined
      const content = paragraph.textContent || '';
      console.log(`- Content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);;
    } else {
      console.log('Paragraph already at minimum indentation (0px)');
    }
  });
  
  // If we changed anything, add history step for undo/redo
  if (changed && window.historyManager) {
    window.historyManager.addHistoryStep('outdent-paragraph-direct');
  }
  
  return changed;
}