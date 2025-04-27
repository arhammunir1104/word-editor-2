/**
 * Brute Force Link Styling
 * 
 * This is a last resort approach that completely bypasses TipTap's rendering
 * by directly inserting visibly styled elements into the DOM.
 */

// Function to inject styled links into the DOM
export function injectBruteForceStyledLinks() {
  // Find all links in the editor
  const editorElement = document.querySelector('.ProseMirror');
  if (!editorElement) return;
  
  // Find all links in the editor - including ones that might be hidden or not properly styled
  const links = editorElement.querySelectorAll('a');
  
  links.forEach(link => {
    // If the link is already styled by us, skip it
    if (link.getAttribute('data-brute-force-styled') === 'true') return;
    
    // Get link attributes
    const href = link.getAttribute('href') || '#';
    const text = link.textContent || '';
    
    // Create a visibly styled replacement element
    const styledSpan = document.createElement('span');
    styledSpan.className = 'brute-force-link';
    styledSpan.setAttribute('data-href', href);
    styledSpan.setAttribute('data-original-link', 'true');
    styledSpan.style.cssText = `
      color: #1a73e8 !important;
      text-decoration: underline !important;
      cursor: pointer !important;
      display: inline-block !important;
    `;
    styledSpan.textContent = text;
    
    // Add click handler directly to the element
    styledSpan.addEventListener('click', (e) => {
      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Check if ctrl/cmd key is pressed
      if (e.ctrlKey || e.metaKey) {
        // Open link in new tab
        window.open(href, '_blank');
      } else {
        // Show edit modal
        document.dispatchEvent(new CustomEvent('link:clicked', {
          detail: { href: href }
        }));
      }
    });
    
    // Insert the styled span immediately after the link
    if (link.parentNode) {
      // Mark the original as styled
      link.setAttribute('data-brute-force-styled', 'true');
      
      // Don't replace the original link, but add our visible version after it
      // This preserves TipTap's internal structure
      link.parentNode.insertBefore(styledSpan, link.nextSibling);
      
      // Hide the original link
      link.style.display = 'none';
    }
  });
}

// Set up a interval to continuously check for unstyled links
export function setupBruteForceLinks() {
  // Run the brute force styling immediately
  injectBruteForceStyledLinks();
  
  // Set up a interval
  const intervalId = setInterval(injectBruteForceStyledLinks, 1000);
  
  // Set up observers to detect DOM changes
  const editorElement = document.querySelector('.ProseMirror');
  if (editorElement) {
    const observer = new MutationObserver((mutations) => {
      // Run our brute force styling after any DOM changes
      setTimeout(injectBruteForceStyledLinks, 50);
    });
    
    // Observe all changes to the editor
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }
  
  // Listen for link events
  document.addEventListener('editor:linkAdded', () => {
    setTimeout(injectBruteForceStyledLinks, 50);
  });
  
  // Return a cleanup function
  return () => {
    clearInterval(intervalId);
  };
}