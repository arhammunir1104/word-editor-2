/**
 * Super Direct Image Insertion
 * 
 * This module provides a direct DOM manipulation approach to insert images
 * that bypasses TipTap's standard mechanisms. It's based on our successful
 * red box implementation that worked reliably.
 * 
 * Enhanced with support for Google Docs-style functionality:
 * - Image selection
 * - Resize, rotate and drag
 * - Wrapping modes
 */

import { initImageInteractive } from './image-interactive';

/**
 * Function to insert an image directly into the DOM at the current cursor position
 * This approach avoids using TipTap's commands which appear to be failing
 */
export function insertImageSuperDirect(imageUrl: string): boolean {
  try {
    // Ultra aggressive approach to insert the image
    
    // 1. First try to find all possible editor elements
    const editorElements = document.querySelectorAll('.ProseMirror, .page-content');
    if (!editorElements.length) {
      console.error('Could not find any editor elements');
      return false;
    }
    
    // Create a unique ID for the image
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create image element directly
    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    imageElement.id = imageId;
    imageElement.className = 'super-direct-image';
    imageElement.alt = 'Image';
    imageElement.style.maxWidth = '90%';
    imageElement.style.height = 'auto';
    imageElement.style.display = 'block';
    imageElement.style.margin = '10px auto';
    imageElement.style.borderRadius = '2px';
    
    // Flag to track if we've successfully inserted the image
    let inserted = false;
    
    // Approach 1: Try to get the active editor element through selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Find the active editor containing the selection
      let activeEditor = null;
      const node = range.commonAncestorContainer;
      let currentNode: Node | null = node;
      
      // Find closest editor element
      while (currentNode && !activeEditor) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const element = currentNode as Element;
          if (element.classList.contains('ProseMirror')) {
            activeEditor = element;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }
      
      // If we found an active editor, insert there
      if (activeEditor) {
        // Create a container for our image with proper styling
        const imageContainer = document.createElement('div');
        imageContainer.className = 'super-direct-image-container';
        imageContainer.setAttribute('contenteditable', 'false');
        imageContainer.style.textAlign = 'center';
        imageContainer.style.margin = '10px 0';
        imageContainer.style.position = 'relative';
        imageContainer.appendChild(imageElement);
        
        // Create a paragraph after the image for proper spacing
        const paragraph = document.createElement('p');
        paragraph.innerHTML = '<br>';
        
        // Insert at cursor position
        range.deleteContents();
        range.insertNode(paragraph); // Insert paragraph first
        range.insertNode(imageContainer); // Then insert image before it
        
        // Move cursor after the inserted content
        range.setStartAfter(paragraph);
        range.setEndAfter(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('Image inserted successfully at cursor position');
        inserted = true;
        
        // Initialize interactive behavior
        setTimeout(() => {
          initImageInteractive(imageId);
          
          // Trigger an event for newly inserted image (for controls to initialize)
          document.dispatchEvent(new CustomEvent('image:inserted', {
            detail: { id: imageId }
          }));
        }, 100);
      }
    }
    
    // Approach 2: If we couldn't insert via selection, try all available editors
    if (!inserted) {
      // Try to find the active editor (one that's likely to have focus)
      const activeEditors = Array.from(editorElements).filter(elem => {
        const rect = (elem as Element).getBoundingClientRect();
        // Consider visible editors with some height
        return rect.height > 0 && window.getComputedStyle(elem as Element).display !== 'none';
      });
      
      if (activeEditors.length > 0) {
        // Use the first visible editor
        const targetEditor = activeEditors[0] as HTMLElement;
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'super-direct-image-container';
        imageContainer.setAttribute('contenteditable', 'false');
        imageContainer.style.textAlign = 'center';
        imageContainer.style.margin = '10px 0';
        imageContainer.style.position = 'relative';
        imageContainer.appendChild(imageElement);
        
        // Add paragraph for spacing
        const paragraph = document.createElement('p');
        paragraph.innerHTML = '<br>';
        
        // Insert at the beginning of the editor
        const firstParagraph = targetEditor.querySelector('p');
        if (firstParagraph) {
          // Insert before the first paragraph
          firstParagraph.parentNode?.insertBefore(imageContainer, firstParagraph);
          firstParagraph.parentNode?.insertBefore(paragraph, firstParagraph);
        } else {
          // Or just append to the editor
          targetEditor.appendChild(imageContainer);
          targetEditor.appendChild(paragraph);
        }
        
        console.log('Image inserted into visible editor');
        inserted = true;
        
        // Initialize interactive behavior
        setTimeout(() => {
          initImageInteractive(imageId);
          
          // Trigger an event for newly inserted image (for controls to initialize)
          document.dispatchEvent(new CustomEvent('image:inserted', {
            detail: { id: imageId }
          }));
        }, 100);
        
        // Trigger an input event to notify TipTap of changes
        const inputEvent = new InputEvent('input', { bubbles: true });
        targetEditor.dispatchEvent(inputEvent);
      }
    }
    
    // Approach 3: Super aggressive - insert into ALL editor elements
    if (!inserted) {
      editorElements.forEach((editor, index) => {
        // Create a new image for each editor (with new unique ID)
        const thisImageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
        const clonedImage = imageElement.cloneNode(true) as HTMLImageElement;
        clonedImage.id = thisImageId;
        
        // Create container
        const container = document.createElement('div');
        container.className = 'image-container image-inline';
        container.setAttribute('contenteditable', 'false');
        container.style.textAlign = 'center';
        container.style.margin = '10px 0';
        container.style.position = 'relative';
        container.appendChild(clonedImage);
        
        // Add as first child
        if (editor.firstChild) {
          editor.insertBefore(container, editor.firstChild);
        } else {
          editor.appendChild(container);
        }
        
        console.log(`Inserted image into editor #${index}`);
        inserted = true;
        
        // Trigger event to notify TipTap
        const inputEvent = new InputEvent('input', { bubbles: true });
        editor.dispatchEvent(inputEvent);
      });
    }
    
    // Final nuclear approach - use document.execCommand as last resort
    if (!inserted && document.queryCommandSupported('insertImage')) {
      // Focus the first editor
      const firstEditor = editorElements[0] as HTMLElement;
      firstEditor.focus();
      
      // Try execCommand
      const success = document.execCommand('insertImage', false, imageUrl);
      if (success) {
        console.log('Image inserted using execCommand as last resort');
        inserted = true;
      }
    }
    
    return inserted;
  } catch (error) {
    console.error('Error in super direct image insertion:', error);
    return false;
  }
}

/**
 * Function to insert an image using a fallback nested paragraph approach
 * This creates a special paragraph container with the image inside
 */
export function insertImageWithParagraph(imageUrl: string): boolean {
  try {
    // Find the editor DOM element
    const editorElement = document.querySelector('.ProseMirror');
    if (!editorElement) {
      console.error('Could not find ProseMirror editor element');
      return false;
    }
    
    // Focus the editor
    (editorElement as HTMLElement).focus();
    
    // Create a unique ID for the image
    const imageId = `img-${Date.now()}`;
    
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    // Get the current paragraph or create a new one
    const range = selection.getRangeAt(0);
    let paragraph: Node | null = range.startContainer;
    
    // Navigate up to find a paragraph node
    while (paragraph && paragraph.nodeName !== 'P' && paragraph !== editorElement) {
      paragraph = paragraph.parentNode as Node | null;
    }
    
    // If we didn't find a paragraph, insert at the current position
    if (!paragraph || paragraph === editorElement) {
      // Create a new image element
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.id = imageId;
      imgElement.className = 'super-direct-image';
      imgElement.style.maxWidth = '90%';
      imgElement.style.height = 'auto';
      imgElement.style.display = 'block';
      imgElement.style.margin = '10px auto';
      imgElement.style.borderRadius = '2px';
      
      // Insert the image at current range
      range.deleteContents();
      range.insertNode(imgElement);
      
      // Move selection after the image
      range.setStartAfter(imgElement);
      range.setEndAfter(imgElement);
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    }
    
    // Create a new image HTML structure
    const newParagraph = document.createElement('p');
    newParagraph.className = 'image-paragraph';
    newParagraph.innerHTML = `
      <img 
        src="${imageUrl}" 
        id="${imageId}" 
        class="super-direct-image" 
        style="max-width: 90%; height: auto; display: block; margin: 10px auto; border-radius: 2px;" 
      />
    `;
    
    // Insert the new paragraph after the current one
    if (paragraph.parentNode) {
      paragraph.parentNode.insertBefore(newParagraph, paragraph.nextSibling);
      
      // Dispatch an input event to notify TipTap of the change
      const inputEvent = new InputEvent('input', { bubbles: true });
      editorElement.dispatchEvent(inputEvent);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in image insertion with paragraph:', error);
    return false;
  }
}