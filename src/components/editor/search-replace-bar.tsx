import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { useSearchReplaceStore } from "../../lib/search-replace-store";
import {
  findAllMatches,
  highlightMatches,
  clearHighlights,
  replaceCurrentMatch,
  replaceAllMatches,
  restoreNormalText,
} from "./search-utils";
import { X, ChevronUp, ChevronDown, Search } from "lucide-react";
import { HistoryManager } from "./history-manager";
import "./search-styles.css";

interface SearchReplaceBarProps {
  editor: Editor | null;
  historyManager?: HistoryManager | null;
}

const SearchReplaceBar: React.FC<SearchReplaceBarProps> = ({
  editor,
  historyManager,
}) => {
  // Get values and actions from the store
  const {
    query,
    replaceWith,
    currentIndex,
    matches,
    totalMatches,
    matchCase,
    wholeWord,
    useRegex,
    isVisible,
    showReplace,
    lastEffectiveQuery,

    setQuery,
    setReplaceWith,
    setCurrentIndex,
    setMatches,
    setMatchCase,
    setWholeWord,
    setUseRegex,
    setIsVisible,
    setShowReplace,
    toggleReplaceVisibility,
    incrementCurrentIndex,
    decrementCurrentIndex,
    setLastEffectiveQuery,
  } = useSearchReplaceStore();

  // Local state for debouncing search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcuts - Google Docs style
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle document-wide keyboard shortcuts

      // Close search on Escape
      if (e.key === "Escape" && isVisible) {
        e.preventDefault();
        closeSearch();
        return;
      }

      // Open search on Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
        setIsVisible(true);
        // Focus search input after a short delay
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 10);
        return;
      }

      // Open replace on Ctrl+H / Cmd+H
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
        e.preventDefault();
        e.stopPropagation();
        setIsVisible(true);
        setShowReplace(true);
        // Focus search input after a short delay
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 10);
        return;
      }

      // If search is visible, handle search-specific shortcuts
      if (isVisible) {
        // Enter to find next, Shift+Enter to find previous
        if (e.key === "Enter") {
          e.preventDefault();

          // Ctrl+Enter or Cmd+Enter for replace all
          if ((e.ctrlKey || e.metaKey) && showReplace && totalMatches > 0) {
            replaceAll();
          }
          // Shift+Enter to find previous
          else if (e.shiftKey) {
            findPrevious();
          }
          // Just Enter to find next
          else {
            findNext();
          }
          return;
        }

        // Keyboard shortcut for replace current match (Alt+R or Option+R)
        if (
          e.altKey &&
          e.key.toLowerCase() === "r" &&
          showReplace &&
          totalMatches > 0
        ) {
          e.preventDefault();
          replaceMatch();
          return;
        }

        // Keyboard shortcut for replace all (Alt+A or Option+A)
        if (
          e.altKey &&
          e.key.toLowerCase() === "a" &&
          showReplace &&
          totalMatches > 0
        ) {
          e.preventDefault();
          replaceAll();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, setIsVisible, setShowReplace]);

  // Clear highlights when component unmounts or search is closed
  useEffect(() => {
    if (!isVisible && lastEffectiveQuery) {
      restoreNormalText(editor);
      setLastEffectiveQuery("");
    }

    return () => {
      restoreNormalText(editor);
    };
  }, [isVisible, editor, lastEffectiveQuery, setLastEffectiveQuery]);

  // Focus search input when bar opens
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Immediately search when query is set
  const performSearch = React.useCallback(() => {
    if (!editor || !query) {
      clearHighlights(editor);
      setMatches([]);
      setLastEffectiveQuery("");
      return;
    }

    console.log(`Performing search for "${query}" with options:`, {
      matchCase,
      wholeWord,
      useRegex,
    });

    // Execute the search
    const newMatches = findAllMatches(
      editor,
      query,
      matchCase,
      wholeWord,
      useRegex,
    );
    setMatches(newMatches);

    // Apply highlighting if we found matches
    if (newMatches.length > 0) {
      highlightMatches(
        editor,
        newMatches,
        currentIndex >= 0 ? currentIndex : 0,
      );
      setLastEffectiveQuery(query);
    } else {
      clearHighlights(editor);
    }
  }, [
    editor,
    query,
    matchCase,
    wholeWord,
    useRegex,
    currentIndex,
    setMatches,
    setLastEffectiveQuery,
  ]);

  // Perform search when query, matchCase, wholeWord, or useRegex changes
  useEffect(() => {
    if (!isVisible || !editor) return;

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Use a shorter debounce for a more responsive experience
    // Google Docs searches as you type, with minimal delay
    const timeout = setTimeout(() => {
      performSearch();
    }, 100); // 100ms debounce - more responsive

    setSearchTimeout(timeout);

    // Clean up on unmount or query change
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [query, matchCase, wholeWord, useRegex, isVisible, editor, performSearch]);

  // Functions for search navigation
  const findNext = () => {
    if (matches.length > 0) {
      incrementCurrentIndex();
      highlightMatches(editor, matches, (currentIndex + 1) % matches.length);
    }
  };

  const findPrevious = () => {
    if (matches.length > 0) {
      decrementCurrentIndex();
      highlightMatches(
        editor,
        matches,
        (currentIndex - 1 + matches.length) % matches.length,
      );
    }
  };

  // Functions for replacing
  const replaceMatch = () => {
    if (matches.length > 0 && currentIndex >= 0) {
      const success = replaceCurrentMatch(
        editor,
        matches,
        currentIndex,
        replaceWith,
        historyManager,
      );

      if (success) {
        // Re-run search to update matches after replacement
        const newMatches = findAllMatches(
          editor,
          query,
          matchCase,
          wholeWord,
          useRegex,
        );
        setMatches(newMatches);

        if (newMatches.length > 0) {
          // Keep the same index if possible, otherwise reset to 0
          const newIndex = currentIndex < newMatches.length ? currentIndex : 0;
          setCurrentIndex(newIndex);
          highlightMatches(editor, newMatches, newIndex);
        } else {
          clearHighlights(editor);
        }
      }
    }
  };

  const replaceAll = () => {
    if (matches.length > 0) {
      const count = replaceAllMatches(
        editor,
        matches,
        replaceWith,
        historyManager,
      );

      if (count > 0) {
        // Re-run search to update matches after replacements
        const newMatches = findAllMatches(
          editor,
          query,
          matchCase,
          wholeWord,
          useRegex,
        );
        setMatches(newMatches);

        if (newMatches.length > 0) {
          setCurrentIndex(0);
          highlightMatches(editor, newMatches, 0);
        } else {
          clearHighlights(editor);
        }
      }
    }
  };

  // Close search
  const closeSearch = () => {
    setIsVisible(false);
    restoreNormalText(editor);
  };

  if (!isVisible) return null;

  return (
    <div className="search-replace-container bg-white shadow-lg rounded-none z-50 w-full max-w-xs border border-gray-200 overflow-visible">
      {/* Search Bar - exactly like Google Docs */}
      <div className="p-2 pb-0">
        <div className="flex items-center mb-2">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-gray-300 p-1.5 px-2 flex-grow text-sm outline-blue-400"
            placeholder="Find"
            style={{ borderRadius: "1px" }}
          />
          <button
            onClick={closeSearch}
            className="ml-1 text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Replace Bar - exactly like Google Docs */}
        {showReplace && (
          <div className="flex items-center mb-2">
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              className="border border-gray-300 p-1.5 px-2 w-full text-sm outline-blue-400"
              placeholder="Replace with"
              style={{ borderRadius: "1px" }}
            />
          </div>
        )}

        {/* Options - Match Case, Whole Word, etc */}
        <div className="flex items-center text-xs mb-2 pl-1">
          <label className="flex items-center mr-3 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="mr-1 h-3 w-3"
            />
            <span className="text-gray-700">Match case</span>
          </label>

          <label className="flex items-center mr-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="mr-1 h-3 w-3"
            />
            <span className="text-gray-700">Whole word</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="mr-1 h-3 w-3"
            />
            <span className="text-gray-700">Regex</span>
          </label>
        </div>

        {/* Results count and action buttons */}
        <div className="flex items-center justify-between py-1 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 pl-2 match-counter">
            {totalMatches > 0
              ? `${currentIndex + 1} of ${totalMatches}`
              : query
                ? "No matches"
                : ""}
          </div>

          <div className="flex">
            {/* Navigation Buttons */}
            <div className="flex mr-2">
              <button
                onClick={findPrevious}
                disabled={totalMatches === 0}
                className="p-1 text-gray-600 disabled:text-gray-300"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="h-4 w-4" />
              </button>

              <button
                onClick={findNext}
                disabled={totalMatches === 0}
                className="p-1 text-gray-600 disabled:text-gray-300"
                title="Next match (Enter)"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Replace buttons - like Google Docs */}
            <div className="flex">
              <button
                onClick={toggleReplaceVisibility}
                className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                title="Toggle replace options (Ctrl+H)"
              >
                {showReplace ? "Hide Replace" : "Replace"}
              </button>

              {showReplace && (
                <>
                  <button
                    onClick={replaceMatch}
                    disabled={totalMatches === 0}
                    className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                    title="Replace current match (Alt+R)"
                  >
                    Replace
                  </button>

                  <button
                    onClick={replaceAll}
                    disabled={totalMatches === 0}
                    className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                    title="Replace all matches (Ctrl+Enter or Alt+A)"
                  >
                    All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchReplaceBar;
