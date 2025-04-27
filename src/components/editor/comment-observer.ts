/**
 * Comment DOM Observer
 * 
 * This module creates a MutationObserver that watches the document
 * and applies styling to comment marks regardless of what Tiptap/ProseMirror does.
 * This provides a more reliable approach to styling comments.
 */

export class CommentObserver {
  private observer: MutationObserver | null = null;
  private interval: number | null = null;
  private targetNode: HTMLElement | null = null;
  private forceStyleInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the observer on a target node (editor container)
   */
  public initialize(targetNode: HTMLElement): void {
    if (!targetNode) {
      console.error("Cannot initialize CommentObserver: No target node provided");
      return;
    }

    this.targetNode = targetNode;
    console.log("CommentObserver: Initializing on node", targetNode);

    // Create an observer instance linked to the callback function
    this.observer = new MutationObserver(this.mutationCallback.bind(this));

    // Start observing the target node for configured mutations
    this.observer.observe(targetNode, { 
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-comment-id', 'class']
    });

    // Set up a more aggressive regular sweeper interval as a backup
    this.forceStyleInterval = setInterval(() => {
      this.forceCommentStyling();
    }, 500); // Check more frequently (every 500ms) to ensure styling is applied

    console.log("CommentObserver: Observer initialized and force styling interval set");
  }

  /**
   * Cleanup and disconnect the observer
   */
  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.forceStyleInterval) {
      clearInterval(this.forceStyleInterval);
      this.forceStyleInterval = null;
    }

    console.log("CommentObserver: Disconnected");
  }

  /**
   * Main mutation callback - fires when DOM changes are detected
   */
  private mutationCallback(mutations: MutationRecord[]): void {
    let commentElementsModified = false;

    // Check if any of the mutations involve comment elements
    for (const mutation of mutations) {
      // Handle attribute mutations
      if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement;
        if (target.hasAttribute('data-comment-id') || 
            (target.classList && target.classList.contains('comment-mark'))) {
          commentElementsModified = true;
          this.styleCommentElement(target);
        }
      }
      
      // Handle added nodes
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i] as HTMLElement;
          
          // If the node itself is a comment element
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute('data-comment-id') || 
                (node.classList && node.classList.contains('comment-mark'))) {
              commentElementsModified = true;
              this.styleCommentElement(node);
            }
            
            // Check children for comment elements
            const commentElements = node.querySelectorAll('[data-comment-id], .comment-mark');
            if (commentElements.length > 0) {
              commentElementsModified = true;
              commentElements.forEach(el => this.styleCommentElement(el as HTMLElement));
            }
          }
        }
      }
    }

    // If we detected comment elements, run a full styling pass to be sure
    if (commentElementsModified) {
      this.forceCommentStyling();
    }
  }

  /**
   * Apply styling to a specific comment element
   */
  private styleCommentElement(element: HTMLElement): void {
    if (!element) return;

    try {
      // ULTRA-AGGRESSIVE: Set critical styling attribute directly first for redundancy
      element.setAttribute('style', 
        'background-color: #FFEF9E !important;' +
        'background: #FFEF9E !important;' +
        'border-bottom: 2px solid #F2C94C !important;' +
        'padding: 2px 0 !important;' +
        'display: inline !important;' +
        'border-radius: 2px !important;' +
        'position: relative !important;' +
        'z-index: 2 !important;' +
        'box-shadow: 0 0 0 2px #FFEF9E !important;' +
        'color: black !important;'
      );
      
      // Ensure it has proper classes
      element.classList.add('comment-mark', 'yellow-highlight');
      
      // Apply individual style properties as a fallback
      element.style.cssText = `
        background-color: #FFEF9E !important;
        background: #FFEF9E !important;
        border-bottom: 2px solid #F2C94C !important;
        padding: 2px 0 !important;
        display: inline !important;
        border-radius: 2px !important;
        position: relative !important;
        z-index: 2 !important;
        box-shadow: 0 0 0 2px #FFEF9E !important;
        color: black !important;
      `;
      
      // Last resort: force property settings one-by-one
      element.style.setProperty('background-color', '#FFEF9E', 'important');
      element.style.setProperty('background', '#FFEF9E', 'important');
      element.style.setProperty('border-bottom', '2px solid #F2C94C', 'important');
      element.style.setProperty('padding', '2px 0', 'important');
      element.style.setProperty('display', 'inline', 'important');
      element.style.setProperty('border-radius', '2px', 'important');
      element.style.setProperty('position', 'relative', 'important');
      element.style.setProperty('z-index', '2', 'important');
      element.style.setProperty('box-shadow', '0 0 0 2px #FFEF9E', 'important');
      element.style.setProperty('color', 'black', 'important');
    } catch (err) {
      console.error("Error styling comment element:", err);
    }
  }

  /**
   * Force styling on ALL comment elements in the document
   * This method uses multiple strategies to guarantee styling
   */
  public forceCommentStyling(): void {
    if (!this.targetNode) return;
    
    try {
      // STRATEGY 1: Direct selector approach
      // Use a comprehensive query to find ALL possible comment elements with any relevant attribute or class
      const selectors = [
        '[data-comment-id]', // Standard attribute
        '.comment-mark',     // Our primary class
        '.yellow-highlight',  // Secondary class
        '[comment-id]',      // Possible alternate attribute
        '.ProseMirror .comment-mark', // Nested inside ProseMirror
        'div[data-comment-id]', // Specific element types
        'span[data-comment-id]',
        'mark[data-comment-id]'
      ];
      
      const commentElements = this.targetNode.querySelectorAll(selectors.join(','));
      
      if (commentElements.length > 0) {
        console.log(`CommentObserver: Forcing style on ${commentElements.length} comment elements`);
        
        // Apply styling to each element with delay between batches to avoid blocking UI
        let index = 0;
        const batchProcess = () => {
          const end = Math.min(index + 10, commentElements.length);
          for (let i = index; i < end; i++) {
            this.styleCommentElement(commentElements[i] as HTMLElement);
          }
          index = end;
          
          if (index < commentElements.length) {
            setTimeout(batchProcess, 5);
          }
        };
        
        batchProcess();
      }
      
      // STRATEGY 2: Custom data attribute search for additional robustness
      try {
        // Find all elements with any kind of data-* attribute containing "comment" in its name
        const allElements = this.targetNode.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i] as HTMLElement;
          if (!element.dataset) continue;
          
          // Check all data-* attributes
          const datasetNames = Object.keys(element.dataset);
          for (const name of datasetNames) {
            if (name.toLowerCase().includes('comment')) {
              // Found an element with a data-* attribute related to comments
              this.styleCommentElement(element);
              break;
            }
          }
        }
      } catch (strategyError) {
        console.error("Error in comment element alternate search strategy:", strategyError);
      }
    } catch (err) {
      console.error("Error in force comment styling:", err);
    }
  }

  /**
   * Highlight a specific comment with visual effects and scroll to it
   */
  public highlightComment(commentId: string): void {
    if (!this.targetNode) return;
    
    try {
      // Try multiple selectors to find comment elements (very aggressive approach)
      let elements = this.targetNode.querySelectorAll(`[data-comment-id="${commentId}"]`);
      
      // If no elements found, try fallback selectors
      if (elements.length === 0) {
        console.log(`CommentObserver: No elements found with [data-comment-id="${commentId}"], trying fallbacks...`);
        
        // Look for elements with class names or attributes that match
        elements = this.targetNode.querySelectorAll(`.comment-${commentId}, [comment-id="${commentId}"]`);
      }
      
      if (elements.length > 0) {
        console.log(`CommentObserver: Highlighting comment ${commentId} (${elements.length} elements)`);
        
        // Apply special highlight styling
        elements.forEach(el => {
          const element = el as HTMLElement;
          
          // Apply multiple classes
          element.classList.add('highlight-comment', 'yellow-highlight', 'comment-mark');
          
          // Set ultra-strong visual styling to make it stand out dramatically
          element.setAttribute('style', 
            'background-color: #FFE658 !important;' +
            'background: #FFE658 !important;' +
            'padding: 2px 0 !important;' +
            'display: inline !important;' +
            'border-radius: 2px !important;' +
            'position: relative !important;' +
            'z-index: 100 !important;' + // Very high z-index
            'border: 2px solid #F2C94C !important;' +
            'box-shadow: 0 0 8px rgba(242, 201, 76, 0.8) !important;' + // Enhanced glow
            'color: black !important;' +
            'animation: pulse-comment 0.8s infinite alternate !important;'
          );
          
          // Also set individual properties to ensure they stick
          element.style.setProperty('background-color', '#FFE658', 'important');
          element.style.setProperty('background', '#FFE658', 'important');
          element.style.setProperty('box-shadow', '0 0 8px rgba(242, 201, 76, 0.8)', 'important');
          element.style.setProperty('animation', 'pulse-comment 0.8s infinite alternate', 'important');
          element.style.setProperty('z-index', '100', 'important');
          
          // Ensure data attribute is present
          if (!element.hasAttribute('data-comment-id')) {
            element.setAttribute('data-comment-id', commentId);
          }
        });
        
        // Create a more reliable scroll-to functionality
        if (elements.length > 0) {
          setTimeout(() => {
            try {
              // Try multiple approaches to ensure scrolling works
              
              // 1. Standard scrollIntoView
              elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // 2. Backup method with setTimeout to ensure rendering completes
              setTimeout(() => {
                // Get position and scroll container
                const rect = elements[0].getBoundingClientRect();
                const scrollingElement = document.scrollingElement || document.documentElement;
                
                // Calculate desired scroll position
                const targetY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
                
                // Smooth scroll
                scrollingElement.scrollTo({
                  top: targetY,
                  behavior: 'smooth'
                });
                
                console.log(`CommentObserver: Scrolled to comment ${commentId}`);
              }, 50);
            } catch (err) {
              console.error('Error during scroll to comment:', err);
            }
          }, 100); // Small delay to ensure DOM is ready
        }
        
        // Remove the highlight after 3 seconds
        setTimeout(() => {
          elements.forEach(el => {
            const element = el as HTMLElement;
            element.classList.remove('highlight-comment');
            // Reapply normal styling
            this.styleCommentElement(element);
          });
        }, 3000);
      } else {
        console.warn(`CommentObserver: No elements found for comment ID ${commentId} after trying fallbacks`);
      }
    } catch (err) {
      console.error(`Error highlighting comment ${commentId}:`, err);
    }
  }
}

// Create a singleton instance
export const commentObserver = new CommentObserver();