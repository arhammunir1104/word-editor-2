import { Editor } from "@tiptap/react";
import './types'; // Import the shared types

// Constants for our highlight classes
export const SEARCH_HIGHLIGHT_CLASS = "search-highlight-simple";
export const ACTIVE_HIGHLIGHT_CLASS = "active-search-highlight-simple";

/**
 * SUPER SIMPLE search implementation with hard-coded overlays
 * This is the brutal emergency solution that WILL work.
 */
export function simpleSearch(
  editor: Editor,
  searchTerm: string,
  options: {
    matchCase?: boolean;
    wholeWord?: boolean;
  } = {},
): {
  matches: HTMLElement[];
  count: number;
} {
  if (!editor || !searchTerm) {
    return { matches: [], count: 0 };
  }

  console.log("🔍 SIMPLE SEARCH: Beginning search process for:", searchTerm);

  // 1. First clean up any existing highlights
  clearAllHighlights();

  // 2. Find all places where our search term appears
  const allMatches: HTMLElement[] = [];
  let matchCount = 0;

  try {
    // Get ALL editor elements (for multi-page search)
    const editorElements = document.querySelectorAll(".ProseMirror");

    if (!editorElements || editorElements.length === 0) {
      console.error("No editor elements found for search");
      return { matches: [], count: 0 };
    }
    
    console.log(`Found ${editorElements.length} editor instances for multi-page search`);

    // Create regex with correct flags
    let flags = "g";
    if (!options.matchCase) flags += "i";

    let pattern = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape regex special chars
    if (options.wholeWord) pattern = `\\b${pattern}\\b`;

    const regex = new RegExp(pattern, flags);

    // We'll process each editor instance separately
    const allOverlayContainers: HTMLElement[] = [];
    const allTextMatches: { index: number; text: string; editorIndex: number }[] = [];
    
    // Process each editor on the page (multi-page support)
    editorElements.forEach((editorElement, editorIndex) => {
      try {
        // Get content for this specific editor instance
        const content = editorElement.textContent || "";
        
        // Reset regex since we're reusing it
        regex.lastIndex = 0;
        
        // Find all matches in this editor instance
        let match;
        while ((match = regex.exec(content)) !== null) {
          allTextMatches.push({
            index: match.index,
            text: match[0],
            editorIndex
          });
          matchCount++;
        }
        
        // Create an overlay container for this editor
        const overlayContainer = document.createElement("div");
        overlayContainer.id = `search-overlay-container-${editorIndex}`;
        overlayContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 999;
        `;
        
        // Store for later use
        allOverlayContainers.push(overlayContainer);
        
        // Attach this overlay to the editor
        editorElement.parentNode?.appendChild(overlayContainer);
      } catch (editorError) {
        console.error(`Error processing editor ${editorIndex}:`, editorError);
      }
    });
    
    console.log(`Found ${matchCount} total matches across ${editorElements.length} pages:`, allTextMatches);

    // Process each match by creating overlay elements
    // This is a multi-page implementation 
    allTextMatches.forEach((match, index) => {
      try {
        // Get the specific editor element and overlay container for this match
        const editorElement = editorElements[match.editorIndex] as HTMLElement;
        const overlayContainer = allOverlayContainers[match.editorIndex];
        
        if (!editorElement || !overlayContainer) {
          console.error(`Missing editor or overlay container for match ${index}`);
          return;
        }
        
        // Create highlight element
        const highlight = document.createElement("div");
        highlight.className = SEARCH_HIGHLIGHT_CLASS;
        highlight.setAttribute("data-match-index", String(index));
        highlight.setAttribute("data-editor-index", String(match.editorIndex));
        highlight.textContent = match.text;

        // We'll position these as rough approximations
        const range = document.createRange();
        const textNodes = getAllTextNodes(editorElement);
        let currentIndex = 0;
        let targetNode: Node | null = null;
        let offset = 0;
        
        // Find the target node containing this match
        for (const node of textNodes) {
          const text = node.textContent || "";
          const nodeLength = text.length;

          if (
            match.index >= currentIndex &&
            match.index < currentIndex + nodeLength
          ) {
            targetNode = node;
            offset = match.index - currentIndex;
            break;
          }

          currentIndex += nodeLength;
        }
        
        // Get computed style for visual consistency
        const nodeParent = targetNode?.parentNode as Element || document.body;
        const computedStyle = window.getComputedStyle(nodeParent);
        
        // Setup highlight styling
        highlight.style.cssText = `
          position: absolute;
          background-color: yellow !important;
          color: ${computedStyle.color} !important;
          font-family: ${computedStyle.fontFamily} !important;
          font-size: ${computedStyle.fontSize} !important;
          font-weight: ${computedStyle.fontWeight} !important;
          font-style: ${computedStyle.fontStyle} !important;
          line-height: ${computedStyle.lineHeight} !important;
          z-index: 1000 !important;
          opacity: 0.8 !important;
          pointer-events: auto !important;
          user-select: none !important;
        `;

        // Position the highlight if we found the target node
        if (targetNode) {
          try {
            range.setStart(targetNode, offset);
            range.setEnd(
              targetNode,
              Math.min(
                offset + match.text.length,
                targetNode.textContent?.length || 0,
              ),
            );

            const rect = range.getBoundingClientRect();
            const editorRect = editorElement.getBoundingClientRect();

            // Position the highlight
            highlight.style.left = `${rect.left - editorRect.left}px`;
            highlight.style.top = `${rect.top - editorRect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;

            // Add to the appropriate overlay container
            overlayContainer.appendChild(highlight);
            allMatches.push(highlight);

            // Force browser to recognize the element
            highlight.style.display = "inline";
            void highlight.offsetWidth; // Force reflow
            highlight.style.opacity = "1";

            console.log(
              `Added highlight for match '${match.text}' at page ${match.editorIndex + 1}, position ${match.index}`,
            );
          } catch (err) {
            console.error("Error positioning highlight:", err);
          }
        }
      } catch (err) {
        console.error("Error creating highlight:", err);
      }
    });

    console.log(`✅ SIMPLE SEARCH: Found ${matchCount} matches`);

    return {
      matches: allMatches,
      count: matchCount,
    };
  } catch (error) {
    console.error("Error in simple search:", error);
    return { matches: [], count: 0 };
  }
}

// Helper function to get all text nodes
function getAllTextNodes(element: Element): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  return textNodes;
}

/**
 * Activates a specific match by index
 */
export function activateMatch(
  matchIndex: number,
  allMatches: HTMLElement[],
): HTMLElement | null {
  if (!allMatches.length || matchIndex < 0 || matchIndex >= allMatches.length) {
    return null;
  }

  try {
    // Reset all matches to have yellow background
    allMatches.forEach((el) => {
      el.className = SEARCH_HIGHLIGHT_CLASS;
      el.style.backgroundColor = "yellow";
      // Keep all text styling intact
    });

    // Get the target match
    const targetMatch = allMatches[matchIndex];

    // Add active class and apply active styling - only change background
    targetMatch.className = ACTIVE_HIGHLIGHT_CLASS;
    targetMatch.style.backgroundColor = "orange";

    // Scroll to the match
    targetMatch.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return targetMatch;
  } catch (error) {
    console.error("Error activating match:", error);
    return null;
  }
}

/**
 * Replaces the currently active match with new text using a direct and reliable approach
 * Supports multi-page documents
 */
export function replaceActiveMatch(
  editor: Editor,
  replacementText: string,
): boolean {
  try {
    console.log("START replaceActiveMatch with text:", replacementText);
    
    // Find the active match
    const activeMatch = document.querySelector(
      `.${ACTIVE_HIGHLIGHT_CLASS}`,
    ) as HTMLElement;

    if (!activeMatch) {
      console.error("No active match found");
      return false;
    }

    // Get the original text from the match
    const originalText = activeMatch.textContent || "";
    console.log("Original text to replace:", originalText);
    
    // Get the editor index from the data attribute (for multi-page support)
    const editorIndex = activeMatch.getAttribute("data-editor-index");
    console.log(`Active match is in editor instance ${editorIndex}`);
    
    // Find all editor instances for multi-page support
    const editorElements = document.querySelectorAll(".ProseMirror");
    
    // Store the current selection to restore it later if needed
    const currentSelection = editor.state.selection;
    
    // Add a history step before replacing (for undo/redo functionality)
    if (window.historyManager) {
      window.historyManager.addHistoryStep("replace-match");
    }
    
    // APPROACH 1: Direct DOM manipulation with multi-page support
    try {
      // Get the position of the match in the editor
      const rect = activeMatch.getBoundingClientRect();
      
      // Get match position details
      const matchPos = {
        left: rect.left, 
        top: rect.top,
        text: originalText,
        editorIndex
      };
      console.log("Match position:", matchPos);
      
      // Get the editor element for this match
      const targetEditorElement = editorIndex && !isNaN(parseInt(editorIndex))
        ? editorElements[parseInt(editorIndex)] as HTMLElement
        : document.querySelector(".ProseMirror") as HTMLElement;
      
      if (!targetEditorElement) {
        console.error("Could not find target editor element");
        return false;
      }
      
      // First find all text nodes that might contain our text
      const allTextNodes = getAllTextNodes(targetEditorElement);
      
      // For each text node, check if it contains our text and is in the same position
      for (const node of allTextNodes) {
        const nodeText = node.textContent || "";
        if (nodeText.includes(originalText)) {
          // Create a range to check position
          const range = document.createRange();
          range.selectNode(node);
          const nodeRect = range.getBoundingClientRect();
          
          // Check if the node is at similar position to our match
          const isNearMatch = Math.abs(nodeRect.top - rect.top) < 30 && 
                              Math.abs(nodeRect.left - rect.left) < 100;
                              
          if (isNearMatch) {
            console.log("Found matching text node near highlight position");
            
            // Get the starting position of this text node
            const nodePos = getNodePosition(targetEditorElement, node);
            
            // Find the exact position of the text within the node
            const textIndex = nodeText.indexOf(originalText);
            if (textIndex >= 0) {
              // Calculate the exact position
              const from = nodePos + textIndex;
              const to = from + originalText.length;
              
              console.log(`Setting selection from ${from} to ${to}`);
              
              // Make sure we're using the editor for the correct page
              // If this is a multi-page document
              if (editorIndex && !isNaN(parseInt(editorIndex))) {
                // Try to get the editor for this specific page
                // First, ensure the page is visible
                targetEditorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Focus this editor instance
                targetEditorElement.focus();
                
                // Small delay to ensure the editor is focused
                setTimeout(() => {
                  // Set selection directly in DOM
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    
                    try {
                      const range = document.createRange();
                      range.setStart(node, textIndex);
                      range.setEnd(node, textIndex + originalText.length);
                      selection.addRange(range);
                      
                      // Execute the replacement
                      document.execCommand('insertText', false, replacementText);
                      console.log("Replaced content using execCommand");
                    } catch (err) {
                      console.error("Error setting range:", err);
                    }
                  }
                  
                  // Clean up highlights
                  clearAllHighlights();
                }, 50);
                
                return true;
              } else {
                // Standard approach for single-page documents
                // Set selection and replace
                editor.commands.setTextSelection({ from, to });
                
                // Force editor to focus
                editor.commands.focus();
                
                // Small delay to ensure selection is set
                setTimeout(() => {
                  editor.commands.insertContent(replacementText);
                  console.log("Replaced content directly");
                }, 10);
                
                // Clean up highlights
                clearAllHighlights();
                return true;
              }
            }
          }
        }
      }
    } catch (directError) {
      console.error("Direct DOM approach failed:", directError);
    }
    
    // APPROACH 2: Use document.execCommand for direct replacement
    try {
      console.log("Trying execCommand approach");
      
      // Find the text in the document
      const content = editor.getText();
      const contentIndex = content.indexOf(originalText);
      
      if (contentIndex >= 0) {
        // Manually set selection and use execCommand
        editor.commands.setTextSelection({
          from: contentIndex,
          to: contentIndex + originalText.length
        });
        
        // Focus the editor
        editor.commands.focus();
        
        // Delete the selected content and insert new content
        editor.commands.deleteSelection();
        editor.commands.insertContent(replacementText);
        
        console.log("Replaced using selection approach");
        
        // Clean up highlights
        clearAllHighlights();
        return true;
      }
    } catch (execError) {
      console.error("execCommand approach failed:", execError);
    }
    
    // APPROACH 3: Brute force text replacement
    try {
      console.log("Trying brute force text replacement");
      
      // Get the current content
      const content = editor.getHTML();
      
      // Create a safe search pattern
      const safeSearchPattern = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace the text in the HTML
      const newContent = content.replace(
        new RegExp(safeSearchPattern, 'g'), 
        replacementText
      );
      
      // Set the content if it changed
      if (newContent !== content) {
        editor.commands.setContent(newContent);
        console.log("Replaced using HTML content approach");
        
        // Clean up highlights
        clearAllHighlights();
        return true;
      }
    } catch (bruteError) {
      console.error("Brute force approach failed:", bruteError);
    }

    // If all approaches failed, try to restore the original selection
    try {
      editor.commands.setTextSelection(currentSelection);
    } catch (e) {
      // Ignore restoration errors
    }
    
    console.error("All replacement approaches failed");
    return false;
  } catch (error) {
    console.error("Error in replaceActiveMatch:", error);
    return false;
  }
}

// Helper function to get position of a node within editor
function getNodePosition(editorElement: HTMLElement, node: Node): number {
  const allNodes = getAllTextNodes(editorElement);
  let position = 0;
  
  for (const textNode of allNodes) {
    if (textNode === node) {
      return position;
    }
    position += textNode.textContent?.length || 0;
  }
  
  return 0;
}

// Helper to find text node at a position
function findTextNodeAtPosition(element: HTMLElement, xPos: number) {
  const textNodes = getAllTextNodes(element);
  let currentPos = 0;

  for (const node of textNodes) {
    const range = document.createRange();
    range.selectNode(node);
    const rect = range.getBoundingClientRect();

    if (xPos >= rect.left && xPos <= rect.right) {
      return {
        node,
        pos: currentPos,
      };
    }

    currentPos += node.length;
  }

  return null;
}

/**
 * Replaces all matches with new text using the most reliable approaches
 */
export function replaceAllMatches(
  editor: Editor,
  replacementText: string,
): number {
  try {
    console.log("START replaceAllMatches with text:", replacementText);
    
    // Get all highlights across all pages
    const highlights = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`,
    );

    if (!highlights.length) {
      console.log("No highlights found for replace all");
      return 0;
    }

    // Add a history step for undo/redo functionality
    if (window.historyManager) {
      window.historyManager.addHistoryStep("replace-all-matches");
    }

    // Get all editor instances for multi-page support
    const editorElements = document.querySelectorAll(".ProseMirror");
    console.log(`Found ${editorElements.length} editor instances for multi-page replace all`);

    // Get the search term from any highlight
    const searchTerm = highlights[0].textContent || "";
    console.log("Original text to replace:", searchTerm);
    
    // Store the total number of matches
    const totalMatches = highlights.length;
    console.log(`Found ${totalMatches} matches to replace across all pages`);
    
    // === MOST RELIABLE APPROACH FIRST: Direct HTML replacement ===
    try {
      console.log("APPROACH 0: Direct HTML replacement");
      
      // Force editor focus
      editor.commands.focus();
      
      // Store editor's current HTML content
      const html = editor.getHTML();
      
      // Create safe search pattern with escaping special characters
      const safePattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Perform direct global replacement in HTML
      const newHtml = html.replace(new RegExp(safePattern, 'g'), replacementText);
      
      // Only update if content actually changed
      if (newHtml !== html) {
        console.log("Content changed, applying new HTML");
        
        // Set the editor content with the replaced text
        editor.commands.setContent(newHtml, false);
        
        // Clean up highlights
        clearAllHighlights();
        
        console.log("HTML replacement complete");
        return totalMatches;
      } else {
        console.log("No changes detected in HTML replacement");
      }
    } catch (htmlError) {
      console.error("HTML replacement failed:", htmlError);
    }
    
    // === APPROACH 1: Plain text replacement ===
    try {
      console.log("APPROACH 1: Plain text replacement");
      
      // Get the editor's current text content
      const content = editor.getText();
      
      // Create a safe pattern that escapes special regex characters
      const safePattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create regex with global flag to replace all occurrences
      const regex = new RegExp(safePattern, 'g');
      
      // Create the new content with replacements
      const newContent = content.replace(regex, replacementText);
      
      // Only update if the content actually changed
      if (newContent !== content) {
        console.log("Content changed, applying new text");
        
        // Set the new content
        editor.commands.setContent(newContent);
        
        // Clean up highlights
        clearAllHighlights();
        
        console.log("Text replacement complete");
        return totalMatches;
      } else {
        console.log("No changes detected in text replacement");
      }
    } catch (textError) {
      console.error("Text replacement failed:", textError);
    }
    
    // === APPROACH 2: One-by-one selection and replacement ===
    try {
      console.log("APPROACH 2: One-by-one replacement");
      
      let replacedCount = 0;
      
      // Get all original text occurrences
      const originalText = searchTerm;
      const content = editor.getText();
      
      // Find all indices of the search term in the content
      const indices: number[] = [];
      let startIndex = 0;
      let index;
      
      // Create a regex to find all occurrences
      const regex = new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      // Find all match indices
      while ((index = content.indexOf(originalText, startIndex)) !== -1) {
        indices.push(index);
        startIndex = index + originalText.length;
      }
      
      console.log(`Found ${indices.length} occurrences at indices:`, indices);
      
      // Replace each occurrence one by one, starting from the end
      // to avoid changing the positions of the other occurrences
      for (let i = indices.length - 1; i >= 0; i--) {
        const from = indices[i];
        const to = from + originalText.length;
        
        // Set selection to the occurrence
        editor.commands.setTextSelection({ from, to });
        
        // Replace with new text
        editor.commands.insertContent(replacementText);
        
        replacedCount++;
      }
      
      if (replacedCount > 0) {
        // Clean up highlights
        clearAllHighlights();
        
        console.log(`Replaced ${replacedCount} occurrences one by one`);
        return replacedCount;
      }
    } catch (oneByOneError) {
      console.error("One-by-one replacement failed:", oneByOneError);
    }
    
    // === APPROACH 3: Brute force transaction method ===
    try {
      console.log("APPROACH 3: Brute force transaction method");
      
      // Store the original search term
      const originalText = searchTerm;
      
      // Create transaction to ensure the replace happens atomically
      editor.view.dispatch(
        editor.view.state.tr.insertText(
          replacementText, 
          editor.state.selection.from, 
          editor.state.selection.to
        )
      );
      
      // Clear all highlights
      clearAllHighlights();
      
      console.log("Brute force transaction complete");
      return 1; // At least one replacement
    } catch (transactionError) {
      console.error("Transaction replacement failed:", transactionError);
    }

    // If we get here, all approaches failed
    console.error("All replacement approaches failed");
    
    // As a last resort, try to use execCommand directly (old but reliable)
    try {
      document.execCommand('selectAll', false);
      document.execCommand('insertText', false, editor.getText().replace(searchTerm, replacementText));
      console.log("Used execCommand as last resort");
      return totalMatches;
    } catch (execError) {
      console.error("execCommand failed:", execError);
    }
    
    // Clean up highlights in any case
    clearAllHighlights();
    
    return 0;
  } catch (error) {
    console.error("Error in replaceAllMatches:", error);
    
    // Clean up highlights even in error case
    try {
      clearAllHighlights();
    } catch (e) { /* ignore */ }
    
    return 0;
  }
}

/**
 * Clear all search highlights across all pages
 */
export function clearAllHighlights(): void {
  try {
    // 1. Remove all overlay containers (multi-page support)
    const allOverlayContainers = document.querySelectorAll("[id^='search-overlay-container']");
    
    console.log(`Clearing ${allOverlayContainers.length} overlay containers for multi-page search`);
    
    // Remove each container
    allOverlayContainers.forEach(container => {
      container.remove();
    });

    // 2. Remove any individual highlights from both simple and direct approaches
    const simpleHighlights = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`
    );
    
    // Get direct highlight class names too (from direct search implementation)
    const directHighlightClass = "search-highlight-direct";
    const activeDirectHighlightClass = "active-search-highlight-direct";
    
    const directHighlights = document.querySelectorAll(
      `.${directHighlightClass}, .${activeDirectHighlightClass}`
    );
    
    // Remove all simple highlights
    simpleHighlights.forEach((el) => el.remove());
    
    // Remove all direct highlights
    directHighlights.forEach((el) => el.remove());
    
    // 3. Remove any style elements we might have added
    const styleElement = document.getElementById("highlight-direct-styles");
    if (styleElement) {
      styleElement.remove();
    }
    
    // 4. Check for any stray elements with data-search-match attribute
    const searchMatches = document.querySelectorAll("[data-search-match='true']");
    searchMatches.forEach((el) => el.remove());
    
    console.log("All search highlights cleared");
  } catch (error) {
    console.error("Error clearing highlights:", error);
  }
}
