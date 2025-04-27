/**
 * Link Handler Extension for TipTap
 * 
 * This extension adds custom behavior for handling link clicks in the editor:
 * - Ctrl+Click (or Command+Click on Mac) to open the link in a new tab
 * - Regular click to edit the link (show link modal)
 * - Proper right-click context menu behavior
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export interface LinkHandlerOptions {
  // Callback for when a link is clicked to open the edit modal
  onLinkClick?: (attrs: { href: string }) => void;
}

// Create a helper function outside the extension for link styling
function setupLinkStylesObserver() {
  if (typeof window === 'undefined') return;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // Find all links that don't have our styling applied
        document.querySelectorAll('.ProseMirror a:not([data-styled="true"])').forEach(link => {
          // Add visual styling to links
          (link as HTMLElement).style.color = '#1a73e8';
          (link as HTMLElement).style.textDecoration = 'underline';
          (link as HTMLElement).style.cursor = 'pointer';
          link.setAttribute('title', `${link.getAttribute('href')} (Ctrl+Click to open, Click to edit)`);
          link.setAttribute('data-styled', 'true');
          link.setAttribute('data-type', 'link');
        });
      }
    });
  });
  
  // Set a timeout to ensure DOM is ready
  setTimeout(() => {
    // Start observing the editor content
    const editorContent = document.querySelector('.ProseMirror');
    if (editorContent) {
      observer.observe(editorContent, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['href'] 
      });
    }
  }, 500);
}

export const LinkHandlerExtension = Extension.create<LinkHandlerOptions>({
  name: 'linkHandler',
  
  addOptions() {
    return {
      onLinkClick: undefined,
    };
  },
  
  onCreate() {
    // Additional setup for link styling
    // This ensures all links have visual indication by using DOM mutation observer
    if (typeof window !== 'undefined') {
      // Use the helper function to set up link styling
      setupLinkStylesObserver();
    }
  },
  
  addProseMirrorPlugins() {
    const { onLinkClick } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('handleLinkClicks'),
        props: {
          // Fix: Define proper event handler with types
          handleDOMEvents: {
            // Handle mouse over events for links
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              const linkElement = target.closest('a');
              if (linkElement) {
                // Add hover-specific styling
                linkElement.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
                linkElement.style.borderRadius = '2px';
                linkElement.style.transition = 'background-color 0.2s';
                
                // Store original link for cleanup
                linkElement.setAttribute('data-hovered', 'true');
                return true;
              }
              return false;
            },
            
            // Handle mouse leave events
            mouseout: (view, event) => {
              document.querySelectorAll('a[data-hovered="true"]').forEach(link => {
                (link as HTMLElement).style.backgroundColor = '';
                link.removeAttribute('data-hovered');
              });
              return false;
            }
          },
          
          handleClick: (view, pos, event) => {
            // Check if it's a link element
            const { state } = view;
            const { schema, doc, selection } = state;
            
            // Early return if no link extension exists in schema
            if (!schema.marks.link) {
              return false;
            }
            
            // The node and position where the click happened
            const node = doc.nodeAt(pos);
            
            // Check if we clicked on a text node
            if (!node || !node.isText) {
              return false;
            }
            
            // Check if the text has a link mark
            const linkMark = node.marks.find(mark => mark.type.name === 'link');
            if (!linkMark) {
              return false;
            }
            
            // Handle different click types
            if (event.ctrlKey || event.metaKey) {
              // Ctrl/Cmd+Click: Open link in new tab
              event.preventDefault();
              window.open(linkMark.attrs.href, '_blank', 'noopener,noreferrer');
              return true;
            } else {
              // Regular click: Open the edit modal
              event.preventDefault();
              
              // Make sure we have the href and dispatch a custom event
              if (typeof linkMark.attrs.href === 'string') {
                // Dispatch event to open link modal
                document.dispatchEvent(
                  new CustomEvent('link:clicked', { 
                    detail: { href: linkMark.attrs.href } 
                  })
                );
                
                // Set selection to the link text (Google Docs behavior)
                const resolvedPos = doc.resolve(pos);
                const $pos = resolvedPos;
                
                // Find the beginning and end of the linked text
                let startIndex = $pos.index();
                let endIndex = startIndex;
                
                // Simple approach: Just select the current text node with the link
                const parent = $pos.parent;
                
                // Calculate node position
                let startPos = $pos.start() + $pos.parentOffset;
                let endPos = startPos;
                
                // Find the beginning of the linked text by walking backwards
                while (startPos > $pos.start()) {
                  const nodeBefore = doc.resolve(startPos - 1);
                  
                  if (nodeBefore.parent !== parent) break;
                  
                  const nodeMark = node.marks.find(m => 
                    m.type.name === 'link' && 
                    m.attrs.href === linkMark.attrs.href
                  );
                  
                  if (!nodeMark) break;
                  
                  startPos--;
                }
                
                // Find the end of the linked text by walking forwards
                while (endPos < $pos.end()) {
                  const nodeAfter = doc.resolve(endPos + 1);
                  
                  if (nodeAfter.parent !== parent) break;
                  
                  const nodeMark = node.marks.find(m => 
                    m.type.name === 'link' && 
                    m.attrs.href === linkMark.attrs.href
                  );
                  
                  if (!nodeMark) break;
                  
                  endPos++;
                }
                
                // Simplified but effective approach: Just select the current node
                // This is a basic approximation that works for the majority of cases
                const from = pos;
                const to = pos + node.nodeSize;
                
                // Create text selection
                const linkSelection = TextSelection.create(doc, from, to);
                
                // Set the selection
                view.dispatch(view.state.tr.setSelection(linkSelection));
                
                return true;
              }
            }
            
            return false;
          },
        },
      }),
    ];
  },
});