import { Editor } from "@tiptap/react";
import './types'; // Import the shared types

// Constants for our highlight classes
export const SEARCH_HIGHLIGHT_CLASS = "search-highlight-direct";
export const ACTIVE_HIGHLIGHT_CLASS = "active-search-highlight-direct";

/**
 * Ultra-aggressive search and highlight implementation that ensures
 * matches are highlighted correctly regardless of the editor's state
 * or styling context.
 *
 * This is based on the red box technique that works consistently.
 */
export function directSearch(
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

  console.log("🔍 DIRECT SEARCH: Beginning search process for:", searchTerm);

  // 1. First clean up any existing highlights
  clearAllHighlights();

  // 2. Inject our CSS styles into the document first with MAXIMUM VISIBILITY styles
  const styleEl = document.createElement("style");
  styleEl.id = "highlight-direct-styles";
  styleEl.innerHTML = `
    .${SEARCH_HIGHLIGHT_CLASS} {
      background-color: #FFFF00 !important;
      color: #000000 !important;
      display: inline !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 999 !important;
    }
    .${ACTIVE_HIGHLIGHT_CLASS} {
      background-color: #FFA500 !important;
      color: #000000 !important;
      display: inline !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 999 !important;
    }
    /* Force all span children to inherit properties */
    .${SEARCH_HIGHLIGHT_CLASS} *, .${ACTIVE_HIGHLIGHT_CLASS} * {
      background-color: inherit !important;
      color: inherit !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(styleEl);

  // 3. Find all places where our search term appears
  const allMatches: HTMLElement[] = [];
  let matchCount = 0;

  try {
    // Get all editor elements (for multi-page documents)
    const editorElements = document.querySelectorAll(".ProseMirror");

    if (!editorElements.length) {
      console.error("No editor elements found for search");
      return { matches: [], count: 0 };
    }

    // Create regex with correct flags
    let flags = "g";
    if (!options.matchCase) flags += "i";

    let pattern = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape regex special chars
    if (options.wholeWord) pattern = `\\b${pattern}\\b`;

    const regex = new RegExp(pattern, flags);

    // Process each editor element
    editorElements.forEach((editorElement) => {
      // Get all text nodes in this editor element
      const textNodes: Node[] = [];
      const walker = document.createTreeWalker(
        editorElement,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }

      // Process each text node to find matches
      textNodes.forEach((textNode) => {
        if (!textNode.textContent) return;

        const text = textNode.textContent;
        let match;
        regex.lastIndex = 0; // Reset regex state

        const matches: { start: number; end: number; text: string }[] = [];

        // Find all matches in this text node
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });
          matchCount++;
        }

        // If we found matches, process this text node
        if (matches.length > 0) {
          // Process matches in reverse order to avoid offset issues
          matches.sort((a, b) => b.start - a.start);

          // We need to track the current text node as we split it
          let currentNode = textNode as Text;

          // Process each match
          for (const match of matches) {
            try {
              // We need to make sure we're still within bounds
              if (
                !currentNode.textContent ||
                match.start >= currentNode.textContent.length
              ) {
                continue;
              }

              // Split at end first
              const afterMatchNode = currentNode.splitText(
                Math.min(match.end, currentNode.textContent.length),
              );

              // Then split at start to isolate the match
              const matchTextNode = currentNode.splitText(
                Math.min(match.start, currentNode.textContent.length),
              );

              // Create highlight span
              const span = document.createElement("span");
              span.className = SEARCH_HIGHLIGHT_CLASS;
              span.setAttribute("data-search-match", "true");
              span.textContent = matchTextNode.textContent;

              // Apply direct inline styling for the highlight - with MAXIMUM VISIBILITY
              span.style.cssText = `
                background-color: #FFFF00 !important;
                color: #000000 !important;
                border-radius: 2px !important;
                padding: 1px 0 !important;
                margin: 0 1px !important;
                border-bottom: 2px solid #FFB700 !important;
                box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-width: 2px !important;
                min-height: 1em !important;
                position: relative !important;
                z-index: 999 !important;
              `;

              console.log("matchTextNode.parentNode", matchTextNode.parentNode);
              console.log("span", span);
              console.log("allMatches", allMatches);

              // Replace the match text node with our span
              if (matchTextNode.parentNode) {
                matchTextNode.parentNode.replaceChild(span, matchTextNode);
                allMatches.push(span);
              }
              console.log("allMatches", allMatches);

              console.log("matchTextNode.parentNode", matchTextNode);

              console.log("afterMatchNode", afterMatchNode);
              console.log("currentNode", currentNode);

              // Continue with the remaining text
              currentNode = afterMatchNode;

              console.log("currentNode", currentNode);
            } catch (err) {
              console.error("Error highlighting match:", err);
            }
          }
        }
      });
    });

    console.log(`✅ DIRECT SEARCH: Found ${matchCount} matches`);

    // Make sure the editor knows about our changes
    editor.commands.focus();

    return {
      matches: allMatches,
      count: matchCount,
    };
  } catch (error) {
    console.error("Error in direct search:", error);
    return { matches: [], count: 0 };
  }
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
    // Reset all matches to regular highlight style with MAXIMUM VISIBILITY
    allMatches.forEach((span) => {
      span.className = SEARCH_HIGHLIGHT_CLASS;
      span.style.cssText = `
        background-color: #FFFF00 !important;
        color: #000000 !important;
        display: inline !important;
        visibility: visible !important;
        opacity: 1 !important;
      `;
    });

    // Get the target match
    const targetMatch = allMatches[matchIndex];

    // Add active class and apply active styling with MAXIMUM VISIBILITY
    targetMatch.className = ACTIVE_HIGHLIGHT_CLASS;
    targetMatch.style.cssText = `
      background-color: #FFA500 !important;
      color: #000000 !important;
      position: relative !important;
      z-index: 999 !important;
    `;

    // Scroll to the match
    targetMatch.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    console.log("targetMatch", targetMatch);

    return targetMatch;
  } catch (error) {
    console.error("Error activating match:", error);
    return null;
  }
}

/**
 * Replaces the currently active match with new text
 */
export function replaceActiveMatch(
  editor: Editor,
  replacementText: string,
): boolean {
  try {
    // Find the active match
    const activeMatch = document.querySelector(
      `.${ACTIVE_HIGHLIGHT_CLASS}`,
    ) as HTMLElement;

    if (!activeMatch) {
      console.error("No active match found for replacement");
      return false;
    }

    // Get parent to ensure we can replace properly
    const parent = activeMatch.parentNode;
    if (!parent) {
      console.error("No parent node found for active match");
      return false;
    }

    // Create text node with replacement
    const textNode = document.createTextNode(replacementText);

    // Replace active match with new text
    parent.replaceChild(textNode, activeMatch);

    console.log("activeMatch", activeMatch);
    // Make sure the editor updates (force sync with DOM)
    editor.commands.focus();

    // Force DOM event to ensure editor updates internal state
    const domEvent = new Event("input", { bubbles: true });
    editor.view.dom.dispatchEvent(domEvent);

    // Record history if available
    if (window.historyManager) {
      window.historyManager.addHistoryStep("search-replace");
    }

    return true;
  } catch (error) {
    console.error("Error replacing active match:", error);
    return false;
  }
}

/**
 * Replaces all matches with new text
 */
export function replaceAllMatches(
  editor: Editor,
  replacementText: string,
): number {
  try {
    // Find all highlight spans
    const highlightSpans = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`,
    );

    if (!highlightSpans.length) {
      console.error("No matches found for replace all");
      return 0;
    }

    // Collect spans to avoid DOM modification issues
    const spansToReplace: { span: Element; parent: Node }[] = [];
    highlightSpans.forEach((span) => {
      if (span.parentNode) {
        spansToReplace.push({ span, parent: span.parentNode });
      }
    });

    // Replace each span with new text
    spansToReplace.forEach(({ span, parent }) => {
      const textNode = document.createTextNode(replacementText);
      parent.replaceChild(textNode, span);
    });

    // Make sure the editor updates
    editor.commands.focus();

    // Force DOM event to ensure editor updates internal state
    const domEvent = new Event("input", { bubbles: true });
    editor.view.dom.dispatchEvent(domEvent);

    // Record history if available
    if (window.historyManager) {
      window.historyManager.addHistoryStep("search-replace-all");
    }

    return spansToReplace.length;
  } catch (error) {
    console.error("Error in replaceAllMatches:", error);
    return 0;
  }
}

/**
 * Clear all search highlights
 */
export function clearAllHighlights(): void {
  try {
    // Find all highlighted spans
    const highlightSpans = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`,
    );

    // Replace each with its text content
    highlightSpans.forEach((span) => {
      const textNode = document.createTextNode(span.textContent || "");
      if (span.parentNode) {
        span.parentNode.replaceChild(textNode, span);
      }
    });

    // Remove the style element if it exists
    const styleElement = document.getElementById("highlight-direct-styles");
    if (styleElement) {
      styleElement.remove();
    }
  } catch (error) {
    console.error("Error clearing highlights:", error);
  }
}
