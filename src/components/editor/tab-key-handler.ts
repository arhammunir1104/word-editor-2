/**
 * Google Docs Tab Key Handler
 * 
 * This implements exact Google Docs behavior for Tab/Shift+Tab to indent/outdent paragraphs:
 * - Uses direct DOM manipulation for reliable indentation
 * - Captures Tab and Shift+Tab key events
 * - Blocks default tab behavior (which would move focus)
 * - Applies proper 36px (0.5 inch) indentation steps
 * - Works with single paragraphs and multiple selected paragraphs
 * - Integrates with global undo/redo system
 */

// Define the standard Google Docs indentation amount (0.5 inches = 36px)
const INDENT_AMOUNT = 36;

export function setupTabKeyHandlers() {
  // Use a function that will be called once the DOM is fully loaded
  const setupHandlers = () => {
    // Get all editor areas - we need to handle Tab in all of them
    const editorAreas = document.querySelectorAll('.ProseMirror');
    
    editorAreas.forEach(editor => {
      // Use the raw addEventListener with string type to avoid TS errors
      // We know this works at runtime even if TypeScript complains
      editor.addEventListener('keydown', function(e: Event) {
        // Cast to KeyboardEvent since we know it's a keyboard event
        const keyEvent = e as KeyboardEvent;
        handleTabKey(keyEvent);
      });
    });
    
    console.log(`Tab key handlers set up on ${editorAreas.length} editor areas`);
  };
  
  // Setup now and also when the DOM changes
  setupHandlers();
  
  // Also set up a MutationObserver to catch any dynamically added editors
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // If nodes were added, check if any are our editor
        const addedEditors = document.querySelectorAll('.ProseMirror:not([data-tab-handler])');
        if (addedEditors.length > 0) {
          console.log('New editors detected, setting up tab handlers');
          setupHandlers();
        }
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Handle Tab and Shift+Tab key events for indentation
 * This stops the default tab behavior (focus change) and applies our indentation
 */
function handleTabKey(event: KeyboardEvent) {
  // Only handle Tab and Shift+Tab
  if (event.key !== 'Tab') return;
  
  console.log('Tab key intercepted:', event.key, event.shiftKey);
  
  // Get the current selection
  const selection = window.getSelection();
  if (!selection) return;
  
  // Get the current node where the cursor is
  const anchorNode = selection.anchorNode;
  if (!anchorNode) return;
  
  // Find the paragraph element
  let paragraph = anchorNode.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement
    : anchorNode as HTMLElement;
  
  // Navigate up to find a paragraph or heading
  while (paragraph && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(paragraph.nodeName)) {
    paragraph = paragraph.parentElement;
    if (!paragraph) break;
  }
  
  // If we didn't find a paragraph or heading, do nothing
  if (!paragraph) return;
  
  // Check if we're in a list - skip as lists have their own Tab handling
  if (paragraph.closest('ul, ol')) {
    console.log('In a list - letting TipTap handle tab');
    return;
  }
  
  // Get the current indentation level
  const currentMargin = paragraph.style.marginLeft 
    ? parseInt(paragraph.style.marginLeft) 
    : 0;
  
  // If the selection is collapsed (cursor position), only indent the current paragraph
  if (selection.isCollapsed) {
    // Indent or outdent based on Shift key
    if (event.shiftKey) {
      // Outdent (Shift+Tab) - only if there's margin to reduce
      if (currentMargin > 0) {
        const newMargin = Math.max(0, currentMargin - INDENT_AMOUNT);
        
        // In Google Docs style, completely remove the margin if it's at minimum
        if (newMargin === 0) {
          paragraph.style.removeProperty('margin-left');
        } else {
          paragraph.style.marginLeft = `${newMargin}px`;
        }
        
        console.log(`Outdented paragraph from ${currentMargin}px to ${newMargin}px`);
        
        // Add to history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('tab-outdent-paragraph');
        }
      }
    } else {
      // Indent (Tab) - increase margin
      const newMargin = currentMargin + INDENT_AMOUNT;
      paragraph.style.marginLeft = `${newMargin}px`;
      
      console.log(`Indented paragraph from ${currentMargin}px to ${newMargin}px`);
      
      // Add to history
      if (window.historyManager) {
        window.historyManager.addHistoryStep('tab-indent-paragraph');
      }
    }
  } else {
    // For non-collapsed selection, find all paragraphs in the selection
    const range = selection.getRangeAt(0);
    const allParagraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    const paragraphsInRange: HTMLElement[] = [];
    
    // Gather all paragraphs that intersect with the selection
    Array.from(allParagraphs).forEach(p => {
      if (range.intersectsNode(p) && !p.closest('ul, ol')) {
        paragraphsInRange.push(p as HTMLElement);
      }
    });
    
    console.log(`Found ${paragraphsInRange.length} paragraphs in selection range`);
    
    // Indent or outdent all paragraphs in the selection
    if (paragraphsInRange.length > 0) {
      if (event.shiftKey) {
        // Outdent (Shift+Tab) all paragraphs
        paragraphsInRange.forEach(p => {
          const currentMargin = p.style.marginLeft ? parseInt(p.style.marginLeft) : 0;
          
          if (currentMargin > 0) {
            const newMargin = Math.max(0, currentMargin - INDENT_AMOUNT);
            
            // In Google Docs style, completely remove the margin if it's at minimum
            if (newMargin === 0) {
              p.style.removeProperty('margin-left');
            } else {
              p.style.marginLeft = `${newMargin}px`;
            }
            
            console.log(`Outdented paragraph in selection from ${currentMargin}px to ${newMargin}px`);
          }
        });
        
        // Add to history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('tab-outdent-multiple');
        }
      } else {
        // Indent (Tab) all paragraphs
        paragraphsInRange.forEach(p => {
          const currentMargin = p.style.marginLeft ? parseInt(p.style.marginLeft) : 0;
          const newMargin = currentMargin + INDENT_AMOUNT;
          p.style.marginLeft = `${newMargin}px`;
          
          console.log(`Indented paragraph in selection from ${currentMargin}px to ${newMargin}px`);
        });
        
        // Add to history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('tab-indent-multiple');
        }
      }
    }
  }
  
  // Prevent default tab behavior (which would change focus)
  event.preventDefault();
  
  // Dispatch global event to notify of paragraph indentation
  document.dispatchEvent(new CustomEvent('paragraph:indentation:changed'));
}