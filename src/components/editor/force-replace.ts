import { Editor } from "@tiptap/react";

/**
 * This is a brute force approach to replacing text in the editor.
 * It bypasses TipTap's API and directly manipulates the content.
 */
export function forceReplace(
  editor: Editor,
  searchText: string,
  replaceText: string,
  activeHighlightElementId?: string
): boolean {
  try {
    console.log(`FORCE REPLACE: Replacing "${searchText}" with "${replaceText}"`);
    
    // Get the active element if provided
    let targetElement = null;
    if (activeHighlightElementId) {
      targetElement = document.getElementById(activeHighlightElementId);
      if (targetElement) {
        console.log("Found target element by ID:", activeHighlightElementId);
      }
    }
    
    // Get the editor element
    const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
    if (!editorElement) {
      console.error("Editor element not found");
      return false;
    }
    
    // Save current selection and scroll position
    const savedSelection = saveSelection();
    const scrollTop = window.scrollY;
    
    // Get all text nodes in the editor
    const walkNodes = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode;
    let replaced = false;
    
    // If we have a target element, only replace within that element's parent
    let searchScope = editorElement;
    if (targetElement) {
      // Find closest parent paragraph or other block element
      let parent = targetElement.parentElement;
      while (parent && !["P", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "DIV"].includes(parent.tagName)) {
        parent = parent.parentElement;
      }
      
      if (parent) {
        searchScope = parent;
        console.log("Narrowed search scope to:", parent.tagName);
      }
    }
    
    // Recreate walker with narrowed scope
    const scopedWalker = document.createTreeWalker(
      searchScope,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    // Store a backup of original content
    const originalContent = editor.getHTML();
    
    // First approach: Directly modify a text node with the text
    let textNode: Text | null;
    while ((textNode = scopedWalker.nextNode() as Text | null)) {
      if (!textNode) continue; // Skip if null
      
      const nodeText = textNode.textContent || "";
      if (nodeText.includes(searchText)) {
        console.log("Found text node containing search text:", nodeText);
        
        // Create a new text node with replaced content
        const newText = nodeText.replace(searchText, replaceText);
        const newTextNode = document.createTextNode(newText);
        
        // Replace the old node with the new one
        textNode.parentNode?.replaceChild(newTextNode, textNode);
        
        console.log("Directly replaced node content with:", newText);
        replaced = true;
        break;
      }
    }
    
    // If direct node replacement worked, update editor state to reflect DOM changes
    if (replaced) {
      // Force editor to update from DOM
      const newHtml = editorElement.innerHTML;
      editor.commands.setContent(newHtml, false);
      
      console.log("Updated editor content from DOM changes");
      return true;
    }
    
    // Second approach: Full HTML replacement
    try {
      const html = editor.getHTML();
      // Escape special regex chars in search string
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace the first occurrence only
      const newHtml = html.replace(new RegExp(escapedSearch), replaceText);
      
      if (newHtml !== html) {
        // Update content, preserving cursor if possible
        editor.commands.setContent(newHtml, false);
        console.log("Replaced using HTML content approach");
        return true;
      }
    } catch (htmlError) {
      console.error("HTML replacement failed:", htmlError);
    }
    
    // Third approach: Nuclear option - change all content
    try {
      const plainText = editor.getText();
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newText = plainText.replace(new RegExp(escapedSearch), replaceText);
      
      if (newText !== plainText) {
        // Create completely new HTML with the replacement
        editor.commands.setContent(newText, false);
        console.log("Used nuclear plain text approach");
        return true;
      }
    } catch (nuclearError) {
      console.error("Nuclear approach failed:", nuclearError);
    }
    
    // If we're here, nothing worked. Restore original content
    editor.commands.setContent(originalContent, false);
    console.error("All replacement attempts failed, restored original content");
    
    // Restore selection and scroll position
    if (savedSelection) {
      restoreSelection(savedSelection);
    }
    window.scrollTo(0, scrollTop);
    
    return false;
  } catch (error) {
    console.error("Error in forceReplace:", error);
    return false;
  }
}

/**
 * Replace all occurrences of searchText with replaceText
 */
export function forceReplaceAll(
  editor: Editor,
  searchText: string,
  replaceText: string
): number {
  try {
    console.log(`FORCE REPLACE ALL: Replacing all "${searchText}" with "${replaceText}"`);
    
    if (!searchText) {
      console.error("Search text is empty");
      return 0;
    }
    
    // Save current state for undo
    const originalContent = editor.getHTML();
    
    // Try different approaches
    
    // Approach 1: HTML replacement (most reliable for preserving formatting)
    try {
      const html = editor.getHTML();
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Global replacement with regex
      const regex = new RegExp(escapedSearch, 'g');
      const newHtml = html.replace(regex, replaceText);
      
      // Count matches
      const matches = (html.match(regex) || []).length;
      
      if (newHtml !== html) {
        editor.commands.setContent(newHtml, false);
        console.log(`Replaced ${matches} occurrences using HTML approach`);
        return matches;
      }
    } catch (htmlError) {
      console.error("HTML replacement failed:", htmlError);
    }
    
    // Approach 2: Direct DOM manipulation
    try {
      let replaceCount = 0;
      const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
      
      // Get all text nodes
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        editorElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentNode: Node | null;
      while ((currentNode = walker.nextNode())) {
        if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
          textNodes.push(currentNode as Text);
        }
      }
      
      // Process in reverse order to avoid shifting indices
      for (let i = textNodes.length - 1; i >= 0; i--) {
        const node = textNodes[i];
        const text = node.textContent || "";
        
        if (text.includes(searchText)) {
          // Replace all occurrences in this node
          const newText = text.replace(new RegExp(searchText, 'g'), replaceText);
          node.textContent = newText;
          
          // Count replacements in this node
          const matches = (text.match(new RegExp(searchText, 'g')) || []).length;
          replaceCount += matches;
        }
      }
      
      if (replaceCount > 0) {
        // Update editor content from modified DOM
        const newHtml = editorElement.innerHTML;
        editor.commands.setContent(newHtml, false);
        console.log(`Replaced ${replaceCount} occurrences using DOM approach`);
        return replaceCount;
      }
    } catch (domError) {
      console.error("DOM replacement failed:", domError);
    }
    
    // Approach 3: Plain text replacement (nuclear option)
    try {
      const text = editor.getText();
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'g');
      const newText = text.replace(regex, replaceText);
      
      // Count matches
      const matches = (text.match(regex) || []).length;
      
      if (newText !== text && matches > 0) {
        editor.commands.setContent(newText, false);
        console.log(`Replaced ${matches} occurrences using plain text approach`);
        return matches;
      }
    } catch (textError) {
      console.error("Plain text replacement failed:", textError);
    }
    
    console.log("No replacements made");
    return 0;
  } catch (error) {
    console.error("Error in forceReplaceAll:", error);
    return 0;
  }
}

// Helper functions to save and restore selection
function saveSelection() {
  if (window.getSelection) {
    const sel = window.getSelection();
    if (sel && sel.getRangeAt && sel.rangeCount) {
      return sel.getRangeAt(0).cloneRange();
    }
  }
  return null;
}

function restoreSelection(range: Range) {
  if (window.getSelection) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}