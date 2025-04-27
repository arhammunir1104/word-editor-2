/**
 * Super Direct Link Implementation
 * 
 * This bypasses TipTap's rendering system completely and implements links by
 * directly modifying the HTML structure, ensuring they're always visible.
 */

/**
 * Apply a link to the currently selected text in the editor
 */
export function applyDirectLink(url: string): void {
  // Get the current selection
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  // Get the selected text range
  const range = selection.getRangeAt(0);
  
  // Create a styled link element
  const linkElement = document.createElement('a');
  linkElement.href = url;
  linkElement.style.color = 'red';  // Debugging color to ensure visibility
  linkElement.style.backgroundColor = 'yellow'; // Debugging background
  linkElement.style.textDecoration = 'underline';
  linkElement.style.fontWeight = 'bold';
  linkElement.style.padding = '0 2px';
  linkElement.style.borderRadius = '2px';
  linkElement.style.cursor = 'pointer';
  linkElement.setAttribute('data-link', 'true');
  linkElement.setAttribute('data-url', url);
  linkElement.className = 'editor-direct-link';
  
  // For debug tooltip
  linkElement.title = `Link to: ${url}`;
  
  // Extract the selected text content
  linkElement.textContent = range.toString();
  
  // Replace the selected text with our link element
  range.deleteContents();
  range.insertNode(linkElement);
  
  // Clear the selection to avoid issues
  selection.removeAllRanges();
}

/**
 * Initialize direct link handling in the editor
 */
export function initDirectLinkHandler(): void {
  // Find the editor container
  const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
  if (!editorElement) return;
  
  // Set up a click handler to detect clicks on our links
  editorElement.addEventListener('click', (e) => {
    // Find if we clicked on a link or inside a link
    let target = e.target as HTMLElement;
    let linkElement: HTMLElement | null = null;
    
    // Walk up the DOM to find the closest link element
    while (target && target !== editorElement) {
      if (target.tagName === 'A' || target.hasAttribute('data-link')) {
        linkElement = target;
        break;
      }
      
      // Check if parentElement is null before continuing
      if (!target.parentElement) break;
      target = target.parentElement as HTMLElement;
    }
    
    // If we found a link, handle the click
    if (linkElement) {
      e.preventDefault();
      e.stopPropagation();
      
      // Get the URL from the link
      const url = linkElement.getAttribute('href') || 
                 linkElement.getAttribute('data-url') || '#';
      
      // Check if ctrl/cmd key is pressed
      if (e.ctrlKey || e.metaKey) {
        // Open link in new tab
        window.open(url, '_blank');
      } else {
        // Show edit modal by dispatching an event
        document.dispatchEvent(new CustomEvent('link:directClicked', {
          detail: { 
            href: url, 
            // Use a safer approach with element - TypeScript is concerned about null
            element: linkElement 
          }
        }));
      }
    }
  });
  
  // Also provide a direct handle to force red styling on all links
  // This is a fallback to ensure all links are visible
  setInterval(() => {
    const links = editorElement.querySelectorAll('a');
    links.forEach(link => {
      // Only style if not already styled
      if (!link.hasAttribute('data-styled')) {
        link.style.color = 'red';
        link.style.backgroundColor = 'yellow';
        link.style.textDecoration = 'underline';
        link.style.fontWeight = 'bold';
        link.style.padding = '0 2px';
        link.style.borderRadius = '2px';
        link.style.cursor = 'pointer';
        link.setAttribute('data-styled', 'true');
      }
    });
  }, 1000);
}

/**
 * Register event listener for direct link creation
 */
export function setupDirectLinkListeners(): void {
  // Listen for events to create links directly
  document.addEventListener('editor:createDirectLink', ((e: CustomEvent) => {
    if (e.detail && e.detail.url) {
      applyDirectLink(e.detail.url);
    }
  }) as EventListener);
}