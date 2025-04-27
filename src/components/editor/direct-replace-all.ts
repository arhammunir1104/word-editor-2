import { Editor } from "@tiptap/react";

/**
 * Direct and aggressive HTML replacement for "Replace All" functionality.
 * This uses the same approach that made the single replace function work.
 */
export function directReplaceAll(
  editor: Editor,
  searchText: string,
  replaceText: string,
  matchCase: boolean = false
): number {
  try {
    console.log(`DIRECT REPLACE ALL: Replacing "${searchText}" with "${replaceText}"`);
    
    if (!searchText) {
      console.error("Search text is empty");
      return 0;
    }
    
    // Focus the editor (important for consistent state)
    editor.commands.focus();
    
    // Store original HTML for backup
    const originalHtml = editor.getHTML();
    
    // APPROACH 1: Direct HTML content replacement
    try {
      // Get the current HTML content
      const html = editor.getHTML();
      
      // Create an appropriate regex pattern
      const flags = matchCase ? 'g' : 'gi';
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, flags);
      
      // Find all matches to count them
      const matches = (html.match(regex) || []).length;
      
      if (matches > 0) {
        // Replace all occurrences
        const newHtml = html.replace(regex, replaceText);
        
        // Apply the changes directly
        editor.commands.setContent(newHtml, false);
        
        console.log(`Successfully replaced ${matches} occurrences using direct HTML approach`);
        return matches;
      } else {
        console.log("No matches found in HTML content");
      }
    } catch (htmlError) {
      console.error("Direct HTML replacement failed:", htmlError);
    }
    
    // APPROACH 2: Direct DOM tree traversal and replacement
    try {
      // Get editor element
      const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
      if (!editorElement) {
        throw new Error("Editor element not found");
      }
      
      // Get all text nodes
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        editorElement, 
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node as Text);
        }
      }
      
      // Track replacements
      let replaceCount = 0;
      
      // Create appropriate regex for search
      const flags = matchCase ? 'g' : 'gi';
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, flags);
      
      // Process nodes in reverse order to avoid position shifting issues
      for (let i = textNodes.length - 1; i >= 0; i--) {
        const node = textNodes[i];
        const text = node.textContent || "";
        
        // If this node contains our search text
        if (matchCase ? text.includes(searchText) : text.toLowerCase().includes(searchText.toLowerCase())) {
          // Replace all occurrences
          const newText = text.replace(regex, replaceText);
          
          // Count replacements
          const nodeMatches = (text.match(regex) || []).length;
          replaceCount += nodeMatches;
          
          // Apply the change to the DOM
          node.textContent = newText;
        }
      }
      
      // If we made replacements, update the editor state from the DOM
      if (replaceCount > 0) {
        // Get modified DOM content
        const newHtml = editorElement.innerHTML;
        
        // Update editor with new content
        editor.commands.setContent(newHtml, false);
        
        console.log(`Successfully replaced ${replaceCount} occurrences using DOM node approach`);
        return replaceCount;
      }
    } catch (domError) {
      console.error("DOM replacement failed:", domError);
    }
    
    // APPROACH 3: Plain text brute force replacement
    try {
      // Get the entire text content
      const plainText = editor.getText();
      
      // Create appropriate regex
      const flags = matchCase ? 'g' : 'gi';
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, flags);
      
      // Count potential matches
      const matches = (plainText.match(regex) || []).length;
      
      if (matches > 0) {
        // Replace all occurrences
        const newText = plainText.replace(regex, replaceText);
        
        // Apply change to editor
        editor.commands.setContent(newText, false);
        
        console.log(`Successfully replaced ${matches} occurrences using plain text approach`);
        return matches;
      }
    } catch (textError) {
      console.error("Plain text replacement failed:", textError);
    }
    
    // If we get here, no replacements were successful
    console.log("No replacements were made");
    return 0;
  } catch (error) {
    console.error("Error in directReplaceAll:", error);
    return 0;
  }
}