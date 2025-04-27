import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { useToast } from "../../hooks/use-toast";

// Import our brute force replacement implementation
import { forceReplace, forceReplaceAll } from "./force-replace";
import { directReplaceAll } from "./direct-replace-all";
import { bruteForceReplaceAll } from "./brute-replace";
import { fixedReplaceAll } from "./replace-all-fix";
import { ultraSimpleReplaceAll } from "./simple-replace-all";

// Import both our search implementations - first the overlay version we'll use
import {
  simpleSearch,
  activateMatch as simpleActivateMatch,
  replaceActiveMatch as simpleReplaceActiveMatch,
  replaceAllMatches as simpleReplaceAllMatches,
  clearAllHighlights as simpleClearAllHighlights,
  SEARCH_HIGHLIGHT_CLASS as SIMPLE_HIGHLIGHT_CLASS,
  ACTIVE_HIGHLIGHT_CLASS as SIMPLE_ACTIVE_HIGHLIGHT_CLASS,
} from "./search-highlight-simple";

// Also keep the direct version as backup
import {
  directSearch,
  activateMatch,
  replaceActiveMatch,
  replaceAllMatches,
  clearAllHighlights,
  SEARCH_HIGHLIGHT_CLASS,
  ACTIVE_HIGHLIGHT_CLASS,
} from "./search-highlight-direct";

interface SearchModalProps {
  editor: Editor;
  onClose: () => void;
}
interface DOMMatch {
  element: Node;
  textNode: Text;
  startOffset: number;
  endOffset: number;
  text: string;
}

export default function SearchModal({ editor, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [activeMatchElements, setActiveMatchElements] = useState<DOMMatch[]>(
    [],
  );
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [matchArray, setMatchArray] = useState<HTMLElement[]>([]);
  
  // Initialize toast hook
  const { toast } = useToast();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchHighlightClass = "nuclear-search-highlight";
  const activeHighlightClass = "nuclear-search-highlight-active";

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Add styles for search highlights
    addHighlightStyles();

    // Cleanup on unmount using our nuclear implementation
    return () => {
      clearAllHighlights(); // Use our nuclear clear function
    };
  }, []);

  // Add CSS styles for search highlights using the most aggressive approach
  const addHighlightStyles = () => {
    // Remove existing styles if any
    removeHighlightStyles();

    // Create style element for highlighting with !important flags
    const style = document.createElement("style");
    style.id = "search-highlight-styles";
    style.textContent = `
      /* Super aggressive styling that will override any other styles */
      .${searchHighlightClass} {
        background-color: #FFFF00 !important;
        background-image: none !important;
        border-radius: 2px !important;
        padding: 1px 0 !important;
        margin: 0 1px !important;
        border-bottom: 2px solid #FFB700 !important;
        color: #000000 !important;
        display: inline !important;
        font-weight: inherit !important;
        font-style: inherit !important;
        text-decoration: inherit !important;
        position: relative !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
      }
      
      /* Even more pronounced styling for the active match */
      .${activeHighlightClass} {
        background-color: #FFA500 !important;
        background-image: none !important;
        border-radius: 2px !important;
        padding: 1px 0 !important;
        margin: 0 1px !important;
        border-bottom: 2px solid #FF7800 !important;
        color: #000000 !important;
        display: inline !important;
        font-weight: inherit !important;
        font-style: inherit !important;
        text-decoration: inherit !important;
        position: relative !important;
        box-shadow: 0 0 3px 1px rgba(255, 165, 0, 0.7) !important;
      }
      
      /* Force styles to apply to all child elements */
      .${searchHighlightClass} *, .${activeHighlightClass} * {
        background-color: inherit !important;
        color: inherit !important;
      }
    `;

    // Force the style to be at the end of the head to ensure it has priority
    document.head.appendChild(style);

    // Inject a marker class to the body to add a hook for our styles
    document.body.classList.add("search-highlighting-active");
  };

  // Remove highlight styles
  const removeHighlightStyles = () => {
    const existingStyle = document.getElementById("search-highlight-styles");
    if (existingStyle) {
      existingStyle.remove();
    }
  };

  // Clear all search highlights
  const clearHighlights = () => {
    try {
      // Find all the editor elements (for multiple pages)
      const editorElements = document.querySelectorAll(".ProseMirror");

      // Remove all highlight spans from each editor
      editorElements.forEach((editorElement) => {
        // Find all highlight spans
        const highlightSpans = editorElement.querySelectorAll(
          `.${searchHighlightClass}, .${activeHighlightClass}`,
        );

        // Replace each span with its text content
        highlightSpans.forEach((span) => {
          const textNode = document.createTextNode(span.textContent || "");
          if (span.parentNode) {
            span.parentNode.replaceChild(textNode, span);
          }
        });
      });

      // Reset match tracking
      setActiveMatchElements([]);
      setCurrentMatchIndex(-1);
    } catch (error) {
      console.error("Error clearing highlights:", error);
    }
  };

  // Use our ultra-aggressive direct search function
  const search = () => {
    if (!searchTerm) {
      // Clear both implementations
      clearAllHighlights();
      simpleClearAllHighlights();
      setMatches(0);
      setCurrentMatch(0);
      return;
    }

    console.log("🔍 SEARCH: Searching for", searchTerm);

    try {
      // First try the simple search method (overlay approach)
      const { matches, count } = simpleSearch(editor, searchTerm, {
        matchCase,
        wholeWord,
      });

      console.log(`Found ${count} matches using simple search`);

      // If simple search failed to find matches, fallback to direct search
      if (count === 0) {
        console.log("Simple search found no matches, trying direct search...");

        // Clear simple search highlights
        simpleClearAllHighlights();

        // Try direct search as fallback
        const directResult = directSearch(editor, searchTerm, {
          matchCase,
          wholeWord,
        });

        console.log(`Found ${directResult.count} matches using direct search`);

        // Update state with direct search results
        setMatches(directResult.count);
        setCurrentMatch(directResult.count > 0 ? 1 : 0);

        // Activate the first match if any
        if (directResult.count > 0 && directResult.matches.length > 0) {
          activateMatch(0, directResult.matches);
        }

        // Store the match elements in state
        setMatchArray(directResult.matches);
      } else {
        // Simple search worked, use those results
        setMatches(count);
        setCurrentMatch(count > 0 ? 1 : 0);

        // Activate the first match if any
        if (count > 0 && matches.length > 0) {
          simpleActivateMatch(0, matches);
        }

        // Store the match elements in state
        setMatchArray(matches);
      }
    } catch (error) {
      console.error("Error in search:", error);

      // If all else fails, try pure direct search
      try {
        // Use our imported directSearch function
        const { matches, count } = directSearch(editor, searchTerm, {
          matchCase,
          wholeWord,
        });

        console.log(`Found ${count} matches using direct search (fallback)`);

        // Update state
        setMatches(count);
        setCurrentMatch(count > 0 ? 1 : 0);

        // Activate the first match if any
        if (count > 0 && matches.length > 0) {
          activateMatch(0, matches);
        }

        // Store the match elements in state
        setMatchArray(matches);
      } catch (directError) {
        console.error("All search methods failed:", directError);
      }
    }
  };

  // Helper function to find matches in a DOM node and its children
  const findMatchesInNode = (
    node: Node,
    regex: RegExp,
    matches: DOMMatch[],
  ) => {
    // If this is a text node, search in its content
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const text = node.textContent;
      let match;

      // Reset regex
      regex.lastIndex = 0;

      // Find all matches in this text node
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          element: node.parentNode!,
          textNode: node as Text,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          text: match[0],
        });
      }
    }
    // If it's an element node, process its children
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip already highlighted nodes
      const element = node as HTMLElement;
      if (
        element.classList &&
        (element.classList.contains(searchHighlightClass) ||
          element.classList.contains(activeHighlightClass))
      ) {
        return;
      }

      // Process children
      Array.from(node.childNodes).forEach((child) => {
        findMatchesInNode(child, regex, matches);
      });
    }
  };

  // Highlight all matches
  const highlightAllMatches = (matches: DOMMatch[]) => {
    try {
      console.log(`Highlighting ${matches.length} matches`);

      // First clear any existing highlights to avoid issues
      clearHighlights();

      // Track processed nodes to avoid issues with text node splitting
      const processedNodes = new Set<Node>();

      // Process matches in reverse document order to avoid position shifts
      // Make a copy and sort to avoid modifying the original array
      [...matches]
        .sort((a, b) => {
          // Get node positions in the document
          const posA = getNodePosition(a.textNode);
          const posB = getNodePosition(b.textNode);
          // Sort in reverse order (bottom to top of document)
          return posB - posA;
        })
        .forEach((match) => {
          if (processedNodes.has(match.textNode)) {
            // Skip nodes we've already processed
            return;
          }

          try {
            // Get all matches for this text node
            const nodeMatches = matches.filter(
              (m) => m.textNode === match.textNode,
            );
            // Sort in reverse order (end to start within the text)
            nodeMatches.sort((a, b) => b.startOffset - a.startOffset);

            // Mark this node as processed
            processedNodes.add(match.textNode);

            // Process each match in the text node
            let currentNode = match.textNode;

            for (const nodeMatch of nodeMatches) {
              // Make sure we're using the current version of the text node
              // (it may have been split by previous operations)
              const nodeTextLength = currentNode.textContent
                ? currentNode.textContent.length
                : 0;
              if (nodeMatch.startOffset < nodeTextLength) {
                // Split text node at match end position
                const endSplit = currentNode.splitText(nodeMatch.endOffset);

                // Split again at match start position
                const matchTextNode = currentNode.splitText(
                  nodeMatch.startOffset,
                );

                // Create highlight span with aggressive styling
                const highlightSpan = document.createElement("span");
                highlightSpan.className = searchHighlightClass;
                highlightSpan.setAttribute("data-search-highlight", "true");
                highlightSpan.textContent = matchTextNode.textContent;

                // Apply direct inline styles in addition to the class
                highlightSpan.style.cssText = `
                  background-color: #FFFF00 !important;
                  color: #000000 !important;
                  display: inline !important;
                  padding: 1px 0 !important;
                  margin: 0 1px !important;
                  border-bottom: 2px solid #FFB700 !important;
                  border-radius: 2px !important;
                  box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
                `;

                // Replace text node with span
                if (matchTextNode.parentNode) {
                  matchTextNode.parentNode.replaceChild(
                    highlightSpan,
                    matchTextNode,
                  );
                }

                // Continue with the next portion of text
                currentNode = endSplit;
              }
            }
          } catch (error) {
            console.error("Error highlighting match:", error);
          }
        });

      console.log("Highlighting complete");
    } catch (error) {
      console.error("Error in highlightAllMatches:", error);
    }
  };

  // Helper function to get approximate node position in document
  const getNodePosition = (node: Node): number => {
    try {
      // Get all text nodes in the document
      const allTextNodes: Node[] = [];
      const editorElements = document.querySelectorAll(".ProseMirror");

      editorElements.forEach((editor) => {
        const walker = document.createTreeWalker(
          editor,
          NodeFilter.SHOW_TEXT,
          null,
        );

        let currentNode = walker.nextNode();
        while (currentNode) {
          allTextNodes.push(currentNode);
          currentNode = walker.nextNode();
        }
      });

      // Find position of our node
      return allTextNodes.indexOf(node);
    } catch (error) {
      console.error("Error getting node position:", error);
      return 0;
    }
  };

  // Go to a specific match by index
  const goToMatch = (index: number) => {
    if (
      activeMatchElements.length === 0 ||
      index < 0 ||
      index >= activeMatchElements.length
    ) {
      return;
    }

    // Reset styling for all spans, especially the previously active one
    try {
      // Get all spans including the active one
      const spans = document.querySelectorAll(
        `.${searchHighlightClass}, .${activeHighlightClass}`,
      );

      // Reset each span to the default search highlight style
      spans.forEach((span) => {
        const spanElement = span as HTMLElement;

        // Reset classes
        spanElement.classList.remove(activeHighlightClass);
        spanElement.classList.add(searchHighlightClass);

        // Apply default highlight style directly
        spanElement.style.cssText = `
          background-color: #FFFF00 !important;
          color: #000000 !important;
          display: inline !important;
          padding: 1px 0 !important;
          margin: 0 1px !important;
          border-bottom: 2px solid #FFB700 !important;
          border-radius: 2px !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.5) !important;
        `;
      });
    } catch (error) {
      console.error("Error resetting highlight styles:", error);
    }

    // Find the highlight span for the current match
    try {
      const highlightSpans = document.querySelectorAll(
        `.${searchHighlightClass}`,
      );
      if (highlightSpans.length > index) {
        // Get the span to activate
        const spanToActivate = highlightSpans[index] as HTMLElement;

        // Add active class
        spanToActivate.classList.remove(searchHighlightClass);
        spanToActivate.classList.add(activeHighlightClass);

        // Apply direct inline styles for active highlight
        spanToActivate.style.cssText = `
          background-color: #FFA500 !important;
          color: #000000 !important;
          display: inline !important;
          padding: 1px 0 !important;
          margin: 0 1px !important;
          border-bottom: 2px solid #FF7800 !important;
          border-radius: 2px !important;
          box-shadow: 0 0 3px 1px rgba(255, 165, 0, 0.7) !important;
        `;

        // Scroll to the match
        spanToActivate.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } catch (error) {
      console.error("Error activating match:", error);
    }

    // Update current match index
    setCurrentMatchIndex(index);
    setCurrentMatch(index + 1);
  };

  // Function to find next match - using either simple or direct search
  const findNext = () => {
    if (matchArray.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matchArray.length;

    try {
      // Try to use the simple search first if it's active
      const overlayContainer = document.getElementById(
        "search-overlay-container",
      );
      if (overlayContainer) {
        console.log("Using simple search for next match");
        simpleActivateMatch(nextIndex, matchArray);
      } else {
        // Fall back to direct search
        console.log("Using direct search for next match");
        activateMatch(nextIndex, matchArray);
      }

      // Update UI state
      setCurrentMatchIndex(nextIndex);
      setCurrentMatch(nextIndex + 1);
    } catch (error) {
      console.error("Error finding next match:", error);

      // Last resort fallback to direct search
      try {
        activateMatch(nextIndex, matchArray);
        setCurrentMatchIndex(nextIndex);
        setCurrentMatch(nextIndex + 1);
      } catch (directError) {
        console.error("All next match methods failed:", directError);
      }
    }
  };

  // Function to find previous match - using either simple or direct search
  const findPrev = () => {
    if (matchArray.length === 0) return;

    const prevIndex =
      (currentMatchIndex - 1 + matchArray.length) % matchArray.length;

    try {
      // Try to use the simple search first if it's active
      const overlayContainer = document.getElementById(
        "search-overlay-container",
      );
      if (overlayContainer) {
        console.log("Using simple search for previous match");
        simpleActivateMatch(prevIndex, matchArray);
      } else {
        // Fall back to direct search
        console.log("Using direct search for previous match");
        activateMatch(prevIndex, matchArray);
      }

      // Update UI state
      setCurrentMatchIndex(prevIndex);
      setCurrentMatch(prevIndex + 1);
    } catch (error) {
      console.error("Error finding previous match:", error);

      // Last resort fallback to direct search
      try {
        activateMatch(prevIndex, matchArray);
        setCurrentMatchIndex(prevIndex);
        setCurrentMatch(prevIndex + 1);
      } catch (directError) {
        console.error("All previous match methods failed:", directError);
      }
    }
  };

  // Function to replace current match using our nuclear approach
  const replace = () => {
    if (matchArray.length === 0 || currentMatchIndex + 1 < 0) return;

    try {
      console.log("NUCLEAR REPLACE: Starting with", replaceTerm);

      // Make sure editor is focused for maximum reliability
      editor.commands.focus();

      // Flag to track if replacement worked
      let success = false;

      // Get the text to replace before any manipulations
      let originalText = "";
      let highlightId = "";

      // Try to find the active match element
      const activeSimpleMatch = document.querySelector(
        `.${SIMPLE_ACTIVE_HIGHLIGHT_CLASS}`,
      ) as HTMLElement;

      const activeDirectMatch = document.querySelector(
        `.${ACTIVE_HIGHLIGHT_CLASS}`,
      ) as HTMLElement;

      // Get the active match from either implementation
      if (activeSimpleMatch) {
        originalText = activeSimpleMatch.textContent || "";
        highlightId = activeSimpleMatch.id || "";
        console.log("Found simple active match with text:", originalText);
      } else if (activeDirectMatch) {
        originalText = activeDirectMatch.textContent || "";
        highlightId = activeDirectMatch.id || "";
        console.log("Found direct active match with text:", originalText);
      } else {
        // If no highlight found, try to get text from the current match in array
        if (currentMatchIndex >= 0 && currentMatchIndex < matchArray.length) {
          const match = matchArray[currentMatchIndex];
          originalText = match.textContent || "";
          highlightId = match.id || "";
          console.log("Using match from array:", originalText);
        } else {
          // Last resort: use the search term itself
          originalText = searchTerm;
          console.log("Falling back to search term:", originalText);
        }
      }

      if (!originalText) {
        console.error("Could not determine text to replace");
        alert("Could not determine which text to replace. Please try again.");
        return false;
      }

      // NUCLEAR OPTION: Use our dedicated brute force replacement function
      console.log(
        "Using nuclear force-replace with:",
        originalText,
        "→",
        replaceTerm,
      );
      success = forceReplace(editor, originalText, replaceTerm, highlightId);

      if (success) {
        console.log("Nuclear replace succeeded!");

        // Clear all highlights after successful replacement
        clearAllHighlights();
        simpleClearAllHighlights();

        // Re-run search after a delay to show updated results
        setTimeout(() => {
          editor.commands.focus();
          search();
        }, 100);

        return true;
      } else {
        console.error("Nuclear replace failed!");

        // FALLBACK: Try the simple approach
        try {
          console.log("Trying simple replace as fallback");
          success = simpleReplaceActiveMatch(editor, replaceTerm);

          if (success) {
            console.log("Simple replace worked as fallback!");

            // Clear highlights and re-search
            clearAllHighlights();
            simpleClearAllHighlights();

            setTimeout(() => {
              editor.commands.focus();
              search();
            }, 100);

            return true;
          }
        } catch (err) {
          console.error("Simple replace fallback failed:", err);
        }

        // LAST RESORT: Direct HTML replacement of the entire editor content
        try {
          console.log("Using last resort full content replacement");

          // Get all of the editor's HTML
          const fullHtml = editor.getHTML();

          // Escape special characters in the search string
          const escapedSearch = originalText.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

          // Replace just the first occurrence
          const newHtml = fullHtml.replace(
            new RegExp(escapedSearch),
            replaceTerm,
          );

          // Only update if something changed
          if (newHtml !== fullHtml) {
            // Set the entire content at once
            editor.commands.setContent(newHtml, false);

            console.log("Last resort HTML replacement worked!");

            // Clear highlights and re-search
            clearAllHighlights();
            simpleClearAllHighlights();

            setTimeout(() => {
              editor.commands.focus();
              search();
            }, 100);

            return true;
          }
        } catch (err) {
          console.error("Last resort replacement failed:", err);
        }

        // If we get here, nothing worked
        alert("Replacement failed. Please try again with different text.");
        return false;
      }
    } catch (error) {
      console.error("Error in replace:", error);
      return false;
    }
  };

  const replaceAll = () => {
    if (matchArray.length === 0) return;

    try {
      console.log("Starting multi-page Replace All operation");
      
      // Get the number of matches before we start
      const originalMatchCount = matchArray.length;
      
      // Clear any active selection
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
      
      // Use our enhanced ultraSimpleReplaceAll implementation
      // This is designed specifically to work across multiple pages
      const replacedCount = ultraSimpleReplaceAll(
        editor,
        searchTerm,
        replaceTerm,
        matchCase
      );
      
      console.log(`Replace All completed: ${replacedCount} matches replaced`);
      
      // If that didn't work, try the simpleReplaceAllMatches as a fallback
      if (replacedCount === 0) {
        console.log("Trying simpleReplaceAllMatches as fallback");
        const simpleCount = simpleReplaceAllMatches(editor, replaceTerm);
        console.log(`Simple Replace All completed: ${simpleCount} matches replaced`);
        
        // If still nothing, try other approaches
        if (simpleCount === 0) {
          console.log("Trying directReplaceAll as final fallback");
          directReplaceAll(editor, searchTerm, replaceTerm);
        }
      }
      
      // Clear all search highlights after replacement
      simpleClearAllHighlights();
      clearAllHighlights();
      
      // Reset search state since all matches were replaced
      setMatches(0);
      setCurrentMatch(0);
      setMatchArray([]);
      
      // Show success message
      if (replacedCount > 0) {
        toast({
          title: "Replace All Completed",
          description: `${replacedCount} matches replaced with "${replaceTerm}"`,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error("Error in replaceAll:", error);
      
      // Show error message to user
      toast({
        title: "Error replacing matches",
        description: "An error occurred during Replace All. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-lg">
        {/* Google Docs style header with blue accent */}
        <div className="bg-blue-600 text-white py-3 px-4">
          <h2 className="text-base font-medium">
            {showReplace ? "Find and replace" : "Find in document"}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Search input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="search"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find"
                className="h-9 border-gray-300 focus-visible:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button
                onClick={search}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Find
              </Button>
            </div>
            {matches > 0 && (
              <div className="text-xs text-gray-500">
                {currentMatch} of {matches} matches
              </div>
            )}
          </div>

          {/* Replace input */}
          {showReplace && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  id="replace"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="Replace with"
                  className="h-9 border-gray-300 focus-visible:ring-blue-500"
                />
                <Button
                  variant="outline"
                  onClick={replace}
                  disabled={matches === 0}
                  className="border-gray-300 text-gray-700"
                >
                  Replace
                </Button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center space-x-6 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="matchCase"
                checked={matchCase}
                onCheckedChange={(checked) => setMatchCase(!!checked)}
                className="border-gray-400 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="matchCase" className="text-sm text-gray-700">
                Match case
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wholeWord"
                checked={wholeWord}
                onCheckedChange={(checked) => setWholeWord(!!checked)}
                className="border-gray-400 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="wholeWord" className="text-sm text-gray-700">
                Match whole word
              </Label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowReplace(!showReplace)}
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {showReplace ? "Hide replace" : "Show replace"}
              </Button>

              {showReplace && (
                <Button
                  variant="ghost"
                  onClick={replaceAll}
                  disabled={!searchTerm} // Only disable if search term is empty
                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:text-gray-400"
                >
                  Replace all
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={findPrev}
                disabled={matches === 0}
                className="text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                title="Previous match"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </Button>

              <Button
                variant="ghost"
                onClick={findNext}
                disabled={matches === 0}
                className="text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                title="Next match"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Button>

              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-700 hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
