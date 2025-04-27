import { Editor } from "@tiptap/react";

// Constants for our highlight classes
export const SEARCH_HIGHLIGHT_CLASS = "search-highlight-brutal";
export const ACTIVE_HIGHLIGHT_CLASS = "active-search-highlight-brutal";

/**
 * Brutally aggressive search & highlight logic that works reliably
 */
export function nuclearSearch(
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

  clearAllHighlights();
  injectHighlightStyles();

  const allMatches: HTMLElement[] = [];
  let matchCount = 0;

  try {
    const editorElements = document.querySelectorAll(".ProseMirror");
    if (!editorElements.length) return { matches: [], count: 0 };

    let flags = "g";
    if (!options.matchCase) flags += "i";

    let pattern = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    if (options.wholeWord) pattern = `\\b${pattern}\\b`;

    const regex = new RegExp(pattern, flags);

    editorElements.forEach((editorElement) => {
      const walker = document.createTreeWalker(
        editorElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const el = node.parentElement;
            if (!el) return NodeFilter.FILTER_SKIP;
            if (
              el.classList.contains(SEARCH_HIGHLIGHT_CLASS) ||
              el.classList.contains(ACTIVE_HIGHLIGHT_CLASS)
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      const textNodesToProcess: {
        node: Text;
        matches: { start: number; end: number; text: string }[];
      }[] = [];

      let textNode = walker.nextNode() as Text;
      while (textNode) {
        const matches: { start: number; end: number; text: string }[] = [];
        const text = textNode.textContent ?? "";

        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });
          matchCount++;
        }

        if (matches.length > 0) {
          textNodesToProcess.push({ node: textNode, matches });
        }

        textNode = walker.nextNode() as Text;
      }

      for (let i = textNodesToProcess.length - 1; i >= 0; i--) {
        const { node: originalNode, matches } = textNodesToProcess[i];
        matches.sort((a, b) => b.start - a.start);

        let currentNode = originalNode;

        for (const match of matches) {
          try {
            const currentText = currentNode.textContent ?? "";
            if (match.start > currentText.length) continue;

            const afterNode = currentNode.splitText(
              Math.min(match.end, currentText.length),
            );
            const matchNode = currentNode.splitText(
              Math.min(match.start, currentNode.textContent?.length || 0),
            );

            const highlight = document.createElement("span");
            highlight.className = SEARCH_HIGHLIGHT_CLASS;
            highlight.setAttribute("data-nuclear-search", "true");
            highlight.textContent = matchNode.textContent;

            highlight.style.cssText = `
              background-color: #FFFF00 !important;
              color: yellow !important;
              border-radius: 2px !important;
              padding: 1px 0 !important;
              margin: 0 1px !important;
              border-bottom: 2px solid #FFB700 !important;
              box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
            `;

            if (matchNode.parentNode) {
              matchNode.parentNode.replaceChild(highlight, matchNode);
              allMatches.push(highlight); // ✅ Now pushing matched elements
            }

            currentNode = afterNode;
          } catch (err) {
            console.error("Error highlighting match:", err);
          }
        }
      }
    });

    editor.commands.focus();

    return {
      matches: allMatches,
      count: matchCount,
    };
  } catch (error) {
    console.error("Error in nuclearSearch:", error);
    return { matches: [], count: 0 };
  }
}

export function activateMatch(
  matchIndex: number,
  allMatches: HTMLElement[],
): HTMLElement | null {
  if (!allMatches.length || matchIndex < 0 || matchIndex >= allMatches.length) {
    return null;
  }

  try {
    allMatches.forEach((span) => {
      span.className = SEARCH_HIGHLIGHT_CLASS;
      span.style.cssText = `
        background-color: #FFFF00 !important;
        color: #000 !important;
        border-radius: 2px !important;
        padding: 1px 0 !important;
        margin: 0 1px !important;
        border-bottom: 2px solid #FFB700 !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
      `;
    });

    const target = allMatches[matchIndex];
    if (!target) return null;

    target.className = ACTIVE_HIGHLIGHT_CLASS;
    target.style.cssText = `
      background-color: #FFA500 !important;
      color: #000 !important;
      border-radius: 2px !important;
      padding: 1px 0 !important;
      margin: 0 1px !important;
      border-bottom: 2px solid #FF7800 !important;
      box-shadow: 0 0 3px 1px rgba(255, 165, 0, 0.7) !important;
      font-weight: bold !important;
    `;

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    return target;
  } catch (error) {
    console.error("Error activating match:", error);
    return null;
  }
}

export function replaceActiveMatch(
  editor: Editor,
  replacementText: string,
): boolean {
  try {
    const activeMatch = document.querySelector(
      `.${ACTIVE_HIGHLIGHT_CLASS}`,
    ) as HTMLElement;

    if (!activeMatch || !activeMatch.parentNode) return false;

    const replacement = document.createTextNode(replacementText);
    activeMatch.parentNode.replaceChild(replacement, activeMatch);

    editor.commands.focus();
    const event = new Event("input", { bubbles: true });
    editor.view.dom.dispatchEvent(event);

    (window as any).historyManager?.addHistoryStep?.("search-replace");

    return true;
  } catch (error) {
    console.error("Error replacing active match:", error);
    return false;
  }
}

export function replaceAllMatches(
  editor: Editor,
  replacementText: string,
): number {
  try {
    const highlightSpans = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`,
    );

    const toReplace: { span: Element; parent: Node }[] = [];

    highlightSpans.forEach((span) => {
      if (span.parentNode) {
        toReplace.push({ span, parent: span.parentNode });
      }
    });

    toReplace.forEach(({ span, parent }) => {
      const textNode = document.createTextNode(replacementText);
      parent.replaceChild(textNode, span);
    });

    editor.commands.focus();
    const event = new Event("input", { bubbles: true });
    editor.view.dom.dispatchEvent(event);

    (window as any).historyManager?.addHistoryStep?.("search-replace-all");

    return toReplace.length;
  } catch (error) {
    console.error("Error replacing all matches:", error);
    return 0;
  }
}

export function clearAllHighlights(): void {
  try {
    const highlights = document.querySelectorAll(
      `.${SEARCH_HIGHLIGHT_CLASS}, .${ACTIVE_HIGHLIGHT_CLASS}`,
    );

    highlights.forEach((span) => {
      const textNode = document.createTextNode(span.textContent ?? "");
      span.parentNode?.replaceChild(textNode, span);
    });

    const styleEl = document.getElementById("nuclear-search-highlights-style");
    styleEl?.remove();

    document.body.classList.remove("search-highlighting-active");
  } catch (error) {
    console.error("Error clearing highlights:", error);
  }
}

function injectHighlightStyles(): void {
  try {
    const existing = document.getElementById("nuclear-search-highlights-style");
    existing?.remove();

    const style = document.createElement("style");
    style.id = "nuclear-search-highlights-style";
    style.textContent = `
      .${SEARCH_HIGHLIGHT_CLASS} {
        background-color: #FFFF00 !important;
        color: #000000 !important;
        border-radius: 2px !important;
        padding: 1px 0 !important;
        margin: 0 1px !important;
        border-bottom: 2px solid #FFB700 !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
        display: inline !important;
      }

      .${ACTIVE_HIGHLIGHT_CLASS} {
        background-color: #FFA500 !important;
        color: #000000 !important;
        border-radius: 2px !important;
        padding: 1px 0 !important;
        margin: 0 1px !important;
        border-bottom: 2px solid #FF7800 !important;
        box-shadow: 0 0 3px 1px rgba(255, 165, 0, 0.7) !important;
        font-weight: bold !important;
        display: inline !important;
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add("search-highlighting-active");
  } catch (error) {
    console.error("Error injecting styles:", error);
  }
}
