/**
 * Custom Link Handlers
 * 
 * This script provides additional link handling functionality that bypasses
 * TipTap's normal rendering system for links.
 */

/**
 * Initialize custom link handlers for the editor
 */
export function initCustomLinkHandlers() {
  console.log("Initializing custom link handlers");
  
  // Find all link elements in the editor and apply special attributes
  // This runs periodically to ensure newly created links are also handled
  setInterval(() => {
    const editorContainer = document.querySelector('.ProseMirror');
    if (!editorContainer) return;
    
    // Find all links
    const links = editorContainer.querySelectorAll('a');
    links.forEach(link => {
      // Add special attributes to ensure CSS selection works
      link.setAttribute('data-link', 'true');
      link.setAttribute('data-type', 'link');
      link.classList.add('editor-direct-link');
      
      // Add debugging style attributes directly
      link.style.setProperty('color', 'red', 'important');
      link.style.setProperty('background-color', 'yellow', 'important');
      link.style.setProperty('text-decoration', 'underline', 'important');
      link.style.setProperty('font-weight', 'bold', 'important');
      
      // Add wrapper span for additional styling if needed
      if (!link.hasAttribute('data-wrapped')) {
        // Store original link content
        const content = link.innerHTML;
        
        // Create wrapper span
        const wrapper = document.createElement('span');
        wrapper.className = 'link-wrapper';
        wrapper.style.setProperty('color', 'red', 'important');
        wrapper.style.setProperty('background-color', 'yellow', 'important');
        wrapper.style.setProperty('text-decoration', 'underline', 'important');
        wrapper.innerHTML = content;
        
        // Clear link and add wrapper
        link.innerHTML = '';
        link.appendChild(wrapper);
        link.setAttribute('data-wrapped', 'true');
      }
    });
  }, 500);
  
  // Add click handler for all links
  document.addEventListener('click', (e) => {
    try {
      // Safety check - make sure target is an element
      if (!(e.target instanceof Element)) {
        return;
      }

      // Find if we clicked on a link
      const target = e.target as Element;
      
      // Safely try to find the closest 'a' element
      const linkEl = target.closest('a');
      
      // Make sure we have a valid link element inside the editor
      if (linkEl && linkEl instanceof HTMLElement) {
        const prosemirrorContainer = linkEl.closest('.ProseMirror');
        if (prosemirrorContainer) {
          e.preventDefault();
          
          // Get the URL
          const url = linkEl.getAttribute('href') || '#';
          
          // Check if ctrl/cmd key is pressed
          if (e.ctrlKey || e.metaKey) {
            // Open link in new tab
            window.open(url, '_blank');
          } else {
            // Show the edit modal
            document.dispatchEvent(new CustomEvent('link:clicked', {
              detail: { href: url }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error handling link click:', error);
    }
  }, true);
  
  // Listen for new links being created
  document.addEventListener('editor:linkCreated', () => {
    // Force immediate styling
    const editorContainer = document.querySelector('.ProseMirror');
    if (!editorContainer) return;
    
    setTimeout(() => {
      // Find all links without our custom attributes
      const links = editorContainer.querySelectorAll('a:not([data-link])');
      links.forEach(link => {
        // Add special attributes
        link.setAttribute('data-link', 'true');
        link.setAttribute('data-type', 'link');
        link.classList.add('editor-direct-link');
        
        // Add direct styling - cast to HTMLElement to access style
        const htmlLink = link as HTMLElement;
        htmlLink.style.setProperty('color', 'red', 'important');
        htmlLink.style.setProperty('background-color', 'yellow', 'important');
        htmlLink.style.setProperty('text-decoration', 'underline', 'important');
        htmlLink.style.setProperty('font-weight', 'bold', 'important');
      });
    }, 10);
  });
}