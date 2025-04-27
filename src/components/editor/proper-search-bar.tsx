/**
 * PROPERLY IMPLEMENTED SEARCH & REPLACE BAR
 * 
 * This search implementation properly extracts text from ProseMirror's
 * complex node structure and finds matches with correct positions.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { useSearchReplaceStore } from '../../lib/search-replace-store';
import { findAllMatches, ProseMirrorTextExtractor } from './prosemirror-text-extractor';
import { ChevronUp, ChevronDown, X, Search, Check, Keyboard } from 'lucide-react';
import { HistoryManager } from './history-manager';
import './search-styles.css';

// Add custom decoration for search matches
const styleElement = document.createElement('style');
styleElement.textContent = `
  .pm-search-match-decoration {
    background-color: #ffeb3b !important;
    border-radius: 2px;
    box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.6) !important;
    outline: 1px solid #f57f17 !important;
  }
  
  .pm-search-match-active-decoration {
    background-color: #ff9800 !important;
    outline: 2px solid #ff9800 !important;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.8) !important;
    font-weight: bold !important;
  }
`;
document.head.appendChild(styleElement);

interface ProperSearchBarProps {
  editor: Editor | null;
  historyManager?: HistoryManager | null;
}

export default function ProperSearchBar({ editor, historyManager }: ProperSearchBarProps) {
  const { isVisible, toggleVisibility } = useSearchReplaceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState<{ from: number, to: number, text: string }[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-focus search input when search bar becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 50);
    }
  }, [isVisible]);
  
  // Clear decorations when component unmounts or search is hidden
  useEffect(() => {
    return () => {
      if (editor) {
        removeDecorations();
      }
    };
  }, [editor]);
  
  // Clear decorations when search is hidden
  useEffect(() => {
    if (!isVisible && editor) {
      removeDecorations();
    }
  }, [isVisible, editor]);
  
  // Perform search when search term changes
  useEffect(() => {
    if (!editor || !isVisible) return;
    
    // Debug the document structure for troubleshooting
    // This will help identify how nodes are structured
    if (searchTerm.trim() === 'debug') {
      ProseMirrorTextExtractor.debugDocumentStructure(editor);
      return;
    }
    
    const searchDelay = setTimeout(() => {
      console.log(`🔍 SEARCHING: "${searchTerm}" (case sensitive: ${matchCase})`);
      
      if (searchTerm.trim()) {
        try {
          const { matches: foundMatches, flatText } = findAllMatches(editor, searchTerm, matchCase);
          
          console.log(`Found ${foundMatches.length} matches in text:`, flatText);
          console.log('Match positions:', foundMatches);
          
          setMatches(foundMatches);
          setMatchCount(foundMatches.length);
          
          if (foundMatches.length > 0) {
            setCurrentMatch(1); // Start with first match
            applyDecorations(foundMatches, 0);
          } else {
            setCurrentMatch(0);
            removeDecorations();
          }
        } catch (error) {
          console.error("Error during search:", error);
          setMatchCount(0);
          setCurrentMatch(0);
          setMatches([]);
          removeDecorations();
        }
      } else {
        // Clear search if search term is empty
        setMatchCount(0);
        setCurrentMatch(0);
        setMatches([]);
        removeDecorations();
      }
    }, 100);
    
    return () => clearTimeout(searchDelay);
  }, [editor, searchTerm, matchCase, isVisible]);
  
  // Apply decorations to highlight matches
  const applyDecorations = (matches: { from: number, to: number, text: string }[], activeIndex: number) => {
    if (!editor) return;
    
    // First remove existing decorations
    removeDecorations();
    
    // Create transaction to add decorations
    const { tr } = editor.view.state;
    
    // Add marks for all matches
    matches.forEach((match, index) => {
      try {
        // Add specific classes for all matches and active match
        const className = index === activeIndex ? 'pm-search-match-active-decoration' : 'pm-search-match-decoration';
        
        tr.addMark(match.from, match.to, editor.schema.marks.highlight.create({ class: className }));
      } catch (e) {
        console.error(`Error applying decoration for match ${index}:`, e);
      }
    });
    
    // Apply the transaction
    editor.view.dispatch(tr);
    
    // Scroll active match into view
    if (matches.length > 0 && activeIndex >= 0 && activeIndex < matches.length) {
      const activeMatch = matches[activeIndex];
      scrollToPosition(activeMatch.from);
    }
  };
  
  // Remove all search decorations
  const removeDecorations = () => {
    if (!editor) return;
    
    // Remove all highlight marks
    const { tr } = editor.view.state;
    const { doc } = editor.state;
    
    // Remove the highlights from the entire document
    tr.removeMark(0, doc.content.size, editor.schema.marks.highlight);
    
    // Apply the transaction
    editor.view.dispatch(tr);
  };
  
  // Scroll to position
  const scrollToPosition = (pos: number) => {
    if (!editor) return;
    
    // Find the DOM position
    try {
      const coords = editor.view.coordsAtPos(pos);
      const element = document.elementFromPoint(coords.left, coords.top);
      
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } catch (e) {
      console.error('Error scrolling to position:', e);
    }
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to go to next match
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNextMatch();
        return;
      }
      
      // Shift+Enter to go to previous match
      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePreviousMatch();
        return;
      }
      
      // Ctrl+Enter or Cmd+Enter to replace all
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && showReplace) {
        e.preventDefault();
        handleReplaceAll();
        return;
      }
      
      // Escape to close search
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, showReplace, matches]);
  
  // Handle next match click
  const handleNextMatch = () => {
    if (!editor || matches.length === 0) return;
    
    // Calculate next match index with wrap-around
    const nextIndex = currentMatch % matches.length;
    setCurrentMatch(nextIndex + 1);
    
    // Apply decorations with new active match
    applyDecorations(matches, nextIndex);
  };
  
  // Handle previous match click
  const handlePreviousMatch = () => {
    if (!editor || matches.length === 0) return;
    
    // Calculate previous match index with wrap-around
    const prevIndex = (currentMatch - 2 + matches.length) % matches.length;
    setCurrentMatch(prevIndex + 1);
    
    // Apply decorations with new active match
    applyDecorations(matches, prevIndex);
  };
  
  // Handle replace current match
  const handleReplace = () => {
    if (!editor || matches.length === 0 || currentMatch <= 0) return;
    
    try {
      const matchIndex = currentMatch - 1;
      const match = matches[matchIndex];
      
      // Create a transaction that replaces the matched text with replacement text
      const { state, dispatch } = editor.view;
      dispatch(state.tr.insertText(replaceTerm, match.from, match.to));
      
      // Add history step 
      if (historyManager) {
        historyManager.addHistoryStep('replace');
      }
      
      // Re-run search after replacement
      const { matches: newMatches } = findAllMatches(editor, searchTerm, matchCase);
      setMatches(newMatches);
      setMatchCount(newMatches.length);
      
      if (newMatches.length > 0) {
        // Adjust current match index if needed
        const newCurrentMatch = Math.min(currentMatch, newMatches.length);
        setCurrentMatch(newCurrentMatch);
        applyDecorations(newMatches, newCurrentMatch - 1);
      } else {
        setCurrentMatch(0);
        removeDecorations();
      }
    } catch (error) {
      console.error("Error replacing match:", error);
    }
  };
  
  // Handle replace all matches
  const handleReplaceAll = () => {
    if (!editor || matches.length === 0) return;
    
    try {
      const { tr } = editor.view.state;
      
      // Sort matches in reverse order to avoid position shifts
      const sortedMatches = [...matches].sort((a, b) => b.from - a.from);
      
      // Replace all matches from end to start
      for (const match of sortedMatches) {
        tr.insertText(replaceTerm, match.from, match.to);
      }
      
      // Apply the transaction
      editor.view.dispatch(tr);
      
      // Add history step
      if (historyManager) {
        historyManager.addHistoryStep('replace-all');
      }
      
      // Clear matches after replacing all
      setMatches([]);
      setMatchCount(0);
      setCurrentMatch(0);
      removeDecorations();
      
      // Show success message
      console.log(`Replaced ${sortedMatches.length} occurrences`);
    } catch (error) {
      console.error("Error replacing all matches:", error);
    }
  };
  
  // Handle close button click
  const handleClose = () => {
    removeDecorations();
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
            placeholder="Correct ProseMirror Search"
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
              onClick={() => setShowReplace(!showReplace)}
              className={`option-button ${showReplace ? 'option-active' : ''}`}
              title="Show replace options"
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