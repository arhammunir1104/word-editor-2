/**
 * Global Link Styler
 * 
 * This script aggressively styles links directly in the DOM using a MutationObserver.
 * It bypasses TipTap entirely and works at the DOM level to ensure links are visible.
 */
import { GLOBAL_SCANNER_CONFIG } from './fixes';

let observer: MutationObserver | null = null;

export function initGlobalLinkStyler() {
  console.log('🔗 Initializing Global Link Styler');
  
  // Disable the scanner to stop the console spam
  GLOBAL_SCANNER_CONFIG.disableLinkScanners = true;
  
  // Add event listeners for link operations that only runs when needed
  document.addEventListener('editor:linkAdded', () => {
    if (!GLOBAL_SCANNER_CONFIG.disableLinkScanners) {
      styleAllLinksInDocument();
    }
  });
  
  // Return cleanup function
  return () => {
    if (observer) {
      observer.disconnect();
    }
    document.removeEventListener('editor:linkAdded', styleAllLinksInDocument);
  };
}

function styleAllLinksInDocument() {
  console.log('🔍 Scanning for links to style...');
  
  // Find all editor containers
  const editors = document.querySelectorAll('.ProseMirror');
  
  editors.forEach(editor => {
    // First, try to find actual <a> tags
    const links = editor.querySelectorAll('a');
    
    if (links.length > 0) {
      console.log(`💡 Found ${links.length} links to style`);
      
      // Apply styling to each link
      links.forEach(link => {
        const element = link as HTMLElement;
        
        // Add classes
        element.classList.add('custom-link', 'editor-link');
        
        // Add data attributes
        element.setAttribute('data-is-link', 'true');
        element.setAttribute('data-type', 'link');
        
        // Apply direct styles - Use blue styling for production
        element.style.color = '#1a73e8';
        element.style.textDecoration = 'underline';
        element.style.cursor = 'pointer';
        
        // Add title with instructions
        const href = element.getAttribute('href') || '#';
        element.setAttribute('title', `${href} (Ctrl+Click to open, Click to edit)`);
      });
    } else {
      console.log('⚠️ No <a> tags found in editor, checking for mark attributes...');
      
      // If no <a> tags found, look for spans with mark attributes
      const paragraphs = editor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
      
      paragraphs.forEach(paragraph => {
        // Check if this contains any text with link mark
        const textNodes = Array.from(paragraph.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE);
        
        if (textNodes.length > 0) {
          // Look for marks in the paragraph's attributes
          const hasLinkMark = paragraph.hasAttribute('data-mark-link') || 
                             paragraph.hasAttribute('mark-link') ||
                             paragraph.classList.contains('has-link');
          
          if (hasLinkMark) {
            console.log('🔗 Found text with link mark, replacing with styled span');
            
            // Replace text nodes with styled spans
            textNodes.forEach(textNode => {
              const text = textNode.textContent || '';
              if (text.trim().length > 0) {
                const span = document.createElement('span');
                span.textContent = text;
                span.classList.add('brute-force-link');
                span.setAttribute('data-is-link', 'true');
                span.setAttribute('data-type', 'link');
                span.style.color = '#1a73e8';
                span.style.textDecoration = 'underline';
                span.style.cursor = 'pointer';
                
                // Replace the text node with our styled span
                textNode.parentNode?.replaceChild(span, textNode);
              }
            });
          }
        }
      });
    }
  });
}

function setupLinkObserver() {
  // Create a MutationObserver to watch for DOM changes
  observer = new MutationObserver((mutations) => {
    // Check if any mutations affect the editor
    const shouldRestyle = mutations.some(mutation => {
      // Check if the mutation target is inside an editor
      let node = mutation.target as Node;
      while (node) {
        if (node instanceof Element && node.classList.contains('ProseMirror')) {
          return true;
        }
        if (node.parentNode) {
          node = node.parentNode;
        } else {
          break;
        }
      }
      return false;
    });
    
    // If editor content changed, re-style links
    if (shouldRestyle) {
      setTimeout(styleAllLinksInDocument, 10);
    }
  });
  
  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
}