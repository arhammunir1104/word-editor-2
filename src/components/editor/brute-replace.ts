import { Editor } from "@tiptap/react";

/**
 * Ultra-aggressive brute force replacement that bypasses all TipTap mechanisms.
 * This is a last resort approach for Replace All.
 */
export function bruteForceReplaceAll(
  editor: Editor,
  searchText: string,
  replaceText: string,
  matchCase: boolean = false
): number {
  if (!searchText || !editor) return 0;
  
  console.log('DIRECT REPLACE: Starting with', JSON.stringify(searchText), 'to', JSON.stringify(replaceText));
  
  try {
    // ATOMIC OPERATION 1: Direct HTML replacement - fast and reliable
    console.log("Attempting HTML direct replacement...");
    const html = editor.getHTML();
    
    // Create reliable regex by escaping special characters
    const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(escapedSearch, flags);
    
    // Count matches first
    const matches = (html.match(regex) || []).length;
    console.log(`Found ${matches} matches in HTML`);
    
    if (matches > 0) {
      // Create a copy with all replacements
      const newHtml = html.replace(regex, replaceText);
      
      if (newHtml !== html) {
        // Force content update
        editor.commands.setContent(newHtml, false);
        console.log(`HTML replacement successful: ${matches} occurrences`);
        return matches;
      } else {
        console.log("HTML replacement didn't change content, trying another approach");
      }
    }
    
    // ATOMIC OPERATION 2: Get text content at Prosemirror level
    console.log("Attempting direct DOM node replacement...");
    
    try {
      // Access the DOM directly
      const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
      
      if (editorElement) {
        // Collect all text nodes
        const walker = document.createTreeWalker(
          editorElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const textNodes: Text[] = [];
        let currentNode;
        
        while ((currentNode = walker.nextNode())) {
          textNodes.push(currentNode as Text);
        }
        
        console.log(`Found ${textNodes.length} text nodes in editor`);
        
        // Track replacements
        let replacementCount = 0;
        
        // Process nodes in reverse to avoid position shifts
        for (let i = textNodes.length - 1; i >= 0; i--) {
          const node = textNodes[i];
          const text = node.textContent || "";
          
          // Create appropriate regex
          const nodeRegex = new RegExp(escapedSearch, flags);
          
          // Check if this node contains our search text
          if (nodeRegex.test(text)) {
            // Replace content in this node
            const newText = text.replace(nodeRegex, replaceText);
            node.textContent = newText;
            
            // Count replacements in this node
            const nodeMatches = (text.match(nodeRegex) || []).length;
            replacementCount += nodeMatches;
          }
        }
        
        if (replacementCount > 0) {
          // Set editor content from modified DOM
          const newHtml = editorElement.innerHTML;
          editor.commands.setContent(newHtml, false);
          console.log(`DOM replacement successful: ${replacementCount} occurrences`);
          return replacementCount;
        }
      }
    } catch (domError) {
      console.error("DOM node replacement failed:", domError);
    }
    
    // ATOMIC OPERATION 3: Plain text replacement - guaranteed to work but loses formatting
    console.log("Attempting plain text replacement...");
    const text = editor.getText();
    const textRegex = new RegExp(escapedSearch, flags);
    const textMatches = (text.match(textRegex) || []).length;
    
    if (textMatches > 0) {
      const newText = text.replace(textRegex, replaceText);
      
      // If there's an actual change, apply it
      if (newText !== text) {
        editor.commands.setContent(newText, false);
        console.log(`Text replacement successful: ${textMatches} occurrences`);
        return textMatches;
      }
    }
    
    // ATOMIC OPERATION 4: Use transaction for replacement
    console.log("Attempting transaction replacement...");
    try {
      // Get current state
      const { state, view } = editor;
      
      // Create transaction that replaces all occurrences
      const transaction = state.tr;
      
      // Replace content
      const newContent = editor.getText().replace(new RegExp(escapedSearch, flags), replaceText);
      
      // Set new content
      transaction.replaceWith(0, state.doc.content.size, state.schema.text(newContent));
      
      // Dispatch transaction
      view.dispatch(transaction);
      
      console.log("Transaction replacement completed");
      return textMatches; // Return the count from previous calculation
    } catch (trError) {
      console.error("Transaction replacement failed:", trError);
    }
    
    // If we reach here, no replacement worked
    console.log('No matches found or all replacement methods failed');
    return 0;
  } catch (error) {
    console.error('Error in bruteForceReplaceAll:', error);
    
    // Last resort fallback when everything else fails
    try {
      console.log("Using ultimate fallback...");
      
      // Set focus on editor
      editor.commands.focus();
      
      // Get and replace content without any regex (direct string manipulation)
      const plainText = editor.getText();
      
      // Case insensitive search as last resort
      const lowerSearchText = searchText.toLowerCase();
      const lowerPlainText = plainText.toLowerCase();
      
      // Find all occurrences manually
      const indices: number[] = [];
      let startPos = 0;
      let pos;
      
      while ((pos = lowerPlainText.indexOf(lowerSearchText, startPos)) !== -1) {
        indices.push(pos);
        startPos = pos + lowerSearchText.length;
      }
      
      if (indices.length > 0) {
        // Build new text manually
        let newText = "";
        let lastEnd = 0;
        
        for (const index of indices) {
          // Add text before match
          newText += plainText.substring(lastEnd, index);
          
          // Add replacement
          newText += replaceText;
          
          // Update last position
          lastEnd = index + searchText.length;
        }
        
        // Add remaining text
        newText += plainText.substring(lastEnd);
        
        // Set content
        editor.commands.setContent(newText, false);
        
        console.log(`Ultimate fallback replaced ${indices.length} occurrences`);
        return indices.length;
      }
    } catch (fallbackError) {
      console.error('Even ultimate fallback failed:', fallbackError);
    }
    
    return 0;
  }
}