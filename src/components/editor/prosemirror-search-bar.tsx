/**
 * ProseMirrorSearchBar Component
 * A Google Docs-style search and replace interface that uses direct ProseMirror API access
 * for more reliable search functionality.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { useSearchReplaceStore } from '../../lib/search-replace-store';
import { createProseMirrorSearch } from './prosemirror-search';
import { ChevronUp, ChevronDown, X, Search, Check, Keyboard } from 'lucide-react';
import { HistoryManager } from './history-manager';
import './search-styles.css';

interface ProseMirrorSearchBarProps {
  editor: Editor | null;
  historyManager?: HistoryManager | null;
}

export default function ProseMirrorSearchBar({ editor, historyManager }: ProseMirrorSearchBarProps) {
  const { isVisible, toggleVisibility } = useSearchReplaceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToolRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize search tool when editor is available
  useEffect(() => {
    if (editor) {
      searchToolRef.current = createProseMirrorSearch(editor);
    }
    
    return () => {
      // Clear decorations when unmounting
      if (searchToolRef.current) {
        searchToolRef.current.clearDecorations();
      }
    };
  }, [editor]);
  
  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleVisibility();
        return;
      }
      
      // Ctrl+H for replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        toggleVisibility();
        setShowReplace(true);
        return;
      }
      
      // Escape to close search
      if (e.key === 'Escape' && isVisible) {
        e.preventDefault();
        toggleVisibility();
        return;
      }
      
      // Enter to find next
      if (isVisible && e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNextMatch();
        return;
      }
      
      // Shift+Enter to find previous
      if (isVisible && e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePreviousMatch();
        return;
      }
      
      // Ctrl+Enter to replace all
      if (isVisible && e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleReplaceAll();
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, toggleVisibility, searchTerm, replaceTerm, showReplace]);
  
  // Auto-focus search input when opened
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isVisible]);
  
  // Perform search when search parameters change
  useEffect(() => {
    if (!editor || !searchToolRef.current || !isVisible) return;
    
    // Add a slight delay to allow for smoother typing experience
    const searchTimeout = setTimeout(() => {
      console.log("Performing search with term:", searchTerm);
      
      if (searchTerm.trim()) {
        try {
          const result = searchToolRef.current.setSearch({
            term: searchTerm,
            matchCase,
            regex: useRegex
          });
          
          console.log("Search result:", result);
          setMatchCount(result.matchCount);
          setCurrentMatch(result.matchCount > 0 ? result.currentIndex + 1 : 0);
        } catch (error) {
          console.error("Error during search:", error);
          // Clear decorations on error
          searchToolRef.current.clearDecorations();
          setMatchCount(0);
          setCurrentMatch(0);
        }
      } else {
        // Clear search if search term is empty
        searchToolRef.current.clearDecorations();
        setMatchCount(0);
        setCurrentMatch(0);
      }
    }, 100); // Small delay for better typing experience
    
    // Cleanup timeout on next render
    return () => clearTimeout(searchTimeout);
  }, [editor, searchTerm, matchCase, useRegex, isVisible]);
  
  // Handle next match click
  const handleNextMatch = () => {
    if (!searchToolRef.current || !searchTerm.trim()) return;
    
    const result = searchToolRef.current.nextMatch();
    if (result) {
      setCurrentMatch(result.currentIndex + 1);
      setMatchCount(result.matchCount);
    }
  };
  
  // Handle previous match click
  const handlePreviousMatch = () => {
    if (!searchToolRef.current || !searchTerm.trim()) return;
    
    const result = searchToolRef.current.previousMatch();
    if (result) {
      setCurrentMatch(result.currentIndex + 1);
      setMatchCount(result.matchCount);
    }
  };
  
  // Handle replace current match
  const handleReplace = () => {
    if (!searchToolRef.current || !searchTerm.trim()) return;
    
    const replaced = searchToolRef.current.replaceCurrentMatch(replaceTerm);
    if (replaced) {
      const newState = searchToolRef.current.getSearchState();
      setMatchCount(newState.matchCount);
      setCurrentMatch(newState.currentIndex >= 0 ? newState.currentIndex + 1 : 0);
    }
  };
  
  // Handle replace all matches
  const handleReplaceAll = () => {
    if (!searchToolRef.current || !searchTerm.trim()) return;
    
    const replacedCount = searchToolRef.current.replaceAllMatches(replaceTerm);
    if (replacedCount > 0) {
      setMatchCount(0);
      setCurrentMatch(0);
    }
  };
  
  // Handle close button click
  const handleClose = () => {
    if (searchToolRef.current) {
      searchToolRef.current.clearDecorations();
    }
    toggleVisibility();
  };
  
  if (!isVisible) return null;
  
  return (
    <div ref={containerRef} className="search-replace-container search-animation">
      <div className="search-section">
        <div className="flex items-center">
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Find in document"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            data-testid="search-input"
          />
          
          {searchTerm.trim() && (
            <span className="match-counter" title="Current match">
              {matchCount > 0 ? `${currentMatch} of ${matchCount}` : 'No matches'}
            </span>
          )}
          
          <div className="flex gap-1">
            <button
              onClick={handlePreviousMatch}
              disabled={matchCount === 0}
              className="search-nav-button"
              title="Previous match (Shift+Enter)"
              aria-label="Previous match"
            >
              <ChevronUp size={18} />
            </button>
            
            <button
              onClick={handleNextMatch}
              disabled={matchCount === 0}
              className="search-nav-button"
              title="Next match (Enter)"
              aria-label="Next match"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          
          <div className="search-options">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`option-button ${matchCase ? 'option-active' : ''}`}
              title="Match case"
              aria-label="Match case"
              aria-pressed={matchCase}
            >
              Aa
            </button>
            
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`option-button ${useRegex ? 'option-active' : ''}`}
              title="Use regular expression"
              aria-label="Use regular expression"
              aria-pressed={useRegex}
            >
              .*
            </button>
            
            <button
              onClick={() => setShowReplace(!showReplace)}
              className={`option-button ${showReplace ? 'option-active' : ''}`}
              title="Show replace options (Ctrl+H)"
              aria-label="Show replace options"
              aria-pressed={showReplace}
            >
              <Check size={16} />
            </button>
          </div>
          
          <button 
            onClick={handleClose} 
            className="close-button" 
            title="Close (Esc)"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {showReplace && (
        <div className="replace-section">
          <div className="flex items-center">
            <span className="replace-label">Replace</span>
            <input
              type="text"
              placeholder="Replace with"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="replace-input"
              data-testid="replace-input"
            />
            
            <div className="flex gap-1">
              <button
                onClick={handleReplace}
                disabled={matchCount === 0}
                className="replace-button"
                title="Replace current match"
                aria-label="Replace"
              >
                Replace
              </button>
              
              <button
                onClick={handleReplaceAll}
                disabled={matchCount === 0}
                className="replace-all-button"
                title="Replace all matches (Ctrl+Enter)"
                aria-label="Replace all"
              >
                Replace all
              </button>
            </div>
          </div>
          
          <div className="shortcut-hint">
            <Keyboard size={14} className="mr-1" />
            <span>Pro tip: Use Ctrl+F to search, Ctrl+H for replace, Ctrl+Enter to replace all</span>
          </div>
        </div>
      )}
    </div>
  );
}