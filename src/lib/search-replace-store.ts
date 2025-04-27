import { create } from 'zustand';

// Define a type for search matches with DOM position information
export interface MatchInfo {
  startIndex: number;    // Start index in text content
  endIndex: number;      // End index in text content
  nodeReference: Node;   // Reference to containing node
  spanElement?: HTMLElement; // Reference to the highlight span if created
  range?: Range;        // Range object for this match
}

// Define the search and replace state
export interface SearchReplaceState {
  // Input fields
  query: string;
  replaceWith: string;
  
  // Match tracking
  currentIndex: number;
  matches: MatchInfo[];
  totalMatches: number;
  
  // Options
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  
  // UI state
  isVisible: boolean;
  showReplace: boolean;
  
  // Last search that produced matches (for highlighting)
  lastEffectiveQuery: string;
  
  // Actions
  setQuery: (query: string) => void;
  setReplaceWith: (text: string) => void;
  setCurrentIndex: (index: number) => void;
  setMatches: (matches: MatchInfo[]) => void;
  setMatchCase: (matchCase: boolean) => void;
  setWholeWord: (wholeWord: boolean) => void;
  setUseRegex: (useRegex: boolean) => void;
  
  setIsVisible: (isVisible: boolean) => void;
  setShowReplace: (showReplace: boolean) => void;
  
  // Utility methods
  resetSearch: () => void;
  toggleVisibility: () => void;
  toggleReplaceVisibility: () => void;
  incrementCurrentIndex: () => void;
  decrementCurrentIndex: () => void;
  clearMatches: () => void;
  setLastEffectiveQuery: (query: string) => void;
}

// Create the store using Zustand
export const useSearchReplaceStore = create<SearchReplaceState>((set) => ({
  // Initial state
  query: '',
  replaceWith: '',
  currentIndex: 0,
  matches: [],
  totalMatches: 0,
  matchCase: false,
  wholeWord: false,
  useRegex: false,
  isVisible: false,
  showReplace: false,
  lastEffectiveQuery: '',
  
  // Actions to update state
  setQuery: (query) => set({ query }),
  setReplaceWith: (replaceWith) => set({ replaceWith }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setMatches: (matches) => set((state) => ({ 
    matches, 
    totalMatches: matches.length,
    // Reset currentIndex if it's out of bounds
    currentIndex: state.currentIndex >= matches.length ? 
      (matches.length > 0 ? 0 : -1) : 
      state.currentIndex
  })),
  setMatchCase: (matchCase) => set({ matchCase }),
  setWholeWord: (wholeWord) => set({ wholeWord }),
  setUseRegex: (useRegex) => set({ useRegex }),
  setIsVisible: (isVisible) => set({ isVisible }),
  setShowReplace: (showReplace) => set({ showReplace }),
  setLastEffectiveQuery: (lastEffectiveQuery) => set({ lastEffectiveQuery }),
  
  // Utility methods
  resetSearch: () => set({ 
    query: '', 
    replaceWith: '',
    currentIndex: 0,
    matches: [],
    totalMatches: 0,
    lastEffectiveQuery: ''
  }),
  
  toggleVisibility: () => set((state) => ({ 
    isVisible: !state.isVisible,
    // Reset search when closing
    ...(state.isVisible ? { 
      query: '', 
      replaceWith: '',
      currentIndex: 0,
      matches: [],
      totalMatches: 0,
      lastEffectiveQuery: ''
    } : {})
  })),
  
  toggleReplaceVisibility: () => set((state) => ({ 
    showReplace: !state.showReplace 
  })),
  
  incrementCurrentIndex: () => set((state) => ({
    currentIndex: state.matches.length === 0 
      ? -1
      : (state.currentIndex + 1) % state.matches.length
  })),
  
  decrementCurrentIndex: () => set((state) => ({
    currentIndex: state.matches.length === 0 
      ? -1 
      : (state.currentIndex - 1 + state.matches.length) % state.matches.length
  })),
  
  clearMatches: () => set({ 
    matches: [], 
    totalMatches: 0, 
    currentIndex: -1 
  }),
}));

// Helper functions for searching
export function createSearchRegExp(
  query: string, 
  matchCase: boolean, 
  wholeWord: boolean,
  useRegex: boolean
): RegExp | null {
  if (!query) return null;
  
  try {
    let pattern: string;
    
    if (useRegex) {
      // Use provided regex directly
      pattern = query;
    } else {
      // Escape special regex characters
      pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Add word boundary if whole word is enabled
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
    }
    
    // Create the regex with the appropriate case sensitivity
    return new RegExp(pattern, matchCase ? 'g' : 'gi');
  } catch (error) {
    console.error('Invalid regex pattern:', error);
    return null;
  }
}