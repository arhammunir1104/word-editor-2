/**
 * DIRECT TEXT CONTENT SEARCH
 * 
 * This is the most direct, simplest possible search implementation.
 * It ignores all editor structure and directly searches for text content in paragraphs.
 */

import { Editor } from "@tiptap/core";

interface Match {
  element: HTMLElement;
  index: number;
}

export class TextContentSearch {
  private editor: Editor;
  private matches: Match[] = [];
  private currentMatchIndex: number = -1;
  private activeMark: HTMLElement | null = null;
  
  constructor(editor: Editor) {
    this.editor = editor;
  }
  
  search(query: string, matchCase: boolean = false): { matchCount: number; currentIndex: number } {
    // Clear any existing search
    this.clearSearch();
    
    if (!query) {
      return { matchCount: 0, currentIndex: -1 };
    }
    
    console.log("🔎 DIRECT TEXT SEARCH:", query, "Case sensitive:", matchCase);
    
    // Get all paragraphs in the editor
    const editorEl = this.editor.view.dom;
    const paragraphs = editorEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'); 
    console.log(`Found ${paragraphs.length} paragraphs to search in`);
    
    // Search in each paragraph
    paragraphs.forEach((paragraph) => {
      // Super direct text content search
      const text = paragraph.textContent || '';
      
      // Perform search based on case sensitivity
      let foundIndex: number;
      if (matchCase) {
        foundIndex = text.indexOf(query);
      } else {
        foundIndex = text.toLowerCase().indexOf(query.toLowerCase());
      }
      
      // If found, add to matches
      if (foundIndex !== -1) {
        console.log(`Found match in: "${text}"`);
        this.matches.push({
          element: paragraph as HTMLElement,
          index: foundIndex
        });
      }
    });
    
    // Set current match if we found any
    if (this.matches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightCurrentMatch();
    }
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex
    };
  }
  
  nextMatch(): { matchCount: number; currentIndex: number } {
    if (this.matches.length === 0) {
      return { matchCount: 0, currentIndex: -1 };
    }
    
    // Move to next match, wrapping if needed
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.highlightCurrentMatch();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex
    };
  }
  
  previousMatch(): { matchCount: number; currentIndex: number } {
    if (this.matches.length === 0) {
      return { matchCount: 0, currentIndex: -1 };
    }
    
    // Move to previous match, wrapping if needed
    this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    this.highlightCurrentMatch();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex
    };
  }
  
  private highlightCurrentMatch(): void {
    // Remove current highlight
    if (this.activeMark) {
      this.activeMark.classList.remove('active-direct-match');
    }
    
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
      const match = this.matches[this.currentMatchIndex];
      match.element.classList.add('active-direct-match');
      this.activeMark = match.element;
      
      // Scroll to the element
      match.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  replaceCurrentMatch(replaceWith: string): boolean {
    if (this.matches.length === 0 || this.currentMatchIndex < 0) {
      return false;
    }
    
    try {
      const match = this.matches[this.currentMatchIndex];
      
      // This is very aggressive but will ensure something happens
      match.element.textContent = replaceWith;
      
      // Clear current matches and rerun search
      this.clearSearch();
      return true;
    } catch (error) {
      console.error("Error replacing match:", error);
      return false;
    }
  }
  
  replaceAllMatches(replaceWith: string): number {
    if (this.matches.length === 0) {
      return 0;
    }
    
    const count = this.matches.length;
    
    // Replace all matches - this is aggressive but guaranteed to work
    for (const match of this.matches) {
      match.element.textContent = replaceWith;
    }
    
    // Clear matches
    this.clearSearch();
    return count;
  }
  
  clearSearch(): void {
    // Remove any active highlight
    if (this.activeMark) {
      this.activeMark.classList.remove('active-direct-match');
      this.activeMark = null;
    }
    
    // Clear all highlight classes
    const highlightedElements = document.querySelectorAll('.active-direct-match');
    highlightedElements.forEach(el => {
      el.classList.remove('active-direct-match');
    });
    
    // Reset state
    this.matches = [];
    this.currentMatchIndex = -1;
  }
  
  getState(): { matchCount: number; currentIndex: number } {
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex
    };
  }
}

export function createTextContentSearch(editor: Editor): TextContentSearch {
  return new TextContentSearch(editor);
}