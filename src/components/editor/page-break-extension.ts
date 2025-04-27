import { Node, mergeAttributes } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import './page-break.css';

/**
 * Extension for manual page breaks
 */
export const PageBreak = Node.create({
  name: 'pageBreak',
  
  group: 'block',
  
  parseHTML() {
    return [
      { tag: 'hr.page-break' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { class: 'page-break' })];
  },
  
  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain().insertContent('<hr class="page-break"/>').run();
      },
    };
  },
});

/**
 * Helper function to add multi-page support to an editor
 */
export function setupMultiPageSupport(editor: Editor, pageCount: number, setPageCount: (count: number) => void) {
  // Configure page dimensions
  const PAGE_HEIGHT = 11 * 96; // 11 inches * 96 DPI
  const HEADER_FOOTER_HEIGHT = 100; // 50px header + 50px footer
  const CONTENT_HEIGHT_PER_PAGE = PAGE_HEIGHT - HEADER_FOOTER_HEIGHT;
  
  // Create page break elements
  const addPageBreakIndicators = () => {
    // Remove any existing indicators
    document.querySelectorAll('.editor-page-break-indicator').forEach(el => el.remove());
    
    // Add page break indicators
    const editorElement = document.querySelector('.tiptap');
    if (!editorElement) return;
    
    // Add visual indicators for each page
    for (let i = 1; i < pageCount; i++) {
      const indicator = document.createElement('div');
      indicator.className = 'editor-page-break-indicator';
      indicator.innerHTML = `<div class="page-break-line"></div><span>Page ${i} ends here</span>`;
      indicator.style.position = 'absolute';
      indicator.style.top = `${i * CONTENT_HEIGHT_PER_PAGE}px`;
      indicator.style.left = '0';
      indicator.style.right = '0';
      indicator.style.borderTop = '1px dashed #999';
      indicator.style.textAlign = 'center';
      indicator.style.color = '#888';
      indicator.style.fontSize = '12px';
      indicator.style.zIndex = '10';
      indicator.style.pointerEvents = 'none';
      
      editorElement.appendChild(indicator);
    }
  };
  
  // Calculate pages needed based on content height
  const updatePageCount = () => {
    const editorElement = document.querySelector('.tiptap');
    if (!editorElement) return;
    
    const contentHeight = editorElement.scrollHeight;
    const pagesNeeded = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT_PER_PAGE) + 1);
    
    if (pagesNeeded > pageCount) {
      setPageCount(pagesNeeded);
    }
    
    // Redraw page break indicators
    addPageBreakIndicators();
  };
  
  // Set up page break indicators when editor is ready
  if (editor) {
    editor.view.dom.classList.add('multi-page-editor');
    
    addPageBreakIndicators();
    
    // Update on content changes
    editor.on('update', () => {
      updatePageCount();
    });
  }
  
  return {
    updatePageCount,
    addPageBreakIndicators
  };
}

// Helper function to add page break CSS
export function addPageBreakStyles() {
  // Page break styles are loaded from page-break.css
  console.log('Page break styles loaded');
  return () => {};
}