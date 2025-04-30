/**
 * Document Search Bar Component
 * A completely rewritten search bar implementation that uses our new
 * DocumentSearcher utility for more reliable search functionality
 */
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { useSearchReplaceStore } from '../../lib/search-replace-store';
import { ChevronUp, ChevronDown, X, Search, Check, Keyboard } from 'lucide-react';
import { HistoryManager } from './history-manager';
import './search-styles.css';

interface DocumentSearchBarProps {
  editor: Editor | null;
  historyManager?: HistoryManager | null;
}

// Simple placeholder component since search functionality was removed as requested
export default function DocumentSearchBar({ editor, historyManager }: DocumentSearchBarProps) {
  const { isVisible, toggleVisibility } = useSearchReplaceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  // Always showing no matches since search functionality was removed
  const matchCount = 0;
  const currentMatch = 0;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-focus search input when search bar becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      // Slight delay to ensure the component is fully mounted
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isVisible]);
  
  // Handle keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      // Escape to close search bar
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);
  
  // Handle next match click - stub since search functionality is removed
  const handleNextMatch = () => {
    // Search functionality removed
    console.log("Search functionality removed");
  };
  
  // Handle previous match click - stub since search functionality is removed
  const handlePreviousMatch = () => {
    // Search functionality removed
    console.log("Search functionality removed");
  };
  
  // Handle replace current match - stub since search functionality is removed
  const handleReplace = () => {
    // Search functionality removed
    console.log("Search functionality removed");
  };
  
  // Handle replace all matches - stub since search functionality is removed
  const handleReplaceAll = () => {
    // Search functionality removed
    console.log("Search functionality removed");
  };
  
  // Handle close button click
  const handleClose = () => {
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