/**
 * Direct Image Insertion
 * 
 * This module provides functions to directly insert images into the editor
 * using low-level DOM manipulation that bypasses TipTap's normal processes
 * 
 * It's based on the approach that worked in previous editor implementations
 */

/**
 * Inserts an image at the current cursor position or selection
 * This bypasses TipTap and directly modifies the DOM
 */
export function insertImageDirectly(dataUrl: string) {
  try {
    // First try the standard execCommand approach (works in most browsers)
    const success = document.execCommand('insertImage', false, dataUrl);
    console.log(`Direct image insertion with execCommand: ${success ? 'Success' : 'Failed'}`);
    
    if (!success) {
      // Fallback: Manual DOM insertion
      fallbackInsertImage(dataUrl);
    }
    
    return true;
  } catch (error) {
    console.error('Error inserting image directly:', error);
    
    // Try fallback method
    return fallbackInsertImage(dataUrl);
  }
}

/**
 * Fallback method that manually creates an img element and inserts it
 * at the current selection point
 */
function fallbackInsertImage(dataUrl: string): boolean {
  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.error('No selection found for fallback image insertion');
      return false;
    }
    
    // Get the current range
    const range = selection.getRangeAt(0);
    
    // Create an image element
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    
    // Insert the image
    range.deleteContents();
    range.insertNode(img);
    
    // Move cursor after the image
    range.setStartAfter(img);
    range.setEndAfter(img);
    selection.removeAllRanges();
    selection.addRange(range);
    
    console.log('Fallback image insertion: Success');
    return true;
  } catch (error) {
    console.error('Error in fallback image insertion:', error);
    return false;
  }
}

/**
 * Helper function that finds the TipTap editor DOM element
 * to ensure image insertion works correctly 
 */
export function focusEditor() {
  // Try to find TipTap editor by its common class
  const tiptapEditor = document.querySelector('.ProseMirror');
  
  if (tiptapEditor && tiptapEditor instanceof HTMLElement) {
    // Focus the editor element first
    tiptapEditor.focus();
    console.log('TipTap editor focused for image insertion');
    return true;
  }
  
  console.warn('Could not find TipTap editor element');
  return false;
}

/**
 * Complete function that handles everything needed for image insertion
 */
export function insertImageComplete(dataUrl: string): boolean {
  // First focus the editor to ensure proper insertion context
  const focused = focusEditor();
  
  if (!focused) {
    console.warn('Failed to focus editor, attempting image insertion anyway');
  }
  
  // Insert the image
  return insertImageDirectly(dataUrl);
}