import { Editor } from "@tiptap/react";

/**
 * Ultra-simple and reliable implementation of Replace All
 * Enhanced version that works across multiple pages/editors by finding all editor elements
 * and carefully handling DOM state between replacements
 */
export function ultraSimpleReplaceAll(
  editor: Editor,
  searchText: string,
  replaceText: string,
  matchCase = false
): number {
  if (!searchText || !editor) return 0;
  
  try {
    console.log("Running enhanced multi-page replace all for:", searchText);
    
    // Find all editor instances on the page (for multi-page documents)
    const editorElements = document.querySelectorAll(".ProseMirror");
    console.log(`Found ${editorElements.length} editor instances for multi-page replace`);
    
    if (editorElements.length === 0) {
      return 0;
    }
    
    // Add a history step for undo/redo functionality
    if (window.historyManager) {
      window.historyManager.addHistoryStep("ultra-simple-replace-all");
    }
    
    // Prepare regex
    const escapeRegex = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(escapeRegex(searchText), flags);
    
    // Track total replacements
    let totalReplacements = 0;
    
    // APPROACH 1: Direct DOM manipulation at the HTML level
    try {
      // Process each editor instance (page)
      editorElements.forEach((editorElement, index) => {
        try {
          // Get HTML content of this specific editor instance
          const html = editorElement.innerHTML;
          
          // Count matches in this editor instance
          const matches = (html.match(regex) || []).length;
          
          if (matches > 0) {
            console.log(`Found ${matches} matches in editor instance ${index}`);
            
            // Replace all occurrences at once
            const newHtml = html.replace(regex, replaceText);
            
            // Only update if there were actual changes
            if (newHtml !== html) {
              // Update this editor instance's content
              editorElement.innerHTML = newHtml;
              
              // Track replacements
              totalReplacements += matches;
            }
          }
        } catch (pageError) {
          console.error(`Error processing editor instance ${index}:`, pageError);
        }
      });
      
      // If DOM approach worked, ensure the editor state is updated
      if (totalReplacements > 0) {
        // Give a small delay to allow DOM changes to complete
        setTimeout(() => {
          try {
            // Focus each editor instance briefly to ensure changes are recognized
            editorElements.forEach((editorElement, index) => {
              try {
                // Briefly focus this editor to ensure changes are recognized
                (editorElement as HTMLElement).focus();
                
                // If this is the main editor (first one), update its state
                if (index === 0) {
                  // Force editor to recognize content changes
                  const currentHTML = editor.getHTML();
                  editor.commands.setContent(currentHTML, false);
                }
              } catch (focusError) {
                console.error(`Error focusing editor ${index}:`, focusError);
              }
            });
            
            console.log(`Updated editor state after ${totalReplacements} replacements`);
          } catch (updateError) {
            console.error("Error updating editor state:", updateError);
          }
        }, 50);
        
        return totalReplacements;
      }
    } catch (domError) {
      console.error("Error in DOM manipulation approach:", domError);
    }
    
    // APPROACH 2: Manual content setting with direct TipTap commands
    try {
      if (totalReplacements === 0) {
        console.log("Trying direct content setting approach");
        
        // First store the main editor's full content
        const mainContent = editor.getHTML();
        
        // Process this content directly
        const safePattern = escapeRegex(searchText);
        const newContent = mainContent.replace(new RegExp(safePattern, flags), replaceText);
        
        // If content changed, set it
        if (newContent !== mainContent) {
          // Count replacements
          const count = (mainContent.match(new RegExp(safePattern, 'g')) || []).length;
          
          // Set the new content
          editor.commands.setContent(newContent, false);
          
          console.log(`Replaced ${count} matches using content setting approach`);
          return count;
        }
      }
    } catch (contentError) {
      console.error("Error in content setting approach:", contentError);
    }
    
    return totalReplacements;
  } catch (error) {
    console.error("Error in ultraSimpleReplaceAll:", error);
    return 0;
  }
}