/**
 * EMERGENCY SEARCH IMPLEMENTATION
 * 
 * This is an extremely simplified and direct search algorithm that
 * bypasses all the complexity and directly searches the actual DOM content.
 * It's focused on reliability over elegance.
 */

import { Editor } from "@tiptap/core";

export interface EmergencyMatch {
  text: string;
  element: HTMLElement;
  index: number;
}

export class EmergencySearcher {
  private editor: Editor;
  private matches: EmergencyMatch[] = [];
  private currentIndex: number = -1;
  private lastTerm: string = '';
  private matchCase: boolean = false;
  
  constructor(editor: Editor) {
    this.editor = editor;
  }
  
  /**
   * Search for text in the editor using the direct DOM approach
   */
  search(options: { term: string, matchCase?: boolean }): { matchCount: number, currentIndex: number } {
    this.lastTerm = options.term;
    this.matchCase = options.matchCase || false;
    this.matches = [];
    this.currentIndex = -1;
    
    if (!this.lastTerm || !this.editor) {
      this.clearHighlights();
      return { matchCount: 0, currentIndex: -1 };
    }
    
    console.log(`🔍 EMERGENCY SEARCH: Searching for "${this.lastTerm}" (case sensitive: ${this.matchCase})`);
    
    // Get the actual editor DOM element that contains the content
    const editorElement = this.editor.view.dom;
    
    // Find ALL text nodes in the editor - this is the key to reliability
    const textNodes = this.getAllTextNodes(editorElement);
    console.log(`Found ${textNodes.length} text nodes in the editor`);
    
    // For each text node, check if it contains the search term
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const text = node.textContent || '';
      
      // Check if this text node contains our search term
      const termToSearch = this.matchCase ? this.lastTerm : this.lastTerm.toLowerCase();
      const textToSearch = this.matchCase ? text : text.toLowerCase();
      
      if (textToSearch.includes(termToSearch)) {
        console.log(`FOUND MATCH in text node: "${text}"`);
        
        // Get the closest non-text node element to highlight
        const parentElement = this.findParentElement(node);
        
        if (parentElement) {
          // Add to our matches collection
          this.matches.push({
            text: text, 
            element: parentElement,
            index: i
          });
        }
      }
    }
    
    // If we found matches, set the current index to the first match
    if (this.matches.length > 0) {
      this.currentIndex = 0;
      this.highlightMatches();
    }
    
    console.log(`Total matches found: ${this.matches.length}`);
    return { 
      matchCount: this.matches.length, 
      currentIndex: this.currentIndex
    };
  }
  
  /**
   * Find all text nodes in the given element recursively
   */
  private getAllTextNodes(element: Node): Text[] {
    const textNodes: Text[] = [];
    
    function traverse(node: Node) {
      // If this is a text node, add it to our collection
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent && node.textContent.trim() !== '') {
          textNodes.push(node as Text);
        }
      }
      
      // Recursively check all child nodes
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        traverse(children[i]);
      }
    }
    
    traverse(element);
    return textNodes;
  }
  
  /**
   * Find the parent element of a text node
   */
  private findParentElement(node: Node): HTMLElement | null {
    let parent = node.parentElement;
    
    // Keep going up until we find an element or hit the root
    while (parent && parent.nodeType !== Node.ELEMENT_NODE) {
      parent = parent.parentElement;
    }
    
    return parent as HTMLElement;
  }
  
  /**
   * Highlight all matches with a bright, visible style
   */
  private highlightMatches() {
    // First remove any existing highlights
    this.clearHighlights();
    
    // Add the highlight class to all matches
    this.matches.forEach((match, index) => {
      if (match.element) {
        match.element.classList.add('emergency-search-match');
        
        // Highlight the current match differently
        if (index === this.currentIndex) {
          match.element.classList.add('emergency-search-match-active');
          this.scrollToElement(match.element);
        }
      }
    });
  }
  
  /**
   * Clear all search highlights
   */
  clearHighlights() {
    // Find all elements with our highlight classes and remove them
    const highlighted = document.querySelectorAll('.emergency-search-match');
    highlighted.forEach(el => {
      el.classList.remove('emergency-search-match');
      el.classList.remove('emergency-search-match-active');
    });
  }
  
  /**
   * Navigate to the next match
   */
  nextMatch(): { matchCount: number, currentIndex: number } {
    if (this.matches.length === 0) {
      return { matchCount: 0, currentIndex: -1 };
    }
    
    // Move to the next match and wrap around if needed
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    this.highlightMatches();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentIndex
    };
  }
  
  /**
   * Navigate to the previous match
   */
  previousMatch(): { matchCount: number, currentIndex: number } {
    if (this.matches.length === 0) {
      return { matchCount: 0, currentIndex: -1 };
    }
    
    // Move to the previous match and wrap around if needed
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    this.highlightMatches();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentIndex
    };
  }
  
  /**
   * Replace the current match with new text
   */
  replaceCurrentMatch(replaceWith: string): boolean {
    if (this.matches.length === 0 || this.currentIndex < 0) {
      return false;
    }
    
    const match = this.matches[this.currentIndex];
    
    // We'll use the TipTap command chain to perform the replace
    // First we need to find the position in the document
    const { state, view } = this.editor;
    
    // Find positions in the document near our DOM element
    let startPos = 0;
    let endPos = 0;
    
    try {
      // Try to use direct DOM-to-position mapping
      const domPos = match.element;
      const posFrom = this.editor.view.posAtDOM(domPos, 0);
      const posTo = posFrom + this.lastTerm.length;
      
      startPos = posFrom;
      endPos = posTo;
    } catch (e) {
      console.error("Could not determine positions for replacement:", e);
      return false;
    }
    
    // Perform the replacement
    try {
      this.editor.chain()
        .focus()
        .deleteRange({ from: startPos, to: endPos })
        .insertContent(replaceWith)
        .run();
      
      // Re-run the search to update matches
      this.search({ 
        term: this.lastTerm, 
        matchCase: this.matchCase 
      });
      
      return true;
    } catch (e) {
      console.error("Could not perform replacement:", e);
      return false;
    }
  }
  
  /**
   * Replace all matches with new text
   */
  replaceAllMatches(replaceWith: string): number {
    if (this.matches.length === 0) {
      return 0;
    }
    
    // Note: This is a simplified implementation that re-searches after each replacement
    const matchCount = this.matches.length;
    
    // Replace each match one by one, starting from the end to avoid position changes
    const sortedMatches = [...this.matches].sort((a, b) => b.index - a.index);
    
    for (const match of sortedMatches) {
      try {
        // Set current match to this one
        this.currentIndex = this.matches.indexOf(match);
        
        // Replace the current match
        this.replaceCurrentMatch(replaceWith);
      } catch (e) {
        console.error("Error during replace all:", e);
      }
    }
    
    // Clear all matches after replacing
    this.matches = [];
    this.currentIndex = -1;
    this.clearHighlights();
    
    return matchCount;
  }
  
  /**
   * Scroll to the element containing the current match
   */
  private scrollToElement(element: HTMLElement) {
    if (!element) return;
    
    // Scroll the element into view with smooth behavior
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
  
  /**
   * Get the current search state
   */
  getSearchState() {
    return {
      term: this.lastTerm,
      matchCase: this.matchCase,
      matchCount: this.matches.length,
      currentIndex: this.currentIndex
    };
  }
}

/**
 * Create a new emergency searcher for the given editor
 */
export function createEmergencySearcher(editor: Editor): EmergencySearcher {
  return new EmergencySearcher(editor);
}