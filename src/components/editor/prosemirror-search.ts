/**
 * ProseMirror Search Implementation - Uses direct access to the ProseMirror document model
 * for more reliable search and replace functionality.
 */
import { Editor } from "@tiptap/core";
import { Node, Fragment } from "@tiptap/pm/model";

interface SearchMatchWithNode {
  from: number;
  to: number;
  text: string;
  node: Node; // ProseMirror node
  path: number[]; // Path to the node
}

// Custom type to handle our search function
type SearchFunction = (text: string) => Array<number> | null;

class ProseMirrorSearchTool {
  private editor: Editor;
  private matches: SearchMatchWithNode[] = [];
  private currentMatchIndex: number = -1;
  private searchTerm: string = '';
  private matchCase: boolean = false;
  private searchRegex: boolean = false;
  private decorationClass = 'pm-search-match';
  private activeDecorClass = 'pm-search-match-active';
  private decorations: Array<any> = [];

  constructor(editor: Editor) {
    this.editor = editor;
  }

  // Set search options and perform search
  setSearch(options: { term: string, matchCase?: boolean, regex?: boolean }) {
    this.searchTerm = options.term;
    this.matchCase = options.matchCase ?? false;
    this.searchRegex = options.regex ?? false;
    this.currentMatchIndex = -1;
    this.matches = [];
    
    if (this.searchTerm) {
      this.findMatches();
      if (this.matches.length > 0) {
        this.currentMatchIndex = 0;
      }
      this.updateDecorations();
    } else {
      this.clearDecorations();
    }
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex
    };
  }

  // Clear all search-related decorations
  clearDecorations() {
    if (this.editor) {
      const { state, view } = this.editor;
      
      // Create an empty decoration set and apply it
      const tr = state.tr;
      tr.setMeta('search-decorations', { clear: true });
      view.dispatch(tr);
    }
  }

  // Traverse the ProseMirror document to find text matches
  private findMatches() {
    if (!this.searchTerm || !this.editor) return;
    
    // Get editor state and document
    const { state } = this.editor;
    const { doc } = state;
    
    // Reset matches array
    this.matches = [];

    console.log("🔍 Searching document for:", this.searchTerm);
    
    // DEBUG: Let's get a dump of the document structure to diagnose issues
    const docJSON = doc.toJSON();
    console.log("Document structure:", JSON.stringify(docJSON).substring(0, 200) + "...");
    
    // Get complete document text content for debugging
    const docContent = this.getDocumentText(doc);
    console.log("Document content length:", docContent.length);
    
    if (docContent.length === 0) {
      console.log("WARNING: Document appears to be empty!");
      return;
    }

    // Define search function based on options
    let searchFn: SearchFunction;
    
    // Prepare the search term - simplify for direct string comparison
    const searchTerm = this.matchCase ? this.searchTerm : this.searchTerm.toLowerCase();
    
    if (this.searchRegex) {
      try {
        const flags = this.matchCase ? 'g' : 'gi';
        const regex = new RegExp(this.searchTerm, flags);
        searchFn = (text) => {
          if (!text) return null;
          
          const results: Array<number> = [];
          let match;
          
          // Reset regex before using
          regex.lastIndex = 0;
          
          while ((match = regex.exec(text)) !== null) {
            results.push(match.index);
            
            // Prevent infinite loops
            if (match.index === regex.lastIndex) {
              regex.lastIndex++;
            }
          }
          
          return results.length > 0 ? results : null;
        };
      } catch (e) {
        console.error('Invalid regex pattern:', e);
        return;
      }
    } else {
      // Enhanced string search - optimized for speed, accuracy and reliability
      searchFn = (text) => {
        if (!text) return null;
        
        // Convert both search text and term to lowercase for case-insensitive search
        const searchText = this.matchCase ? text : text.toLowerCase();
        const searchTermForCompare = this.matchCase ? searchTerm : searchTerm.toLowerCase();
        const positions: Array<number> = [];
        
        // For very short search terms, we need to be extra careful with indexing
        if (searchTermForCompare.length === 1) {
          console.log(`Using optimized single-char search for: "${searchTermForCompare}"`);
          // Specialized single-character search (common case)
          for (let i = 0; i < searchText.length; i++) {
            if (searchText[i] === searchTermForCompare) {
              positions.push(i);
            }
          }
        } else {
          // Multi-character search with overlapping match support
          let index = 0;
          let found = -1;
          
          while ((found = searchText.indexOf(searchTermForCompare, index)) !== -1) {
            positions.push(found);
            
            // Move forward to next character to allow for overlapping matches
            // This is important for cases like searching for "aa" in "aaa"
            index = found + 1;
          }
        }
        
        // Log what we found
        if (positions.length > 0) {
          console.log(`Found ${positions.length} matches for "${searchTermForCompare}" in text: "${text.substring(0, 20)}..."`);
        }
        
        return positions.length ? positions : null;
      };
    }

    // Create direct mapping of all text nodes in document
    // This ensures we don't miss any text regardless of nesting or type
    const allTextNodes: {node: Node, pos: number}[] = [];
    
    // Collect all text nodes with a more careful check
    doc.descendants((node, pos) => {
      if (node.isText) {
        // For robust detection, even include empty text nodes
        allTextNodes.push({node, pos});
        
        const text = node.text as string;
        if (text) { 
          // Properly check for match using case sensitivity setting
          const matchFound = this.matchCase 
            ? text.includes(this.searchTerm)
            : text.toLowerCase().includes(this.searchTerm.toLowerCase());
            
          if (matchFound) {
            console.log(`Text node at pos ${pos} contains search term "${this.searchTerm}": "${text}"`);
          }
        }
      }
      return true;
    });
    
    console.log(`Found ${allTextNodes.length} text nodes in document`);
    
    // Early exit if no text nodes found
    if (allTextNodes.length === 0) {
      console.log("WARNING: No text nodes found in document!");
      return;
    }
    
    // CRITICAL: This is a direct debug sanity check to verify
    // that we have all text nodes properly mapped
    if (docContent.length > 0 && allTextNodes.length === 0) {
      console.error("ERROR: Document has content but no text nodes found!");
      
      // As a fallback, try to create one match for the entire content
      // to ensure search at least finds something
      const fullDocPos = searchFn(docContent);
      if (fullDocPos && fullDocPos.length) {
        console.log("Using fallback search method on entire document content");
        // We cannot properly highlight without text nodes, but we can report matches
        this.matches = [{
          from: 0,
          to: this.searchTerm.length,
          text: this.searchTerm,
          node: doc, // Use doc as fallback
          path: []
        }];
      }
      return;
    }
    
    // Process each text node
    allTextNodes.forEach(({node, pos}) => {
      const text = node.text as string;
      
      if (!text || text.length === 0) return;
      
      // Get match positions in this text node
      const positions = searchFn(text);
      
      if (positions && positions.length) {
        console.log(`Found ${positions.length} matches in text node: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        
        // Add each match to our matches array
        positions.forEach(index => {
          let matchLength = this.searchTerm.length;
          
          if (this.searchRegex) {
            // For regex matches, we need to determine actual match length
            try {
              const regexFlags = this.matchCase ? '' : 'i';
              const matchResult = text.substring(index).match(new RegExp(`^(?:${this.searchTerm})`, regexFlags));
              matchLength = matchResult ? matchResult[0].length : this.searchTerm.length;
            } catch (e) {
              console.error('Error calculating regex match length:', e);
              return;
            }
          } else if (!this.matchCase) {
            // For case-insensitive searches, make sure length matches
            matchLength = this.searchTerm.length;
          }
            
          // Ensure match length is valid
          if (matchLength > 0 && index + matchLength <= text.length) {
            const matchText = text.substring(index, index + matchLength);
            
            this.matches.push({
              from: pos + index,
              to: pos + index + matchLength,
              text: matchText,
              node,
              path: []
            });
            
            console.log(`Match added from ${pos + index} to ${pos + index + matchLength}: "${matchText}"`);
          }
        });
      }
    });
    
    // Sort matches by document position
    this.matches.sort((a, b) => a.from - b.from);
    
    console.log(`Total matches found: ${this.matches.length}`);
  }
  
  // Helper to get entire document text for debugging
  private getDocumentText(doc: any): string {
    let text = '';
    let nodeCount = 0;
    let textNodesFound = 0;
    let otherNodeTypes: Record<string, number> = {};
    
    // First log the entire document structure for debugging
    console.log("Document structure ROOT:", doc.type.name);
    
    // More comprehensive node traversal with detailed logging
    doc.descendants((node: any, pos: number) => {
      nodeCount++;
      
      // Keep track of node types we encounter
      const typeName = node.type?.name || 'unknown';
      otherNodeTypes[typeName] = (otherNodeTypes[typeName] || 0) + 1;
      
      if (node.isText) {
        textNodesFound++;
        // Enhanced logging for text nodes with position information
        if (node.text) {
          text += node.text;
          console.log(`Text node at pos ${pos}: "${node.text.substring(0, 50)}${node.text.length > 50 ? '...' : ''}" (${node.text.length} chars)`);
          
          // DEBUG: Check for our search term in each text node
          const searchTerm = this.searchTerm.toLowerCase();
          if (searchTerm && node.text.toLowerCase().includes(searchTerm)) {
            console.log(`🎯 FOUND MATCH in node at pos ${pos}! Search term "${searchTerm}" appears in: "${node.text}"`);
          }
        } else {
          console.log(`Empty text node at pos ${pos}`);
        }
      } else if (typeName === 'paragraph' || typeName === 'heading') {
        // Log content containers that might contain text
        console.log(`${typeName} node at pos ${pos}, content size: ${node.content?.size || 0}`);
      }
      
      return true;
    });
    
    // Log all the node types we found
    console.log(`Node types found:`, otherNodeTypes);
    console.log(`Document stats: ${nodeCount} total nodes, ${textNodesFound} text nodes`);
    
    // Log the first 200 chars of the full text for verification
    if (text.length > 0) {
      console.log(`Full document text (first 200 chars): "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);
    } else {
      console.log(`WARNING: No text content found in document!`);
    }
    
    return text;
  }

  // Update decorations to show search matches
  private updateDecorations() {
    if (!this.editor || this.matches.length === 0) return;
    
    const { state, view } = this.editor;
    
    // Create a transaction to add decorations
    const tr = state.tr;
    
    // Store match information for decoration rendering
    tr.setMeta('search-decorations', {
      matches: this.matches.map(match => ({
        from: match.from,
        to: match.to,
        active: this.matches[this.currentMatchIndex] === match
      }))
    });
    
    view.dispatch(tr);
    
    // Scroll to the active match
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
      this.scrollToMatch(this.currentMatchIndex);
    }
  }

  // Scroll the editor view to show the current match
  private scrollToMatch(index: number) {
    if (!this.editor || index < 0 || index >= this.matches.length) return;
    
    const match = this.matches[index];
    const { view } = this.editor;
    
    // Calculate position in viewport coordinates
    const coords = view.coordsAtPos(match.from);
    
    // Find the editor element
    const editorElement = view.dom.closest('.editor-content') || view.dom;
    
    if (editorElement) {
      const rect = editorElement.getBoundingClientRect();
      const isInView = (
        coords.top >= rect.top &&
        coords.bottom <= rect.bottom
      );
      
      if (!isInView) {
        // Center the match in the viewport
        const middle = (coords.top + coords.bottom) / 2;
        const targetScroll = middle - rect.height / 2;
        
        // Find scrollable container
        let scrollContainer = editorElement as HTMLElement;
        while (
          scrollContainer && 
          (getComputedStyle(scrollContainer).overflowY !== 'auto' && 
           getComputedStyle(scrollContainer).overflowY !== 'scroll')
        ) {
          const parent = scrollContainer.parentElement;
          if (!parent || parent === document.body) break;
          scrollContainer = parent;
        }
        
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: targetScroll - rect.top + scrollContainer.scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }

  // Navigate to the next match
  nextMatch() {
    if (this.matches.length === 0) return null;
    
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.updateDecorations();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex,
      match: this.matches[this.currentMatchIndex]
    };
  }

  // Navigate to the previous match
  previousMatch() {
    if (this.matches.length === 0) return null;
    
    this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    this.updateDecorations();
    
    return {
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex,
      match: this.matches[this.currentMatchIndex]
    };
  }

  // Replace the current match with new text
  replaceCurrentMatch(replaceWith: string) {
    if (this.matches.length === 0 || this.currentMatchIndex < 0) return false;
    
    const match = this.matches[this.currentMatchIndex];
    const { state, view } = this.editor;
    
    // Create text node with replacement text or empty fragment
    const replaceNode = replaceWith ? state.schema.text(replaceWith) : Fragment.empty;
    
    // Create and dispatch the transaction
    const tr = state.tr.replaceWith(
      match.from,
      match.to,
      replaceNode
    );
    
    view.dispatch(tr);
    
    // Re-run search to update matches after replacement
    this.findMatches();
    
    // Adjust current index if needed
    if (this.currentMatchIndex >= this.matches.length) {
      this.currentMatchIndex = Math.max(0, this.matches.length - 1);
    }
    
    this.updateDecorations();
    
    return true;
  }

  // Replace all matches with new text
  replaceAllMatches(replaceWith: string) {
    if (this.matches.length === 0) return 0;
    
    const { state, view } = this.editor;
    let tr = state.tr;
    
    // We need to replace from the end of the document to the beginning
    // to avoid position shifts affecting other replacements
    const sortedMatches = [...this.matches].sort((a, b) => b.from - a.from);
    
    // Create text node with replacement text or empty fragment
    const replaceNode = replaceWith ? state.schema.text(replaceWith) : Fragment.empty;
    
    for (const match of sortedMatches) {
      tr = tr.replaceWith(
        match.from,
        match.to,
        replaceNode
      );
    }
    
    view.dispatch(tr);
    
    // Clear matches after replacing all
    const replacedCount = this.matches.length;
    this.matches = [];
    this.currentMatchIndex = -1;
    this.clearDecorations();
    
    return replacedCount;
  }

  // Get current search state
  getSearchState() {
    return {
      term: this.searchTerm,
      matchCase: this.matchCase,
      regex: this.searchRegex,
      matchCount: this.matches.length,
      currentIndex: this.currentMatchIndex,
      currentMatch: this.currentMatchIndex >= 0 ? this.matches[this.currentMatchIndex] : null
    };
  }
}

// Decorator class factory to add to an editor
export function createProseMirrorSearch(editor: Editor) {
  return new ProseMirrorSearchTool(editor);
}