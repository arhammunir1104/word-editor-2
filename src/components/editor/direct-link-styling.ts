/**
 * Direct Link Styling Handler
 * 
 * This module directly manipulates links in the TipTap editor by:
 * 1. Wrapping link text in a span with inline styles
 * 2. Ensuring styles are actually applied regardless of TipTap's behavior
 */

/**
 * Function to manually style links in the editor
 * This is called after any link operations
 */
export function styleLinks() {
  // Get all links in the editor
  const editorElement = document.querySelector('.ProseMirror');
  if (!editorElement) return;
  
  // Find all links
  const links = editorElement.querySelectorAll('a');
  
  // Process each link
  links.forEach(link => {
    // Check if this link has already been styled with our wrapper
    if (link.getAttribute('data-styled') === 'true') return;
    
    // Get the text content
    const text = link.textContent || '';
    const href = link.getAttribute('href') || '#';
    
    // Create a styled span that will wrap the link text - using RED for debugging
    const span = document.createElement('span');
    span.style.color = 'red';
    span.style.fontWeight = 'bold';
    span.style.textDecoration = 'underline';
    span.style.backgroundColor = 'yellow';
    span.style.borderRadius = '2px';
    span.style.padding = '0 2px';
    span.style.cursor = 'pointer';
    span.textContent = text;
    
    // Clear the link content and append our styled span
    link.innerHTML = '';
    link.appendChild(span);
    
    // Mark this link as styled so we don't process it again
    link.setAttribute('data-styled', 'true');
    link.setAttribute('data-type', 'link');
    link.setAttribute('class', 'editor-link');
    link.setAttribute('title', `Link to: ${href} (Click to edit, Ctrl+Click to open)`);
    
    // Apply direct styles to the link element itself as a fallback - using RED for debugging
    link.style.color = 'red';
    link.style.fontWeight = 'bold';
    link.style.textDecoration = 'underline';
    link.style.backgroundColor = 'yellow';
    link.style.borderRadius = '2px';
    link.style.padding = '0 2px';
  });
}

/**
 * Sets up a timer to periodically check for links that need styling
 */
export function setupPeriodicLinkStyling() {
  // Run immediately
  styleLinks();
  
  // Then set up a interval to continuously check for unstyled links
  setInterval(styleLinks, 1000);
  
  // Also set up MutationObserver for more responsive updates
  const editorElement = document.querySelector('.ProseMirror');
  if (editorElement) {
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations might have added links
      const shouldCheckLinks = mutations.some(mutation => {
        return mutation.type === 'childList' || 
               (mutation.type === 'attributes' && mutation.attributeName === 'href');
      });
      
      if (shouldCheckLinks) {
        setTimeout(styleLinks, 50);
      }
    });
    
    // Start observing with a wide net
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'class']
    });
  }
}

/**
 * Style links on demand when an event occurs
 */
export function setupLinkEventListeners() {
  // Listen for events from the link modal
  document.addEventListener('editor:linkAdded', () => {
    setTimeout(styleLinks, 50);
  });
  
  // Listen for editor content changes
  document.addEventListener('editor:contentChanged', () => {
    setTimeout(styleLinks, 50);
  });
}