/**
 * Force Link Styling Module
 * 
 * This module uses direct DOM manipulation to ensure links in the editor
 * ALWAYS have the proper styling regardless of what TipTap does internally.
 */

// Direct DOM manipulation to force styling of all links in the editor
export function forceLinkStyling() {
  if (typeof document === 'undefined') return;
  
  // Directly select all links in the editor and apply styling
  const editorLinks = document.querySelectorAll('.ProseMirror a');
  
  editorLinks.forEach(link => {
    // Force link styling using direct DOM manipulation
    const linkElement = link as HTMLElement;
    
    // Apply critical styling
    linkElement.style.color = '#1a73e8';
    linkElement.style.textDecoration = 'underline';
    linkElement.style.backgroundColor = 'rgba(26, 115, 232, 0.05)';
    linkElement.style.borderRadius = '2px';
    linkElement.style.cursor = 'pointer';
    linkElement.style.padding = '0 1px';
    
    // Add classes and data attributes
    linkElement.classList.add('editor-link');
    linkElement.setAttribute('data-type', 'link');
    linkElement.setAttribute('data-styled', 'true');
    
    // Add title attribute for tooltip
    const href = linkElement.getAttribute('href');
    if (href && !linkElement.getAttribute('title')) {
      linkElement.setAttribute('title', `${href} (Ctrl+Click to open, Click to edit)`);
    }
  });
}

// Set up a MutationObserver to watch for changes to links
export function setupLinkObserver() {
  if (typeof window === 'undefined') return;
  
  const observer = new MutationObserver((mutations) => {
    // If any node was added or attributes were changed, check for links
    const shouldCheckForLinks = mutations.some(mutation => 
      mutation.type === 'childList' || mutation.type === 'attributes'
    );
    
    if (shouldCheckForLinks) {
      forceLinkStyling();
    }
  });
  
  // Start observing the document after a short delay
  setTimeout(() => {
    const editor = document.querySelector('.ProseMirror');
    if (editor) {
      observer.observe(editor, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'class']
      });
      
      // Also force styling immediately
      forceLinkStyling();
      
      console.log('Link observer initialized for editor');
    }
  }, 500);
  
  return observer;
}

// Also set up manual styling triggers for specific editor operations
export function setupLinkStylingEvents() {
  document.addEventListener('editor:linkAdded', () => {
    console.log('Link added event received, forcing styling');
    setTimeout(forceLinkStyling, 50);
  });
  
  document.addEventListener('editor:contentChanged', () => {
    setTimeout(forceLinkStyling, 50);
  });
}

// Function to directly style a specific link element
export function styleSingleLink(linkElement: HTMLElement | null) {
  if (!linkElement) return;
  
  linkElement.style.color = '#1a73e8';
  linkElement.style.textDecoration = 'underline';
  linkElement.style.backgroundColor = 'rgba(26, 115, 232, 0.05)';
  linkElement.style.borderRadius = '2px';
  linkElement.classList.add('editor-link');
}