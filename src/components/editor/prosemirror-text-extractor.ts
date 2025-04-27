/**
 * PROSEMIRROR TEXT EXTRACTOR
 * 
 * Specialized utility to properly extract text content from ProseMirror's
 * complex node structure, which is essential for proper search functionality.
 */

import { Editor } from '@tiptap/core';
import { Node } from 'prosemirror-model';

interface TextNode {
  text: string;
  pos: number;
  node: Node;
  // Using Node | undefined to avoid null type issues
  parent?: Node;
}

export class ProseMirrorTextExtractor {
  /**
   * Extract all text nodes from the ProseMirror document
   * with their positions and parent context
   */
  static extractTextNodes(editor: Editor): TextNode[] {
    const nodes: TextNode[] = [];
    const doc = editor.state.doc;
    
    // Process all nodes recursively to find text nodes
    doc.descendants((node, pos, parent) => {
      if (node.isText && node.text) {
        nodes.push({
          text: node.text,
          pos,
          node,
          // Convert parent from null to undefined if needed to satisfy TypeScript
          parent: parent === null ? undefined : parent
        });
      }
      
      return true; // Keep traversing
    });
    
    return nodes;
  }
  
  /**
   * Extract flat text content from the document with position mapping
   */
  static extractTextContent(editor: Editor): { text: string, posMap: Map<number, number> } {
    let text = '';
    const posMap = new Map<number, number>(); // Maps flat text position to ProseMirror position
    
    const textNodes = this.extractTextNodes(editor);
    
    for (const node of textNodes) {
      const startFlatPos = text.length;
      text += node.text;
      
      // Create mapping for each character position
      for (let i = 0; i < node.text.length; i++) {
        posMap.set(startFlatPos + i, node.pos + i);
      }
    }
    
    return { text, posMap };
  }
  
  /**
   * Deep recursive traversal to print the entire document node structure
   * Useful for debugging complex documents
   */
  static debugDocumentStructure(editor: Editor): void {
    const doc = editor.state.doc;
    
    console.group('Document Structure:');
    this._debugNode(doc, 0);
    console.groupEnd();
  }
  
  /**
   * Recursive helper for document structure debugging
   */
  private static _debugNode(node: Node, depth: number, pos = 0): void {
    const indent = '  '.repeat(depth);
    let info = `${indent}${node.type.name}`;
    
    if (node.isText && node.text) {
      info += ` [pos: ${pos}]: "${node.text}"`;
    } else {
      info += ` [pos: ${pos}] (${node.childCount} children)`;
      
      // Add attributes if any
      if (Object.keys(node.attrs).length > 0) {
        info += ` attrs: ${JSON.stringify(node.attrs)}`;
      }
    }
    
    console.log(info);
    
    if (!node.isText) {
      let childPos = pos + 1; // Add 1 for the node itself
      node.forEach((child, offset) => {
        this._debugNode(child, depth + 1, childPos);
        childPos += child.nodeSize;
      });
    }
  }
  
  /**
   * Find all matches of a search term in the document
   */
  static findMatches(editor: Editor, searchTerm: string, caseSensitive: boolean = false): {
    matches: { from: number, to: number, text: string }[];
    flatText: string;
  } {
    if (!searchTerm) {
      return { matches: [], flatText: '' };
    }
    
    // Get the full text content and position mapping
    const { text: flatText, posMap } = this.extractTextContent(editor);
    
    // Prepare search terms
    const searchText = caseSensitive ? flatText : flatText.toLowerCase();
    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    // Find all matches
    const matches: { from: number, to: number, text: string }[] = [];
    let pos = 0;
    
    while ((pos = searchText.indexOf(term, pos)) !== -1) {
      // Get the actual positions in the ProseMirror document
      const from = posMap.get(pos);
      const to = posMap.get(pos + term.length - 1);
      
      if (from !== undefined && to !== undefined) {
        matches.push({
          from,
          to: to + 1, // Add 1 for inclusive range
          text: flatText.substring(pos, pos + term.length)
        });
      }
      
      pos += term.length;
    }
    
    return { matches, flatText };
  }
  
  /**
   * Find all paragraph nodes in the document
   */
  static findParagraphNodes(editor: Editor): { node: Node, pos: number }[] {
    const result: { node: Node, pos: number }[] = [];
    const doc = editor.state.doc;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || 
          node.type.name === 'heading') {
        result.push({ node, pos });
      }
      return true;
    });
    
    return result;
  }
  
  /**
   * Find the containing block node (paragraph, heading, etc.)
   * for a given position
   */
  static findContainingBlock(editor: Editor, pos: number): { node: Node, from: number, to: number } | null {
    try {
      const $pos = editor.state.doc.resolve(pos);
      
      // Look for block parents
      for (let depth = $pos.depth; depth >= 0; depth--) {
        const node = $pos.node(depth);
        const blockTypes = ['paragraph', 'heading', 'listItem', 'blockquote'];
        
        if (blockTypes.includes(node.type.name)) {
          const from = $pos.start(depth);
          const to = $pos.end(depth);
          return { node, from, to };
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error finding containing block:', e);
      return null;
    }
  }
}

/**
 * Utility function to search throughout the editor
 */
export function findAllMatches(editor: Editor, searchTerm: string, caseSensitive: boolean = false) {
  return ProseMirrorTextExtractor.findMatches(editor, searchTerm, caseSensitive);
}

/**
 * Debug the document structure - helpful for troubleshooting
 */
export function debugEditorContent(editor: Editor) {
  ProseMirrorTextExtractor.debugDocumentStructure(editor);
  
  // Also extract and log flat text
  const { text } = ProseMirrorTextExtractor.extractTextContent(editor);
  console.log('Extracted full text:', text);
}