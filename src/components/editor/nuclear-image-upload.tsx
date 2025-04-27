import React, { useRef, useEffect } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { getGlobalHistoryManager, HistoryManager } from './history-manager';

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    historyManager?: HistoryManager;
    imageKeyHandlersAdded?: boolean;
    imageDeselectHandler?: boolean;
    imageDragHandlersAdded?: boolean;
    autoSelectTimeout?: number;
  }
}

/**
 * Nuclear Image Upload - The Most Direct Possible Approach
 * 
 * This component:
 * 1. Completely bypasses TipTap
 * 2. Directly manipulates the DOM element's innerHTML
 * 3. Uses the most direct, bypass-heavy approach possible
 * 
 * This is THE LAST RESORT when dealing with TipTap's image handling
 */
export default function NuclearImageUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Directly find the editor element using every possible approach
  const findEditorDOM = (): HTMLElement | null => {
    // Approach 1: Try to find by ProseMirror class (most common)
    const proseMirror = document.querySelector('.ProseMirror');
    if (proseMirror instanceof HTMLElement) return proseMirror;
    
    // Approach 2: Find by contenteditable attribute
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    if (editableElements.length > 0) {
      return editableElements[0] as HTMLElement;
    }
    
    // Approach 3: Look for editor container class
    const editorContainer = document.querySelector('.tiptap-editor');
    if (editorContainer instanceof HTMLElement) {
      const editableChild = editorContainer.querySelector('[contenteditable="true"]');
      if (editableChild instanceof HTMLElement) return editableChild;
    }
    
    // Approach 4: Last resort - look for any element with editor-like class names
    const possibleEditors = document.querySelectorAll('.editor, .document-editor, .rich-text-editor');
    if (possibleEditors.length > 0) return possibleEditors[0] as HTMLElement;
    
    return null;
  };
  
  // Generate a unique image ID
  const generateImageId = (): string => {
    return `img-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  };
  
  // ComponentDidMount effect
  useEffect(() => {
    // Set up global drag-and-drop handlers for images
    if (!window.imageDragHandlersAdded) {
      setupGlobalDragHandlers();
      window.imageDragHandlersAdded = true;
    }
    
    return () => {
      // Cleanup only if component is being unmounted completely
      if (document.querySelector('.nuclear-image-upload') === null) {
        cleanupGlobalHandlers();
      }
    };
  }, []);
  
  // Set up global drag and drop handlers
  const setupGlobalDragHandlers = () => {
    console.log('Setting up global drag handlers for images');
    
    // Prevent default drag behavior on the entire document
    document.addEventListener('dragover', (e) => {
      e.preventDefault(); // Prevent default to allow drop
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault(); // Prevent browser from opening the file
      
      // Only handle file drops in the editor
      const editorEl = findEditorDOM();
      if (!editorEl) return;
      
      // Check if drop target is inside the editor
      const dropTarget = e.target as HTMLElement;
      if (!editorEl.contains(dropTarget)) return;
      
      // Handle files
      if (e.dataTransfer?.items) {
        // Use DataTransferItemList interface
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If file is an image
          if (e.dataTransfer.items[i].kind === 'file' && 
              e.dataTransfer.items[i].type.startsWith('image/')) {
            const file = e.dataTransfer.items[i].getAsFile();
            if (file) {
              handleDroppedFile(file);
              break; // Only handle the first image
            }
          }
        }
      } else if (e.dataTransfer?.files) {
        // Use DataTransfer interface
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          if (e.dataTransfer.files[i].type.startsWith('image/')) {
            handleDroppedFile(e.dataTransfer.files[i]);
            break; // Only handle the first image
          }
        }
      }
    });
  };
  
  // Handle a file that was dropped onto the editor
  const handleDroppedFile = (file: File) => {
    // Check if the file is valid
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Only image files can be dropped into the editor',
        variant: 'destructive'
      });
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Please use an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Processing image...',
      description: `Inserting ${file.name}`,
    });
    
    // Read the file and insert it
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const success = insertImageNuclear(dataUrl);
        if (success) {
          toast({
            title: 'Image inserted',
            description: `${file.name} was added to your document`
          });
        }
      }
    };
    reader.onerror = () => {
      toast({
        title: 'Error reading image',
        description: 'Could not process the dropped image',
        variant: 'destructive'
      });
    };
    reader.readAsDataURL(file);
  };
  
  // Clean up any global handlers
  const cleanupGlobalHandlers = () => {
    window.imageKeyHandlersAdded = false;
    window.imageDeselectHandler = false;
    window.imageDragHandlersAdded = false;
  };
  
  // NUCLEAR METHOD: Enhanced to add interactive elements and ID for reference - SIMPLIFIED for better stability
  const insertImageNuclear = (imageUrl: string): boolean => {
    try {
      const originalLog = window.console.log;
      // Get DOM element
      const editorEl = findEditorDOM();
      if (!editorEl) {
        console.error('Could not find editor element for nuclear insertion');
        return false;
      }
      originalLog('Found editor element for insertion');
      
      // Generate unique ID
      const imageId = generateImageId();
      
      // Simpler, more Google Docs-like HTML structure
      const imgHtml = `
        <div class="img-container" data-img-container="${imageId}" style="position: relative; display: inline-block; margin: 10px 0; user-select: none; max-width: 100%;">
          <img 
            src="${imageUrl}" 
            id="${imageId}" 
            data-img-id="${imageId}" 
            style="display: block; max-width: 100%; margin: 0 auto; box-sizing: border-box; border: 1px solid transparent;" 
            alt="Image"
          />
          <div class="img-caption" data-img-caption="${imageId}" style="font-size: 0.9em; color: #555; text-align: center; margin-top: 5px; padding: 2px; min-height: 1em;" contenteditable="true"></div>
        </div>
      `;
      
      // Store original content for undo
      const originalContent = editorEl.innerHTML;
      
      // Find cursor position or selection - we need to insert at that point
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // No selection, just append to the end
        editorEl.innerHTML = originalContent + imgHtml;
      } else {
        // Get range info
        const range = selection.getRangeAt(0);
        const cursorNode = range.startContainer;
        const cursorOffset = range.startOffset;
        
        // If cursor is in a text node inside the editor, we need to split at cursor position
        if (cursorNode.nodeType === Node.TEXT_NODE && editorEl.contains(cursorNode)) {
          // Split text node at cursor position
          const beforeText = cursorNode.textContent?.slice(0, cursorOffset) || '';
          const afterText = cursorNode.textContent?.slice(cursorOffset) || '';
          
          // First, find the parent paragraph or similar element
          let insertParent = cursorNode.parentElement;
          if (!insertParent) {
            editorEl.innerHTML = originalContent + imgHtml;
            return true;
          }
          
          // Get HTML representation before cursor
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(insertParent.cloneNode(true));
          
          // Find same text node in the clone and modify it
          const allTextNodes = Array.from(tempDiv.querySelectorAll('*'))
            .map(el => Array.from(el.childNodes))
            .flat()
            .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent === cursorNode.textContent);
            
          if (allTextNodes.length > 0) {
            allTextNodes[0].textContent = beforeText;
          }
          
          // Insert the image after the modified content
          editorEl.innerHTML = tempDiv.innerHTML + imgHtml + afterText;
        } else {
          // Just use the innerHTML property to insert 
          editorEl.innerHTML = originalContent + imgHtml;
        }
      }
      
      // Try to trigger a change event so TipTap notices the change
      const event = new Event('input', { bubbles: true });
      editorEl.dispatchEvent(event);
      
      // Also try a more native approach
      if ("createEvent" in document) {
        const evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", false, true);
        editorEl.dispatchEvent(evt);
      }
      
      // Add image interaction handlers
      setTimeout(() => {
        setupImageInteractions(imageId);
      }, 100);
      
      // Try to register with undo/redo manager if available
      try {
        // Track with history manager if available
        if (window.historyManager) {
          window.historyManager.addHistoryStep('image-insert');
          console.log('Added image insertion to history stack');
        }
      } catch (err) {
        console.log('Could not register with history manager:', err);
      }
      
      console.log('Enhanced image insertion complete with ID:', imageId);
      return true;
    } catch (error) {
      console.error('Error in enhanced image insertion:', error);
      return false;
    }
  };
  
  // Setup image interactions after insertion
  const setupImageInteractions = (imageId: string) => {
    try {
      // Log for debugging
      const originalLog = window.console.log;
      originalLog(`Setting up interactions for image ${imageId}`);
      
      // Find the image element
      const imageElement = document.getElementById(imageId);
      if (!imageElement) {
        console.error(`Image element with ID ${imageId} not found`);
        return;
      }
      originalLog(`Image element found: ${imageElement.tagName}`);
      
      // Find the container
      const containerElement = document.querySelector(`[data-img-container="${imageId}"]`);
      if (!containerElement) {
        console.error(`Container for image ${imageId} not found`);
        return;
      }
      originalLog(`Container element found: ${containerElement.tagName}`);
      
      // IMPORTANT: Force image to be selectable by ensuring it has the right style
      imageElement.style.cursor = 'pointer';
      imageElement.setAttribute('draggable', 'true');
      
      // We'll add a proper click handler to the cloned element
      
      // First, remove any existing click listeners (clean slate)
      const clone = imageElement.cloneNode(true) as HTMLElement;
      clone.id = imageId;
      
      // Add our guaranteed handler - using addEventListener instead of onclick property
      clone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectImage(imageId);
      });
      
      // Replace the original element with the clone
      if (imageElement.parentNode) {
        imageElement.parentNode.replaceChild(clone, imageElement);
      }
      
      // 2. Set up keyboard navigation for selected image (delete, etc)
      if (!window.imageKeyHandlersAdded) {
        const keyHandler = (e: KeyboardEvent) => {
          const selectedImage = document.querySelector('.selected-image');
          if (selectedImage) {
            originalLog(`Key pressed on selected image: ${e.key}`);
            // Handle DELETE or BACKSPACE to remove the image
            if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault();
              const imgId = selectedImage.getAttribute('data-img-id') || 
                          selectedImage.getAttribute('id');
              if (imgId) {
                deleteImage(imgId);
              }
            }
          }
        };
        
        // Remove any existing handler
        document.removeEventListener('keydown', keyHandler);
        // Add the handler
        document.addEventListener('keydown', keyHandler);
        window.imageKeyHandlersAdded = true;
      }
      
      // 3. Setup global click handler to deselect images (if not already set up)
      if (!window.imageDeselectHandler) {
        const clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          // Don't deselect if clicking on the image, its toolbar or resize handles
          if (target.matches('.selected-image, .img-toolbar *, .img-resize-handle, .img-caption, .img-handle')) {
            return;
          }
          deselectAllImages();
        };
        
        // Remove any existing handler
        document.removeEventListener('click', clickHandler);
        // Add the handler
        document.addEventListener('click', clickHandler);
        window.imageDeselectHandler = true;
      }
      
      // 4. Find our newly cloned image element and set up drag-and-drop for it
      const updatedImageElement = document.getElementById(imageId);
      if (updatedImageElement) {
        setupImageDrag(imageId, updatedImageElement as HTMLImageElement, containerElement as HTMLElement);
      } else {
        originalLog('Updated image element not found for drag setup - using original');
        setupImageDrag(imageId, imageElement as HTMLImageElement, containerElement as HTMLElement);
      }
      
      // 5. Setup caption interactions
      const captionElement = containerElement.querySelector('.img-caption');
      if (captionElement) {
        // Make sure clicking on caption doesn't propagate to parent
        captionElement.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        
        // Track caption changes for undo/redo
        captionElement.addEventListener('input', (e) => {
          try {
            if (window.historyManager) {
              window.historyManager.addHistoryStep('caption-edit');
            }
          } catch (err) {
            originalLog('Could not register caption edit with history manager');
          }
        });
      }
      
      // Force a click on the image to select it initially (only once)
      if (window.autoSelectTimeout) {
        clearTimeout(window.autoSelectTimeout);
      }
      
      window.autoSelectTimeout = window.setTimeout(() => {
        try {
          originalLog(`Attempting to auto-select new image ${imageId}`);
          selectImage(imageId);
        } catch (e) {
          originalLog('Error in auto-select:', e);
        }
      }, 200) as unknown as number;
      
    } catch (error) {
      console.error('Error setting up image interactions:', error);
    }
  };
  
  // Setup dragging functionality for an image
  const setupImageDrag = (imageId: string, imageElement: HTMLImageElement, containerElement: HTMLElement) => {
    try {
      // We need both the image and its container for dragging
      if (!imageElement || !containerElement) return;
      
      // Use dragstart/end for visual feedback during drag
      imageElement.addEventListener('dragstart', (e) => {
        // Select the image when starting to drag
        selectImage(imageId);
        
        // Set dragged data for internal use
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', imageId);
          e.dataTransfer.setData('application/x-image-id', imageId);
          e.dataTransfer.effectAllowed = 'move';
          
          // Create and use a drag ghost
          const ghost = document.createElement('div');
          ghost.style.position = 'absolute';
          ghost.style.top = '-9999px';
          ghost.textContent = 'Moving image...';
          document.body.appendChild(ghost);
          
          e.dataTransfer.setDragImage(ghost, 0, 0);
          
          // Remove ghost after drag
          setTimeout(() => {
            document.body.removeChild(ghost);
          }, 0);
        }
        
        // Add dragging class for visual feedback
        containerElement.classList.add('img-dragging');
        imageElement.style.opacity = '0.6';
      });
      
      // Handle drag end (cleanup)
      imageElement.addEventListener('dragend', (e) => {
        containerElement.classList.remove('img-dragging');
        imageElement.style.opacity = '1';
      });
      
      // Setup the editor to handle image drops
      const editorEl = findEditorDOM();
      if (editorEl) {
        // Allow dropping on elements within the editor
        const handleAllowDrop = (e: DragEvent) => {
          const dt = e.dataTransfer;
          if (dt && dt.types.includes('application/x-image-id')) {
            e.preventDefault(); // Allow drop
            e.stopPropagation();
          }
        };
        
        // Handle image drop between paragraphs or elements
        const handleDrop = (e: DragEvent) => {
          if (!e.dataTransfer) return;
          
          const imageId = e.dataTransfer.getData('application/x-image-id');
          if (!imageId) return;
          
          // Prevent default to avoid file drop handlers
          e.preventDefault();
          e.stopPropagation();
          
          // Find the drop target within the editor
          const dropTarget = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (!dropTarget || !editorEl.contains(dropTarget)) return;
          
          // Get the image container
          const imgContainer = document.querySelector(`[data-img-container="${imageId}"]`);
          if (!imgContainer) return;
          
          // Store pre-move state for undo
          const originalContent = editorEl.innerHTML;
          
          // Remove it from its current location
          imgContainer.remove();
          
          // Find nearest insertion point
          let insertPoint: Node | null = null;
          let insertBefore = false;
          
          // Try to find a good insertion point
          if (dropTarget.tagName === 'P') {
            // If dropping on a paragraph, insert before or after based on position
            const rect = dropTarget.getBoundingClientRect();
            const dropY = e.clientY;
            const threshold = rect.top + (rect.height / 2);
            
            if (dropY < threshold) {
              // Insert before the paragraph
              insertPoint = dropTarget;
              insertBefore = true;
            } else {
              // Insert after the paragraph
              insertPoint = dropTarget.nextSibling;
              insertBefore = true;
            }
          } else if (dropTarget.tagName === 'FIGCAPTION' || dropTarget.tagName === 'IMG') {
            // If dropping on another image or caption, insert after that image's container
            const nearestFigure = dropTarget.closest('figure');
            if (nearestFigure) {
              insertPoint = nearestFigure.nextSibling;
              insertBefore = true;
            }
          } else {
            // Default: just append to editor
            insertPoint = editorEl.lastChild;
            insertBefore = false;
          }
          
          // Insert at the determined position
          if (insertPoint && insertBefore) {
            editorEl.insertBefore(imgContainer, insertPoint);
          } else {
            editorEl.appendChild(imgContainer);
          }
          
          // Trigger editor update
          const changeEvent = new Event('input', { bubbles: true });
          editorEl.dispatchEvent(changeEvent);
          
          // Add to history
          try {
            if (window.historyManager) {
              window.historyManager.addHistoryStep('image-move');
            }
          } catch (err) {
            console.log('Could not register image move with history manager');
          }
        };
        
        // Add event listeners to the editor
        editorEl.addEventListener('dragover', handleAllowDrop);
        editorEl.addEventListener('drop', handleDrop);
      }
    } catch (error) {
      console.error('Error setting up image drag:', error);
    }
  };
  
  // SIMPLIFIED: Google Docs style image selection
  const selectImage = (imageId: string) => {
    try {
      // Get essential elements first
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      if (!imageElement) return;
      
      const containerElement = document.querySelector(`[data-img-container="${imageId}"]`) as HTMLElement;
      if (!containerElement) return;
      
      // First deselect any currently selected images
      deselectAllImages();
      
      // Add selection classes to both elements for CSS targeting
      imageElement.classList.add('selected-image');
      containerElement.classList.add('selected-container');
      
      // Google Docs style: Blue border with some padding
      imageElement.style.border = '1px solid #1a73e8';
      imageElement.style.padding = '1px';
      imageElement.style.boxSizing = 'border-box';
      
      // Create resize handles first (Google Docs style)
      addGoogleDocsStyleResizeHandles(imageId, containerElement);
      
      // Then add the toolbar (Google Docs style - appears below the image)
      addGoogleDocsToolbar(imageId, containerElement);
      
      // Log to history manager for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep('select-image');
      }
      
      // Stop the image from constantly being reselected by removing auto-selection
      clearTimeout(window.autoSelectTimeout);
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };
  
  // Google Docs style resize handles - simpler and more reliable
  const addGoogleDocsStyleResizeHandles = (imageId: string, containerElement: HTMLElement) => {
    try {
      // Get the image
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      if (!imageElement) return;
      
      // First make sure container has position relative
      containerElement.style.position = 'relative';
      
      // Create just the corner handles (Google Docs style)
      const handles = ['se', 'sw', 'ne', 'nw']; // southeast, southwest, etc.
      
      handles.forEach(position => {
        // Remove any existing handles first
        const existingHandle = containerElement.querySelector(`.handle-${position}`);
        if (existingHandle) existingHandle.remove();
        
        // Create a new handle
        const handle = document.createElement('div');
        handle.className = `img-resize-handle handle-${position}`;
        handle.setAttribute('data-position', position);
        handle.setAttribute('data-for-img', imageId);
        
        // Google Docs style: Small white squares with border
        handle.style.position = 'absolute';
        handle.style.width = '8px';
        handle.style.height = '8px';
        handle.style.backgroundColor = 'white';
        handle.style.border = '1px solid #1a73e8';
        handle.style.zIndex = '100';
        
        // Position based on corner
        if (position === 'se') { // Bottom right
          handle.style.bottom = '-4px';
          handle.style.right = '-4px';
          handle.style.cursor = 'nwse-resize';
        } else if (position === 'sw') { // Bottom left
          handle.style.bottom = '-4px';
          handle.style.left = '-4px';
          handle.style.cursor = 'nesw-resize';
        } else if (position === 'ne') { // Top right
          handle.style.top = '-4px';
          handle.style.right = '-4px';
          handle.style.cursor = 'nesw-resize';
        } else if (position === 'nw') { // Top left
          handle.style.top = '-4px';
          handle.style.left = '-4px';
          handle.style.cursor = 'nwse-resize';
        }
        
        // Add resize functionality - simplified GoogleDocs style
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Simpler resize with mouse
          const startWidth = imageElement.offsetWidth;
          const startHeight = imageElement.offsetHeight;
          const startX = e.clientX;
          const startY = e.clientY;
          const aspectRatio = startWidth / startHeight;
          
          // Create overlay to capture mouse events
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.zIndex = '1000';
          overlay.style.cursor = handle.style.cursor;
          document.body.appendChild(overlay);
          
          // Handle mouse move
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            // Calculate new dimensions based on which handle was grabbed
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            if (position === 'se' || position === 'ne') {
              // Right side handles
              newWidth = startWidth + dx;
            } else {
              // Left side handles
              newWidth = startWidth - dx;
            }
            
            // Maintain aspect ratio (Google Docs style)
            newHeight = newWidth / aspectRatio;
            
            // Enforce minimum size
            newWidth = Math.max(newWidth, 50);
            newHeight = Math.max(newHeight, 50);
            
            // Update image size
            imageElement.style.width = `${newWidth}px`;
            imageElement.style.height = `${newHeight}px`;
          };
          
          // Handle mouse up
          const handleMouseUp = () => {
            // Clean up
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.removeChild(overlay);
            
            // Register with history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('image-resize');
            }
            
            // Notify editor of changes
            const editorEl = findEditorDOM();
            if (editorEl) {
              editorEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };
          
          // Add listeners
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        });
        
        // Add handle to container
        containerElement.appendChild(handle);
      });
    } catch (error) {
      console.error('Error adding resize handles:', error);
    }
  };
  
  // Add Google Docs style toolbar (below image)
  const addGoogleDocsToolbar = (imageId: string, containerElement: HTMLElement) => {
    try {
      // Create toolbar element
      const toolbar = document.createElement('div');
      toolbar.className = 'img-toolbar';
      toolbar.setAttribute('data-for-img', imageId);
      
      // Style like Google Docs toolbar - horizontal bar below image
      toolbar.style.position = 'absolute';
      toolbar.style.bottom = '-30px';
      toolbar.style.left = '0';
      toolbar.style.right = '0';
      toolbar.style.display = 'flex';
      toolbar.style.justifyContent = 'center';
      toolbar.style.backgroundColor = 'white';
      toolbar.style.boxShadow = '0 2px 6px rgba(60, 64, 67, 0.15)';
      toolbar.style.borderRadius = '4px';
      toolbar.style.padding = '4px';
      toolbar.style.zIndex = '100';
      
      // Button helper function
      const createToolbarButton = (text: string, onClick: (e: MouseEvent) => void) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'img-toolbar-btn';
        button.style.padding = '4px 8px';
        button.style.margin = '0 2px';
        button.style.border = 'none';
        button.style.backgroundColor = 'transparent';
        button.style.cursor = 'pointer';
        button.style.fontFamily = 'Arial, sans-serif';
        button.style.fontSize = '12px';
        button.style.color = '#444';
        button.style.borderRadius = '4px';
        
        // Google Docs hover effect
        button.addEventListener('mouseenter', () => {
          button.style.backgroundColor = '#f1f3f4';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.backgroundColor = 'transparent';
        });
        
        button.addEventListener('click', onClick);
        return button;
      };
      
      // Add buttons
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      
      // Delete button
      toolbar.appendChild(createToolbarButton('Delete', (e) => {
        e.stopPropagation();
        deleteImage(imageId);
      }));
      
      // Small, Medium, Large buttons
      toolbar.appendChild(createToolbarButton('Small', (e) => {
        e.stopPropagation();
        resizeImage(imageId, '30%');
      }));
      
      toolbar.appendChild(createToolbarButton('Medium', (e) => {
        e.stopPropagation();
        resizeImage(imageId, '60%');
      }));
      
      toolbar.appendChild(createToolbarButton('Large', (e) => {
        e.stopPropagation();
        resizeImage(imageId, '100%');
      }));
      
      // Replace button
      toolbar.appendChild(createToolbarButton('Replace', (e) => {
        e.stopPropagation();
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            document.body.removeChild(input);
            return;
          }
          
          // Read and replace the image
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl && imageElement) {
              // Update image
              imageElement.src = dataUrl;
              
              // Register in history
              if (window.historyManager) {
                window.historyManager.addHistoryStep('image-replace');
              }
              
              toast({
                title: 'Image replaced',
                description: `${file.name} has replaced the previous image`
              });
            }
            document.body.removeChild(input);
          };
          
          reader.readAsDataURL(file);
        };
        
        input.click();
      }));
      
      // Alt text button
      toolbar.appendChild(createToolbarButton('Alt text', (e) => {
        e.stopPropagation();
        
        if (imageElement) {
          const currentAlt = imageElement.alt || '';
          const newAlt = prompt('Enter alt text for this image:', currentAlt);
          if (newAlt !== null) {
            imageElement.alt = newAlt;
            
            // Register in history
            if (window.historyManager) {
              window.historyManager.addHistoryStep('alt-text-change');
            }
          }
        }
      }));
      
      // Add toolbar to container
      containerElement.appendChild(toolbar);
      
    } catch (error) {
      console.error('Error adding image toolbar:', error);
    }
  };
  
  // Deselect all images
  const deselectAllImages = () => {
    try {
      // Remove selection classes
      document.querySelectorAll('.selected-image').forEach(el => {
        el.classList.remove('selected-image');
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.boxShadow = '';
      });
      
      document.querySelectorAll('.selected-container').forEach(el => {
        el.classList.remove('selected-container');
      });
      
      // Remove all toolbars
      document.querySelectorAll('.img-toolbar').forEach(el => {
        el.remove();
      });
      
      // Remove all resize handles
      document.querySelectorAll('.img-resize-handle').forEach(el => {
        el.remove();
      });
    } catch (error) {
      console.error('Error deselecting images:', error);
    }
  };
  
  // Add image toolbar for editing
  const addImageToolbar = (imageId: string, containerElement: HTMLElement) => {
    try {
      // Create toolbar element
      const toolbar = document.createElement('div');
      toolbar.className = 'img-toolbar';
      toolbar.setAttribute('data-for-img', imageId);
      toolbar.style.position = 'absolute';
      toolbar.style.top = '-30px';
      toolbar.style.left = '0';
      toolbar.style.right = '0';
      toolbar.style.display = 'flex';
      toolbar.style.justifyContent = 'center';
      toolbar.style.gap = '5px';
      toolbar.style.zIndex = '100';
      
      // Create toolbar buttons
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'img-toolbar-btn';
      deleteBtn.style.padding = '2px 8px';
      deleteBtn.style.border = 'none';
      deleteBtn.style.backgroundColor = '#f1f3f4';
      deleteBtn.style.borderRadius = '4px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.fontSize = '12px';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteImage(imageId);
      };
      
      // Small size button
      const smallBtn = document.createElement('button');
      smallBtn.textContent = 'Small';
      smallBtn.className = 'img-toolbar-btn';
      smallBtn.style.padding = '2px 8px';
      smallBtn.style.border = 'none';
      smallBtn.style.backgroundColor = '#f1f3f4';
      smallBtn.style.borderRadius = '4px';
      smallBtn.style.cursor = 'pointer';
      smallBtn.style.fontSize = '12px';
      smallBtn.onclick = (e) => {
        e.stopPropagation();
        resizeImage(imageId, '30%');
      };
      
      // Medium size button
      const mediumBtn = document.createElement('button');
      mediumBtn.textContent = 'Medium';
      mediumBtn.className = 'img-toolbar-btn';
      mediumBtn.style.padding = '2px 8px';
      mediumBtn.style.border = 'none';
      mediumBtn.style.backgroundColor = '#f1f3f4';
      mediumBtn.style.borderRadius = '4px';
      mediumBtn.style.cursor = 'pointer';
      mediumBtn.style.fontSize = '12px';
      mediumBtn.onclick = (e) => {
        e.stopPropagation();
        resizeImage(imageId, '60%');
      };
      
      // Large size button
      const largeBtn = document.createElement('button');
      largeBtn.textContent = 'Large';
      largeBtn.className = 'img-toolbar-btn';
      largeBtn.style.padding = '2px 8px';
      largeBtn.style.border = 'none';
      largeBtn.style.backgroundColor = '#f1f3f4';
      largeBtn.style.borderRadius = '4px';
      largeBtn.style.cursor = 'pointer';
      largeBtn.style.fontSize = '12px';
      largeBtn.onclick = (e) => {
        e.stopPropagation();
        resizeImage(imageId, '100%');
      };
      
      // Replace button
      const replaceBtn = document.createElement('button');
      replaceBtn.textContent = 'Replace';
      replaceBtn.className = 'img-toolbar-btn';
      replaceBtn.style.padding = '2px 8px';
      replaceBtn.style.border = 'none';
      replaceBtn.style.backgroundColor = '#f1f3f4';
      replaceBtn.style.borderRadius = '4px';
      replaceBtn.style.cursor = 'pointer';
      replaceBtn.style.fontSize = '12px';
      replaceBtn.onclick = (e) => {
        e.stopPropagation();
        
        // Create a hidden file input to select a new image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        // When file is selected, replace the image
        input.onchange = async (evt) => {
          const file = input.files?.[0];
          if (!file) {
            document.body.removeChild(input);
            return;
          }
          
          // Validate file
          if (!file.type.startsWith('image/')) {
            toast({
              title: 'Invalid file type',
              description: 'Please select an image file',
              variant: 'destructive'
            });
            document.body.removeChild(input);
            return;
          }
          
          // Size validation
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: 'Image too large',
              description: 'Please select an image smaller than 5MB',
              variant: 'destructive'
            });
            document.body.removeChild(input);
            return;
          }
          
          // Read file and replace image
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              // Get current image element
              const imageElement = document.getElementById(imageId) as HTMLImageElement;
              if (imageElement) {
                // Store original for undo
                const originalSrc = imageElement.src;
                
                // Update image source
                imageElement.src = dataUrl;
                
                // Register in history
                try {
                  if (window.historyManager) {
                    window.historyManager.addHistoryStep('image-replace');
                  }
                } catch (err) {
                  console.log('Could not register image replacement with history manager');
                }
                
                toast({
                  title: 'Image replaced',
                  description: `${file.name} has replaced the previous image`
                });
              }
            }
            document.body.removeChild(input);
          };
          
          reader.onerror = () => {
            toast({
              title: 'Error reading file',
              description: 'Could not process the selected image',
              variant: 'destructive'
            });
            document.body.removeChild(input);
          };
          
          reader.readAsDataURL(file);
        };
        
        // Trigger file selection
        input.click();
      };
      
      // Add alt text button
      const altTextBtn = document.createElement('button');
      altTextBtn.textContent = 'Alt Text';
      altTextBtn.className = 'img-toolbar-btn';
      altTextBtn.style.padding = '2px 8px';
      altTextBtn.style.border = 'none';
      altTextBtn.style.backgroundColor = '#f1f3f4';
      altTextBtn.style.borderRadius = '4px';
      altTextBtn.style.cursor = 'pointer';
      altTextBtn.style.fontSize = '12px';
      altTextBtn.onclick = (e) => {
        e.stopPropagation();
        
        // Prompt for alt text
        const imageElement = document.getElementById(imageId) as HTMLImageElement;
        if (imageElement) {
          const currentAlt = imageElement.alt || '';
          const newAlt = prompt('Enter alt text for this image:', currentAlt);
          
          if (newAlt !== null) { // Only update if not cancelled
            const oldAlt = imageElement.alt;
            imageElement.alt = newAlt;
            
            // Register in history
            try {
              if (window.historyManager) {
                window.historyManager.addHistoryStep('alt-text-change');
              }
            } catch (err) {
              console.log('Could not register alt text change with history manager');
            }
          }
        }
      };
      
      // Add buttons to toolbar
      toolbar.appendChild(deleteBtn);
      toolbar.appendChild(smallBtn);
      toolbar.appendChild(mediumBtn);
      toolbar.appendChild(largeBtn);
      toolbar.appendChild(replaceBtn);
      toolbar.appendChild(altTextBtn);
      
      // Add toolbar to container
      containerElement.appendChild(toolbar);
    } catch (error) {
      console.error('Error adding image toolbar:', error);
    }
  };
  
  // Add resize handles to image
  const addResizeHandles = (imageId: string, containerElement: HTMLElement) => {
    try {
      const originalLog = window.console.log;
      originalLog(`Adding resize handles for image ${imageId}`);
      
      // Get the image element
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      if (!imageElement) {
        originalLog(`Image element with ID ${imageId} not found for resize handles`);
        return;
      }
      
      // First, make sure the container has position relative
      containerElement.style.position = 'relative';
      
      // Create resize handles in the corners
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      
      positions.forEach(position => {
        // First remove any existing handle with the same position
        const existingHandle = containerElement.querySelector(`.img-resize-${position}`);
        if (existingHandle) {
          existingHandle.remove();
        }
        
        const handle = document.createElement('div');
        handle.className = `img-resize-handle img-resize-${position}`;
        handle.setAttribute('data-resize-handle', position);
        handle.setAttribute('data-for-img', imageId);
        
        // Style the handle - make them MUCH more visible and touchable
        handle.style.position = 'absolute';
        handle.style.width = '14px';
        handle.style.height = '14px';
        handle.style.backgroundColor = '#1a73e8';
        handle.style.border = '2px solid white';
        handle.style.borderRadius = '50%';
        handle.style.zIndex = '100';
        handle.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        // Add touch events for mobile
        handle.style.touchAction = 'none';
        
        // Position the handle - position them exactly at the corners of the image
        if (position === 'top-left') {
          handle.style.top = '-7px';
          handle.style.left = '-7px';
          handle.style.cursor = 'nwse-resize';
        } else if (position === 'top-right') {
          handle.style.top = '-7px';
          handle.style.right = '-7px';
          handle.style.cursor = 'nesw-resize';
        } else if (position === 'bottom-left') {
          handle.style.bottom = '-7px';
          handle.style.left = '-7px';
          handle.style.cursor = 'nesw-resize';
        } else if (position === 'bottom-right') {
          handle.style.bottom = '-7px';
          handle.style.right = '-7px';
          handle.style.cursor = 'nwse-resize';
        }
        
        // Add hover effect for better UX
        handle.addEventListener('mouseenter', () => {
          handle.style.transform = 'scale(1.2)';
          handle.style.backgroundColor = '#2c85e0';
        });
        
        handle.addEventListener('mouseleave', () => {
          handle.style.transform = 'scale(1)';
          handle.style.backgroundColor = '#1a73e8';
        });
        
        // Add resize functionality
        handle.addEventListener('mousedown', (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          originalLog(`Resize handle ${position} mousedown triggered`);
          
          const startResizing = (evt: MouseEvent) => {
            originalLog(`Starting resize with mouse for ${imageId} using handle ${position}`);
            resizeImageWithMouse(evt, imageId, position);
          };
          
          startResizing(e);
        });
        
        // Also handle touch events for mobile
        handle.addEventListener('touchstart', (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          originalLog(`Resize handle ${position} touchstart triggered`);
          
          if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY
            });
            handle.dispatchEvent(mouseEvent);
          }
        });
        
        // Add handle to container
        containerElement.appendChild(handle);
        originalLog(`Added resize handle ${position} to image ${imageId}`);
      });
    } catch (error) {
      console.error('Error adding resize handles:', error);
    }
  };
  
  // Resize image with mouse dragging
  const resizeImageWithMouse = (startEvent: MouseEvent, imageId: string, handlePosition: string) => {
    try {
      // Get the image element
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      if (!imageElement) return;
      
      // Record starting dimensions and positions
      const startWidth = imageElement.offsetWidth;
      const startHeight = imageElement.offsetHeight;
      const startAspectRatio = startWidth / startHeight;
      const startMouseX = startEvent.clientX;
      const startMouseY = startEvent.clientY;
      
      // Store original size for history
      const originalWidth = imageElement.style.width;
      const originalHeight = imageElement.style.height;
      
      // Create a resize overlay to capture mouse events
      const overlay = document.createElement('div');
      overlay.className = 'img-resize-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.zIndex = '1000';
      overlay.style.cursor = handlePosition.includes('right') ? 'nwse-resize' : 'nesw-resize';
      
      document.body.appendChild(overlay);
      
      // Handle mouse move during resize
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        
        // Calculate the new width based on mouse movement
        let newWidth;
        const dx = e.clientX - startMouseX;
        
        if (handlePosition.includes('right')) {
          newWidth = startWidth + dx;
        } else {
          newWidth = startWidth - dx;
        }
        
        // Enforce minimum size
        newWidth = Math.max(newWidth, 50);
        
        // Calculate new height maintaining aspect ratio
        const newHeight = newWidth / startAspectRatio;
        
        // Apply new dimensions
        imageElement.style.width = `${newWidth}px`;
        imageElement.style.height = `${newHeight}px`;
      };
      
      // Handle mouse up to end resizing
      const handleMouseUp = () => {
        // Remove overlay
        overlay.remove();
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Register with history manager
        try {
          if (window.historyManager) {
            window.historyManager.addHistoryStep('image-resize');
          }
        } catch (err) {
          console.log('Could not register resize with history manager');
        }
        
        // Dispatch input event to notify editor of changes
        const editorEl = findEditorDOM();
        if (editorEl) {
          const inputEvent = new Event('input', { bubbles: true });
          editorEl.dispatchEvent(inputEvent);
        }
      };
      
      // Add listeners for mouse movement and release
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } catch (error) {
      console.error('Error handling image resize:', error);
    }
  };
  
  // Resize image to specific size
  const resizeImage = (imageId: string, size: string) => {
    try {
      // Get the image element
      const imageElement = document.getElementById(imageId) as HTMLImageElement;
      if (!imageElement) return;
      
      // Store original size for history
      const originalSize = imageElement.style.width;
      
      // Set the new size
      imageElement.style.width = size;
      imageElement.style.height = 'auto'; // Maintain aspect ratio
      
      // Register with history manager
      try {
        if (window.historyManager) {
          window.historyManager.addHistoryStep('image-resize');
        }
      } catch (err) {
        console.log('Could not register resize with history manager');
      }
      
      // Dispatch input event to notify editor of changes
      const editorEl = findEditorDOM();
      if (editorEl) {
        const inputEvent = new Event('input', { bubbles: true });
        editorEl.dispatchEvent(inputEvent);
      }
      
      console.log(`Image ${imageId} resized to ${size}`);
    } catch (error) {
      console.error('Error resizing image:', error);
    }
  };
  
  // Delete image
  const deleteImage = (imageId: string) => {
    try {
      // Get container element
      const containerElement = document.querySelector(`[data-img-container="${imageId}"]`);
      if (!containerElement) return;
      
      // Store original editor content for undo
      const editorEl = findEditorDOM();
      if (!editorEl) return;
      
      const originalContent = editorEl.innerHTML;
      
      // Register with history manager before deleting
      try {
        if (window.historyManager) {
          window.historyManager.addHistoryStep('image-delete');
        }
      } catch (err) {
        console.log('Could not register deletion with history manager');
      }
      
      // Now remove the image container
      containerElement.remove();
      
      // Dispatch input event to notify editor of changes
      if (editorEl) {
        const inputEvent = new Event('input', { bubbles: true });
        editorEl.dispatchEvent(inputEvent);
      }
      
      console.log(`Image ${imageId} deleted`);
      
      // Show toast notification
      toast({
        title: 'Image deleted',
        description: 'The image has been removed from your document'
      });
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("Image selected for insertion:", file.name);
    
    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }
    
    // Size validation
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }
    
    // Show processing toast
    toast({
      title: 'Processing image...',
      description: 'Preparing to insert image'
    });
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Try to find a TipTap editor instance from our global reference
      const anyWindow = window as any;
      const editor = anyWindow.tiptapEditor;
      
      if (editor) {
        try {
          console.log("📸 Using insertContent method for image insertion");
          
          // First ensure the editor is focused at the current selection
          editor.commands.focus();
          
          // Insert the image directly using insertContent
          const result = editor.chain()
            .insertContent([
              {
                type: 'image',
                attrs: {
                  src: dataUrl,
                  alt: file.name,
                  title: file.name
                }
              }
            ])
            .run();
            
          console.log("📸 Image inserted with insertContent:", result);
          
          // Apply CSS class to ensure styling
          setTimeout(() => {
            const images = document.querySelectorAll('.ProseMirror img:not(.basic-image)');
            images.forEach(img => {
              img.classList.add('basic-image');
              console.log("📸 Added basic-image class to image");
            });
          }, 100);
          
          toast({
            title: 'Image added successfully',
            description: `${file.name} was inserted into your document`
          });
          
          return;
        } catch (error) {
          console.error("📸 Image insertion with chain method failed:", error);
          
          // Try alternative method
          try {
            console.log("📸 Trying alternative setImage method");
            editor.commands.setImage({ 
              src: dataUrl,
              alt: file.name,
              title: file.name
            });
            
            // Apply CSS class
            setTimeout(() => {
              const images = document.querySelectorAll('.ProseMirror img:not(.basic-image)');
              images.forEach(img => {
                img.classList.add('basic-image');
              });
            }, 100);
            
            toast({
              title: 'Image added successfully',
              description: `${file.name} was inserted using alternative method`
            });
            
            return;
          } catch (innerError) {
            console.error("📸 Alternative image insertion failed:", innerError);
            // Fall through to nuclear method
          }
        }
      }
      
      // Last resort: Fall back to the nuclear method
      console.log("📸 Using last resort nuclear method");
      const success = insertImageNuclear(dataUrl);
      
      if (success) {
        toast({
          title: 'Image inserted (fallback method)',
          description: `${file.name} was inserted into your document`
        });
      } else {
        toast({
          title: 'Failed to insert image',
          description: 'All insertion methods failed. Please try again.',
          variant: 'destructive'
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Could not read the selected image',
        variant: 'destructive'
      });
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle button click
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      // Try to focus the editor first
      const editorEl = findEditorDOM();
      if (editorEl) editorEl.focus();
      
      // Open file dialog
      fileInputRef.current.click();
    }
  };
  
  // Test with a placeholder image
  const insertTestImage = () => {
    // Try to find a TipTap editor instance from our global reference
    const anyWindow = window as any;
    const editor = anyWindow.tiptapEditor;
    const testUrl = 'https://via.placeholder.com/400x200';
    
    if (editor) {
      try {
        console.log("📸 Using insertContent method for test image");
        
        // First ensure the editor is focused
        editor.commands.focus();
        
        // Insert the image directly using insertContent
        const result = editor.chain()
          .insertContent([
            {
              type: 'image',
              attrs: {
                src: testUrl,
                alt: 'Test image',
                title: 'Test image'
              }
            }
          ])
          .run();
          
        console.log("📸 Test image inserted with insertContent:", result);
        
        // Apply CSS class to ensure styling
        setTimeout(() => {
          const images = document.querySelectorAll('.ProseMirror img:not(.basic-image)');
          images.forEach(img => {
            img.classList.add('basic-image');
          });
        }, 100);
        
        toast({
          title: 'Test image added',
          description: 'Test image was inserted successfully'
        });
        
        return;
      } catch (error) {
        console.error("📸 Test image insertion with chain method failed:", error);
        
        // Try alternative method
        try {
          console.log("📸 Trying alternative setImage method for test image");
          editor.commands.setImage({ 
            src: testUrl,
            alt: 'Test image',
            title: 'Test image'
          });
          
          // Apply CSS class
          setTimeout(() => {
            const images = document.querySelectorAll('.ProseMirror img:not(.basic-image)');
            images.forEach(img => {
              img.classList.add('basic-image');
            });
          }, 100);
          
          toast({
            title: 'Test image added',
            description: 'Test image was inserted using alternative method'
          });
          
          return;
        } catch (innerError) {
          console.error("📸 Alternative test image insertion failed:", innerError);
          // Fall through to nuclear method
        }
      }
    }
    
    // Last resort: Fall back to nuclear method
    console.log("📸 Using last resort nuclear method for test image");
    const success = insertImageNuclear(testUrl);
    
    if (success) {
      toast({
        title: 'Test image inserted',
        description: 'Test image was added using fallback method'
      });
    } else {
      toast({
        title: 'Failed to insert test image',
        description: 'All methods failed. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="nuclear-image-upload">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        onDoubleClick={insertTestImage}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}