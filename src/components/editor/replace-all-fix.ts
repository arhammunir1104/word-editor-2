import { Editor } from "@tiptap/react";

interface MatchInfo {
  node: Text;
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * Specialized implementation to fix the Replace All functionality
 * This approach collects all matches first, then performs replacements
 * to avoid DOM modification issues during iteration
 */
export function fixedReplaceAll(
  editor: Editor, 
  searchText: string, 
  replaceText: string, 
  matchCase: boolean = false
): number {
  if (!searchText || !editor) return 0;
  
  console.log('FIXED REPLACE ALL: Starting with', JSON.stringify(searchText), 'to', JSON.stringify(replaceText));
  
  try {
    // Focus editor for reliability
    editor.commands.focus();
    
    // Step 1: Collect all text nodes from the editor
    const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
    if (!editorElement) {
      console.error("Editor element not found");
      return 0;
    }
    
    // Create a TreeWalker to find all text nodes
    const treeWalker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let currentNode: Node | null;
    
    // Collect all text nodes
    while ((currentNode = treeWalker.nextNode())) {
      textNodes.push(currentNode as Text);
    }
    
    console.log(`Found ${textNodes.length} text nodes to examine`);
    
    // Step 2: Find all matches in these text nodes
    const allMatches: MatchInfo[] = [];
    const flags = matchCase ? '' : 'i';
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    textNodes.forEach(node => {
      const nodeText = node.textContent || "";
      
      // Find all matches in this text node
      let match;
      let lastIndex = 0;
      
      // Create a new regex for each node to reset lastIndex
      const nodeRegex = new RegExp(regex);
      
      while ((match = nodeRegex.exec(nodeText)) !== null) {
        allMatches.push({
          node,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          text: match[0]
        });
        
        // Move lastIndex to prevent infinite loop
        lastIndex = match.index + match[0].length;
        if (lastIndex >= nodeText.length) break;
        
        // Manually update lastIndex since we're reusing the regex
        nodeRegex.lastIndex = lastIndex;
      }
    });
    
    console.log(`Found ${allMatches.length} total matches across all text nodes`);
    
    if (allMatches.length === 0) {
      console.log("No matches found");
      return 0;
    }
    
    // Step 3: Process matches in reverse order to avoid position shifts
    // Sort matches in reverse document order
    allMatches.sort((a, b) => {
      // Compare node positions in document first
      const positionDiff = nodePosition(b.node) - nodePosition(a.node);
      if (positionDiff !== 0) return positionDiff;
      
      // If same node, sort by position within node (in reverse)
      return b.startOffset - a.startOffset;
    });
    
    // Step 4: Apply replacements
    let replacementCount = 0;
    
    // Track which nodes have been modified to update editor once
    const modifiedNodes = new Set<Text>();
    
    // Process each match
    for (const match of allMatches) {
      try {
        const nodeText = match.node.textContent || "";
        
        // Create a new text node with the replacement
        const beforeText = nodeText.substring(0, match.startOffset);
        const afterText = nodeText.substring(match.endOffset);
        const newText = beforeText + replaceText + afterText;
        
        // Update the node's content
        match.node.textContent = newText;
        
        // Track this node as modified
        modifiedNodes.add(match.node);
        
        replacementCount++;
      } catch (error) {
        console.error("Error replacing match:", error);
      }
    }
    
    console.log(`Successfully replaced ${replacementCount} matches`);
    
    // Step 5: Take a snapshot of the modified DOM and update editor
    if (replacementCount > 0) {
      const newHtml = editorElement.innerHTML;
      editor.commands.setContent(newHtml, false);
    }
    
    return replacementCount;
  } catch (error) {
    console.error("Error in fixedReplaceAll:", error);
    return 0;
  }
}

// Helper to get a node's position in document order
function nodePosition(node: Node): number {
  let position = 0;
  const docOrder = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ALL,
    null
  );
  
  let current: Node | null;
  while ((current = docOrder.nextNode())) {
    position++;
    if (current === node) return position;
  }
  
  return -1;
}