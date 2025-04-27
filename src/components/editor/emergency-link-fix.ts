/**
 * EMERGENCY LINK FIX
 * 
 * This is a direct browser-based approach that completely bypasses TipTap
 * and uses raw DOM manipulation to ensure links are always visible.
 */
import { GLOBAL_SCANNER_CONFIG } from './fixes';

// Run this immediately when imported
(function() {
  console.log("🚨 EMERGENCY LINK FIX ACTIVATED");

  // To disable the emergency link scanner on startup
  GLOBAL_SCANNER_CONFIG.disableLinkScanners = true;
  
  // Set up observers to run only if enabled
  setTimeout(() => {
    if (!GLOBAL_SCANNER_CONFIG.disableLinkScanners) emergencyLinkFix();
  }, 100);
  
  // Set up limited monitoring rather than continuous
  setInterval(() => {
    if (!GLOBAL_SCANNER_CONFIG.disableLinkScanners) emergencyLinkFix();
  }, 5000); // Run less frequently (every 5 seconds instead of 500ms)
  
  // Add event listener for editor updates that only runs when needed
  document.addEventListener('editor:linkAdded', () => {
    if (!GLOBAL_SCANNER_CONFIG.disableLinkScanners) {
      setTimeout(emergencyLinkFix, 100);
    }
  });
})();

// The core emergency fix function
function emergencyLinkFix() {
  console.log("🔎 Emergency link scanner running...");
  
  // First approach: Find all links and force styling
  const allLinks = document.querySelectorAll('.ProseMirror a, .ProseMirror [href], .ProseMirror [data-is-link="true"]');
  
  if (allLinks.length > 0) {
    console.log(`Found ${allLinks.length} links to emergency style`);
    
    allLinks.forEach(link => {
      const element = link as HTMLElement;
      
      // Apply MAXIMUM styling
      element.style.color = 'red';
      element.style.backgroundColor = 'yellow';
      element.style.textDecoration = 'underline';
      element.style.borderBottom = '1px solid red';
      element.style.padding = '0 2px';
      element.style.margin = '0 1px';
      element.style.cursor = 'pointer';
      element.style.borderRadius = '2px';
      element.style.fontWeight = 'bold';
      element.style.boxShadow = '0 0 0 1px red';
    });
  } else {
    console.log("No direct links found, searching for marks...");
    
    // Second approach: Look for ProseMirror marks
    const editors = document.querySelectorAll('.ProseMirror');
    
    editors.forEach(editor => {
      // Look for text with marks that might be links
      const textNodes = collectTextNodes(editor);
      
      textNodes.forEach((textNode) => {
        const parent = textNode.parentNode;
        
        // Check if this parent might be a link
        if (parent && (
          (parent as HTMLElement).hasAttribute('href') ||
          (parent as HTMLElement).hasAttribute('data-is-link') ||
          (parent as Element).classList.contains('link') ||
          (parent as Element).classList.contains('custom-link')
        )) {
          // This is likely a link, forcibly style it
          const element = parent as HTMLElement;
          
          // Apply MAXIMUM styling
          element.style.color = 'red';
          element.style.backgroundColor = 'yellow';
          element.style.textDecoration = 'underline';
          element.style.borderBottom = '1px solid red';
          element.style.padding = '0 2px';
          element.style.margin = '0 1px';
          element.style.cursor = 'pointer';
          element.style.borderRadius = '2px';
          element.style.fontWeight = 'bold';
          element.style.boxShadow = '0 0 0 1px red';
        } else {
          // Check the text content for URL patterns
          const text = textNode.textContent || '';
          
          if (isUrlLike(text)) {
            console.log(`🌐 Found URL-like text: ${text}`);
            
            // Create a styled wrapper
            const wrapper = document.createElement('span');
            wrapper.classList.add('emergency-link');
            wrapper.setAttribute('data-original-text', text);
            wrapper.textContent = text;
            
            // Apply emergency styling
            wrapper.style.color = 'red';
            wrapper.style.backgroundColor = 'yellow';
            wrapper.style.textDecoration = 'underline';
            wrapper.style.borderBottom = '1px solid red';
            wrapper.style.padding = '0 2px';
            wrapper.style.margin = '0 1px';
            wrapper.style.cursor = 'pointer';
            wrapper.style.borderRadius = '2px';
            wrapper.style.fontWeight = 'bold';
            wrapper.style.boxShadow = '0 0 0 1px red';
            
            // Replace the text node with our wrapper
            if (textNode.parentNode) {
              textNode.parentNode.replaceChild(wrapper, textNode);
            }
          }
        }
      });
    });
  }
}

// Helper function to collect all text nodes
function collectTextNodes(element: Element): Text[] {
  const textNodes: Text[] = [];
  
  // Function to recursively walk the DOM and collect text nodes
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      textNodes.push(node as Text);
    } else if (node.childNodes && node.childNodes.length) {
      node.childNodes.forEach(walk);
    }
  }
  
  walk(element);
  return textNodes;
}

// Helper function to check if text looks like a URL
function isUrlLike(text: string): boolean {
  // Simple check for URL patterns
  return (
    text.includes('http://') ||
    text.includes('https://') ||
    text.includes('www.') ||
    /\.[a-z]{2,}(\/|$)/.test(text)  // Has a domain ending
  );
}

export {}; // Ensure this is treated as a module