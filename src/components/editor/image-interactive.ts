/**
 * Image Interactive Module
 * 
 * This module provides functionality to make images interactive within the editor:
 * - Click to select
 * - Resize with handles
 * - Rotate with rotation handle
 * - Drag to move (in wrap mode)
 * - Set wrapping mode
 * - Multiple image selection support
 */

// Track the currently selected images
let selectedImageId: string | null = null;
let selectedImages: Set<string> = new Set();
let isResizing = false;
let isRotating = false;
let isDragging = false;
let originalWidth = 0;
let originalHeight = 0;
let originalRotation = 0;
let startX = 0;
let startY = 0;
let resizeDirection = '';
let lastMouseX = 0;
let lastMouseY = 0;
let centerX = 0;
let centerY = 0;

// Store original transform state for undo-redo history
let originalTransform = '';

/**
 * Set up global image handlers to detect and initialize images
 * This function sets up a global click handler to detect clicks on images
 * and also periodically scans for new images that need to be initialized
 */
export function setupGlobalImageHandlers() {
  console.log('Setting up global image handlers for Google Docs-style functionality');
  
  // Add a global click handler to capture clicks on any image
  document.addEventListener('click', (event) => {
    // Find if a click was on or inside an image
    let target = event.target as HTMLElement;
    
    // Check if the click was on an image
    if (target.tagName === 'IMG' || target.classList.contains('image-container')) {
      // Find the actual image element
      const imageElement = target.tagName === 'IMG' ? 
        target as HTMLImageElement : 
        target.querySelector('img');
      
      if (imageElement && imageElement.id) {
        console.log('Clicked on image:', imageElement.id);
        
        // If the image doesn't have resize handles, initialize it
        const container = imageElement.closest('.image-container');
        const hasHandles = container?.querySelector('.resize-handle');
        
        if (!hasHandles) {
          console.log('Initializing image interactive behavior');
          initImageInteractive(imageElement.id);
        }
        
        // Select the image (this will trigger the event listener in the image)
        selectImage(imageElement.id, (event as MouseEvent).shiftKey);
        
        // Prevent default to avoid text selection
        event.preventDefault();
        event.stopPropagation();
      }
    } else if (!target.closest('.image-controls') && !target.closest('.floating-image-toolbar')) {
      // If clicked outside images and image controls, deselect all
      _deselectAllImages();
    }
  });
  
  // Periodically scan for images that need initialization
  setInterval(() => {
    const images = document.querySelectorAll('img');
    images.forEach(image => {
      // Skip images that already have an ID and are initialized
      if (image.id && image.classList.contains('super-direct-image')) {
        return;
      }
      
      // Generate ID for images without one
      if (!image.id) {
        image.id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Initialize image if not already done
      initImageInteractive(image.id);
    });
  }, 1000); // Check every second
  
  // Also set up handlers for images that are moved by drag and drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow drop
  });
  
  document.addEventListener('drop', (e) => {
    // If dropping on or near an image, prevent default
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' || target.closest('.image-container')) {
      e.preventDefault();
    }
  });
}

/**
 * Deselect all images - internal function
 */
function _deselectAllImages() {
  // Find all selected images and deselect them
  document.querySelectorAll('.image-selected, .multi-image-selected').forEach(image => {
    if (image instanceof HTMLElement && image.id) {
      deselectImage(image.id);
    }
  });
  
  // Clear selection tracking
  selectedImageId = null;
  selectedImages.clear();
  
  // Fire deselection event
  document.dispatchEvent(new CustomEvent('image:deselected', {
    detail: { id: null }
  }));
}

/**
 * Initialize interactive behavior for an image
 */
export function initImageInteractive(imageId: string) {
  const imageElement = document.getElementById(imageId) as HTMLImageElement;
  if (!imageElement) return;

  // Make sure the image has proper interactive styling
  imageElement.classList.add('super-direct-image');
  
  // Ensure image has an .image-container parent for proper handling
  let container = imageElement.closest('.image-container');
  if (!container) {
    // Create a container and wrap the image
    container = document.createElement('div');
    container.className = 'image-container image-inline';
    imageElement.parentNode?.insertBefore(container, imageElement);
    container.appendChild(imageElement);
  }
  
  // Set cursor style to indicate it's selectable
  imageElement.style.cursor = 'pointer';
  
  // Click to select the image
  imageElement.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const isShiftKey = (event as MouseEvent).shiftKey;
    
    // If shift key is pressed, allow multiple selection
    if (isShiftKey) {
      if (selectedImages.has(imageId)) {
        // If already in selection and shift-clicked, remove from selection
        selectedImages.delete(imageId);
        imageElement.classList.remove('image-selected');
        
        // Remove interactive handles for this image
        removeInteractiveHandles(imageId);
        
        // Dispatch custom event for image deselection
        document.dispatchEvent(new CustomEvent('image:deselected', {
          detail: { id: imageId }
        }));
        
        // If this was the primary selected image, update primary selection
        if (selectedImageId === imageId) {
          const nextSelected = selectedImages.size > 0 ? 
            Array.from(selectedImages)[0] : null;
          selectedImageId = nextSelected;
        }
      } else {
        // Add to selection
        selectedImages.add(imageId);
        
        // Apply selection styling
        imageElement.classList.add('image-selected');
        
        // Update primary selection if none
        if (!selectedImageId) {
          selectedImageId = imageId;
          
          // Add interactive handles only to primary selected image
          addInteractiveHandles(imageId);
        }
        
        // Dispatch custom event for image selection
        document.dispatchEvent(new CustomEvent('image:selected', {
          detail: { id: imageId }
        }));
      }
    } else {
      // Normal click behavior (single selection)
      
      // If already the primary selected, do nothing
      if (selectedImageId === imageId) return;
      
      // Deselect all previously selected images
      if (selectedImages.size > 0) {
        // Store current selected images to deselect them
        const previouslySelected = Array.from(selectedImages);
        
        // Clear selection
        selectedImages.clear();
        
        // Deselect each image
        for (const prevId of previouslySelected) {
          const prevImage = document.getElementById(prevId);
          if (prevImage) {
            prevImage.classList.remove('image-selected');
            removeInteractiveHandles(prevId);
          }
          
          // Dispatch deselect event
          document.dispatchEvent(new CustomEvent('image:deselected', {
            detail: { id: prevId }
          }));
        }
      } else if (selectedImageId) {
        // Just deselect the single selected image
        deselectImage(selectedImageId);
      }
      
      // Select this image as the only selection
      selectImage(imageId);
      selectedImages.add(imageId);
      
      // Dispatch custom event for image selection
      document.dispatchEvent(new CustomEvent('image:selected', {
        detail: { id: imageId }
      }));
    }
  });

  // Double-click for quick access to replacement
  imageElement.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Dispatch custom event for image replacement
    document.dispatchEvent(new CustomEvent('image:requestReplace', {
      detail: { id: imageId }
    }));
  });
}

/**
 * Select an image and add interactive handles
 * @param imageId The ID of the image to select
 * @param isMultiSelect Whether this is a multi-selection (via shift-key)
 */
export function selectImage(imageId: string, isMultiSelect = false) {
  const imageElement = document.getElementById(imageId) as HTMLImageElement;
  if (!imageElement) return;
  
  // Add to the selected images set
  selectedImages.add(imageId);
  
  // Only update the primary selection if not in multi-select mode 
  // or if this is the first selection
  if (!isMultiSelect || !selectedImageId) {
    selectedImageId = imageId;
  }
  
  // Add selected styling
  if (isMultiSelect && selectedImageId !== imageId) {
    // Use multi-select styling for secondary selections
    imageElement.classList.add('multi-image-selected');
  } else {
    // Use primary selection styling
    imageElement.classList.add('image-selected');
  }
  
  // Get the parent container
  let container = imageElement.parentElement;
  if (!container || !container.classList.contains('image-container')) {
    // If not already in a container, wrap it
    container = document.createElement('div');
    container.className = 'image-container image-inline';
    container.contentEditable = 'false';
    imageElement.parentNode?.insertBefore(container, imageElement);
    container.appendChild(imageElement);
  }
  
  // Only add interactive handles for the primary selected image
  if (!isMultiSelect || selectedImageId === imageId) {
    // Store original dimensions and rotation
    originalWidth = imageElement.offsetWidth;
    originalHeight = imageElement.offsetHeight;
    
    // Parse rotation from transform style if it exists
    const transform = imageElement.style.transform || '';
    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
    originalRotation = rotateMatch && rotateMatch[1] ? parseInt(rotateMatch[1], 10) : 0;
    
    // Add resize handles
    addResizeHandles(container, imageId);
    
    // Add rotation handle
    addRotationHandle(container, imageId);
    
    // Make draggable if in wrapped mode
    if (container.classList.contains('image-wrap')) {
      makeImageDraggable(imageId);
    }
    
    // Set up keyboard listeners for accessibility
    setupKeyboardControls(imageId);
  }
  
  // Dispatch custom event for image selection with multi-select flag
  document.dispatchEvent(new CustomEvent('image:selected', {
    detail: { 
      id: imageId,
      isMultiSelect,
      selectedCount: selectedImages.size
    }
  }));
}

/**
 * Remove interactive handles without deselecting the image
 */
function removeInteractiveHandles(imageId: string) {
  const imageElement = document.getElementById(imageId) as HTMLImageElement;
  if (!imageElement) return;
  
  // Remove all handles
  const container = imageElement.closest('.image-container');
  if (container) {
    // Remove resize handles
    const handles = container.querySelectorAll('.resize-handle, .rotate-handle');
    handles.forEach(handle => handle.remove());
  }
}

/**
 * Add interactive handles to an image
 */
function addInteractiveHandles(imageId: string) {
  const imageElement = document.getElementById(imageId) as HTMLImageElement;
  if (!imageElement) return;
  
  const container = imageElement.closest('.image-container');
  if (!container) return;
  
  // Add resize handles
  addResizeHandles(container as HTMLElement, imageId);
  
  // Add rotation handle
  addRotationHandle(container as HTMLElement, imageId);
  
  // Make draggable if in wrapped mode
  if (container.classList.contains('image-wrap')) {
    makeImageDraggable(imageId);
  }
}

/**
 * Deselect an image and remove interactive handles
 */
export function deselectImage(imageId: string) {
  const imageElement = document.getElementById(imageId) as HTMLImageElement;
  if (!imageElement) return;
  
  // Remove selected styling
  imageElement.classList.remove('image-selected');
  imageElement.classList.remove('multi-image-selected');
  
  // Remove interactive handles
  removeInteractiveHandles(imageId);
  
  // Remove from selection set
  selectedImages.delete(imageId);
  
  // If this was the primary selection, select the next image as primary
  if (selectedImageId === imageId) {
    // Find the next image in the selection to make primary, if any
    const remainingImages = Array.from(selectedImages);
    
    if (remainingImages.length > 0) {
      // Set the first remaining image as primary
      selectedImageId = remainingImages[0];
      
      // Add interactive handles to the new primary image
      const newPrimaryImage = document.getElementById(selectedImageId);
      if (newPrimaryImage) {
        // Change styling from multi-select to primary
        newPrimaryImage.classList.remove('multi-image-selected');
        newPrimaryImage.classList.add('image-selected');
        
        // Add interactive handles to the new primary
        const container = newPrimaryImage.closest('.image-container');
        if (container) {
          addInteractiveHandles(selectedImageId);
        }
      }
    } else {
      // No more selected images
      selectedImageId = null;
      
      // Remove keyboard event listeners
      document.removeEventListener('keydown', handleImageKeyDown);
    }
  }
  
  // Dispatch custom event for image deselection
  document.dispatchEvent(new CustomEvent('image:deselected', {
    detail: { 
      id: imageId,
      selectedCount: selectedImages.size
    }
  }));
}

/**
 * Add resize handles to the image container
 */
function addResizeHandles(container: HTMLElement, imageId: string) {
  const positions = ['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w'];
  
  positions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-handle-${pos}`;
    container.appendChild(handle);
    
    // Add event listeners for resizing
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      resizeDirection = pos;
      startX = e.clientX;
      startY = e.clientY;
      
      const image = document.getElementById(imageId) as HTMLImageElement;
      if (image) {
        originalWidth = image.offsetWidth;
        originalHeight = image.offsetHeight;
        
        // Add class to disable transitions during resize
        image.classList.add('image-transforming');
        
        // Create and show dimensions tooltip
        showDimensionsTooltip(container, image.offsetWidth, image.offsetHeight);
      }
      
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    });
  });
}

/**
 * Handle resize mouse movement
 */
function handleResize(e: MouseEvent) {
  if (!isResizing || !selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (!image) return;
  
  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  
  // Calculate new dimensions based on resize direction
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Maintain aspect ratio for corner handles
  const aspectRatio = originalWidth / originalHeight;
  
  switch (resizeDirection) {
    case 'nw':
      newWidth = originalWidth - deltaX;
      newHeight = newWidth / aspectRatio;
      break;
    case 'ne':
      newWidth = originalWidth + deltaX;
      newHeight = newWidth / aspectRatio;
      break;
    case 'sw':
      newWidth = originalWidth - deltaX;
      newHeight = newWidth / aspectRatio;
      break;
    case 'se':
      newWidth = originalWidth + deltaX;
      newHeight = newWidth / aspectRatio;
      break;
    case 'n':
      newHeight = originalHeight - deltaY;
      break;
    case 'e':
      newWidth = originalWidth + deltaX;
      break;
    case 's':
      newHeight = originalHeight + deltaY;
      break;
    case 'w':
      newWidth = originalWidth - deltaX;
      break;
  }
  
  // Enforce minimum dimensions
  newWidth = Math.max(20, newWidth);
  newHeight = Math.max(20, newHeight);
  
  // Apply new dimensions
  image.style.width = `${newWidth}px`;
  image.style.height = `${newHeight}px`;
  
  // Update dimensions tooltip
  updateDimensionsTooltip(image.closest('.image-container'), Math.round(newWidth), Math.round(newHeight));
}

/**
 * Stop resizing on mouse up
 */
function stopResize() {
  if (!isResizing || !selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (image) {
    // Remove transforming class to re-enable transitions
    image.classList.remove('image-transforming');
    
    // Remove dimensions tooltip
    removeDimensionsTooltip(image.closest('.image-container'));
    
    // Dispatch custom event for image resize
    document.dispatchEvent(new CustomEvent('image:resized', {
      detail: {
        id: selectedImageId,
        width: image.offsetWidth,
        height: image.offsetHeight
      }
    }));
  }
  
  isResizing = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
}

/**
 * Add rotation handle to the image container
 */
function addRotationHandle(container: HTMLElement, imageId: string) {
  const handle = document.createElement('div');
  handle.className = 'rotate-handle';
  container.appendChild(handle);
  
  // Add event listeners for rotation
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isRotating = true;
    
    const image = document.getElementById(imageId) as HTMLImageElement;
    if (image) {
      // Get the center of the image for rotation calculation
      const rect = image.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      
      // Store initial mouse position
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      
      // Add class to disable transitions during rotation
      image.classList.add('image-transforming');
      
      // Parse current rotation
      const transform = image.style.transform || '';
      const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
      originalRotation = rotateMatch && rotateMatch[1] ? parseInt(rotateMatch[1], 10) : 0;
    }
    
    document.addEventListener('mousemove', handleRotation);
    document.addEventListener('mouseup', stopRotation);
  });
}

/**
 * Handle rotation mouse movement
 */
function handleRotation(e: MouseEvent) {
  if (!isRotating || !selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (!image) return;
  
  // Calculate angle from center of image to current mouse position
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
  
  // Calculate angle from center of image to initial mouse position
  const initialAngle = Math.atan2(lastMouseY - centerY, lastMouseX - centerX) * (180 / Math.PI);
  
  // Calculate rotation change
  const rotationChange = angle - initialAngle;
  
  // Apply new rotation (original + change)
  const newRotation = (originalRotation + rotationChange) % 360;
  
  // Apply rotation transform (preserving any other transforms)
  const existingTransform = image.style.transform || '';
  const newTransform = existingTransform.replace(/rotate\([^)]+\)/, '') + ` rotate(${newRotation}deg)`;
  image.style.transform = newTransform.trim();
  
  // Update last mouse position
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  originalRotation = newRotation;
}

/**
 * Stop rotation on mouse up
 */
function stopRotation() {
  if (!isRotating || !selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (image) {
    // Remove transforming class to re-enable transitions
    image.classList.remove('image-transforming');
    
    // Extract final rotation angle
    const transform = image.style.transform || '';
    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
    const finalRotation = rotateMatch && rotateMatch[1] ? parseInt(rotateMatch[1], 10) : 0;
    
    // Dispatch custom event for image rotation
    document.dispatchEvent(new CustomEvent('image:rotated', {
      detail: {
        id: selectedImageId,
        angle: finalRotation
      }
    }));
  }
  
  isRotating = false;
  document.removeEventListener('mousemove', handleRotation);
  document.removeEventListener('mouseup', stopRotation);
}

/**
 * Make an image draggable (for wrap mode)
 */
function makeImageDraggable(imageId: string) {
  const image = document.getElementById(imageId) as HTMLImageElement;
  if (!image) return;
  
  console.log('Making image draggable:', imageId);
  
  // Get the container (or create one if needed)
  let container = image.closest('.image-container') as HTMLElement;
  if (!container) {
    // Create container if it doesn't exist
    container = document.createElement('div');
    container.className = 'image-container image-wrap';
    if (image.parentElement) {
      image.parentElement.insertBefore(container, image);
      container.appendChild(image);
    }
  }
  
  // Ensure image has correct cursor style
  image.style.cursor = 'move';
  
  // Clean up any previous listeners to avoid duplicates
  const oldListenerFn = (image as any)._dragListener;
  if (oldListenerFn) {
    image.removeEventListener('mousedown', oldListenerFn);
  }
  
  // Create a new mousedown listener
  const mousedownListener = (e: MouseEvent) => {
    // Only handle drag if not already resizing or rotating
    if (isResizing || isRotating) return;
    
    console.log('Starting image drag operation');
    
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // Get current position from container's transform
    const style = window.getComputedStyle(container);
    const transform = style.transform || 'matrix(1, 0, 0, 1, 0, 0)';
    
    try {
      // Extract current translation values
      const matrix = new DOMMatrix(transform);
      originalWidth = matrix.e || 0;  // Use for X position
      originalHeight = matrix.f || 0;  // Use for Y position
    } catch (err) {
      // Fallback if DOMMatrix isn't supported or has an error
      console.warn('DOMMatrix not supported, using fallback for drag');
      const matches = transform.match(/matrix\(.*,\s*(\d+),\s*(\d+)\)/) || 
                      transform.match(/translate\((\d+)px,\s*(\d+)px\)/);
      if (matches && matches.length >= 3) {
        originalWidth = parseFloat(matches[1]) || 0;
        originalHeight = parseFloat(matches[2]) || 0;
      } else {
        originalWidth = 0;
        originalHeight = 0;
      }
    }
    
    // Add class to disable transitions during drag
    container.classList.add('image-transforming');
    
    // Create drag indicator for visual feedback
    const indicator = document.createElement('div');
    indicator.className = 'drag-indicator';
    indicator.style.position = 'absolute';
    indicator.style.border = '1px dashed #1a73e8';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '9999';
    
    // Match indicator size to image
    const rect = container.getBoundingClientRect();
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
    indicator.style.left = `${rect.left}px`;
    indicator.style.top = `${rect.top}px`;
    
    document.body.appendChild(indicator);
    
    // Create and store the listener functions for cleanup
    const dragHandler = (e: MouseEvent) => handleDrag(e);
    const dragStopHandler = (e: MouseEvent) => {
      stopDrag();
      // Clean up these specific event listeners
      document.removeEventListener('mousemove', dragHandler);
      document.removeEventListener('mouseup', dragStopHandler);
    };
    
    // Add the event listeners
    document.addEventListener('mousemove', dragHandler);
    document.addEventListener('mouseup', dragStopHandler);
  };
  
  // Store the listener for potential cleanup later
  (image as any)._dragListener = mousedownListener;
  
  // Add the event listener
  image.addEventListener('mousedown', mousedownListener);
  
  // Return cleanup function
  return () => {
    image.removeEventListener('mousedown', mousedownListener);
    delete (image as any)._dragListener;
  };
}

/**
 * Handle drag mouse movement
 */
function handleDrag(e: MouseEvent) {
  if (!isDragging || !selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (!image) return;
  
  const container = image.closest('.image-container') as HTMLElement;
  if (!container) return;
  
  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  
  // Calculate new position
  const newX = originalWidth + deltaX;
  const newY = originalHeight + deltaY;
  
  // Apply new position through transform
  container.style.transform = `translate(${newX}px, ${newY}px)`;
  
  // Update drag indicator
  const indicator = document.querySelector('.drag-indicator');
  if (indicator instanceof HTMLElement) {
    const rect = container.getBoundingClientRect();
    indicator.style.left = `${rect.left}px`;
    indicator.style.top = `${rect.top}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
  }
  
  // Add temporary data attributes for debugging
  container.dataset.dragX = newX.toString();
  container.dataset.dragY = newY.toString();
  
  // Show coordinates for visual feedback
  console.log(`Dragging image to: ${newX}px, ${newY}px`);
}

/**
 * Stop dragging on mouse up
 */
function stopDrag() {
  if (!isDragging || !selectedImageId) return;
  
  console.log(`Stopped dragging image: ${selectedImageId}`);
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (image) {
    const container = image.closest('.image-container') as HTMLElement;
    if (container) {
      // Remove transforming class to re-enable transitions
      container.classList.remove('image-transforming');
      
      // Get final position
      let finalX = 0;
      let finalY = 0;
      
      try {
        // Try to get transform matrix
        const style = window.getComputedStyle(container);
        const transform = style.transform || 'matrix(1, 0, 0, 1, 0, 0)';
        
        // Try to parse with DOMMatrix
        const matrix = new DOMMatrix(transform);
        finalX = matrix.e || 0;
        finalY = matrix.f || 0;
      } catch (err) {
        // Fallback to dataset values if available
        if (container.dataset.dragX && container.dataset.dragY) {
          finalX = parseFloat(container.dataset.dragX);
          finalY = parseFloat(container.dataset.dragY);
        } else {
          // Last resort - regex match
          const matches = container.style.transform.match(/translate\((\d+)px,\s*(\d+)px\)/);
          if (matches && matches.length >= 3) {
            finalX = parseFloat(matches[1]) || 0;
            finalY = parseFloat(matches[2]) || 0;
          }
        }
      }
      
      // Store final position in data attributes for potential recovery
      container.dataset.posX = finalX.toString();
      container.dataset.posY = finalY.toString();
      
      // Dispatch custom event for image moved
      document.dispatchEvent(new CustomEvent('image:moved', {
        detail: {
          id: selectedImageId,
          x: finalX,
          y: finalY
        }
      }));
      
      console.log(`Final image position: ${finalX}px, ${finalY}px`);
    }
  }
  
  // Remove drag indicator
  const indicator = document.querySelector('.drag-indicator');
  if (indicator) indicator.remove();
  
  // Reset state
  isDragging = false;
  
  // Clean up unused event listeners
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
}

/**
 * Set image wrapping mode
 */
export function setImageWrappingMode(imageId: string, mode: 'inline' | 'wrap' | 'break') {
  const image = document.getElementById(imageId) as HTMLImageElement;
  if (!image) return;
  
  // Get or create container
  let container = image.closest('.image-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'image-container';
    image.parentNode?.insertBefore(container, image);
    container.appendChild(image);
  }
  
  // Remove all wrapping classes
  container.classList.remove('image-inline', 'image-wrap', 'image-break');
  
  // Add appropriate class for the selected mode
  container.classList.add(`image-${mode}`);
  
  // Update cursor and draggability based on mode
  if (mode === 'wrap') {
    image.style.cursor = 'move';
    if (selectedImageId === imageId) {
      makeImageDraggable(imageId);
    }
  } else {
    image.style.cursor = 'pointer';
  }
  
  // Dispatch custom event for wrapping mode change
  document.dispatchEvent(new CustomEvent('image:wrappingChanged', {
    detail: {
      id: imageId,
      mode: mode
    }
  }));
}

/**
 * Show dimensions tooltip during resize
 */
function showDimensionsTooltip(container: Element | null, width: number, height: number) {
  if (!container) return;
  
  // Create tooltip if it doesn't exist
  let tooltip = container.querySelector('.image-dimensions');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'image-dimensions';
    container.appendChild(tooltip);
  }
  
  // Update dimensions
  tooltip.textContent = `${Math.round(width)} × ${Math.round(height)}`;
}

/**
 * Update dimensions tooltip
 */
function updateDimensionsTooltip(container: Element | null, width: number, height: number) {
  if (!container) return;
  
  const tooltip = container.querySelector('.image-dimensions');
  if (tooltip) {
    tooltip.textContent = `${width} × ${height}`;
  }
}

/**
 * Remove dimensions tooltip
 */
function removeDimensionsTooltip(container: Element | null) {
  if (!container) return;
  
  const tooltip = container.querySelector('.image-dimensions');
  if (tooltip) {
    tooltip.remove();
  }
}

/**
 * Set up keyboard controls for accessibility
 */
function setupKeyboardControls(imageId: string) {
  // Add event listener once
  document.addEventListener('keydown', handleImageKeyDown);
}

/**
 * Handle keyboard events for selected image
 */
function handleImageKeyDown(e: KeyboardEvent) {
  if (!selectedImageId) return;
  
  const image = document.getElementById(selectedImageId) as HTMLImageElement;
  if (!image) return;
  
  const container = image.closest('.image-container');
  const isWrapMode = container?.classList.contains('image-wrap');
  
  switch (e.key) {
    case 'Delete':
    case 'Backspace':
      // Delete the image
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('image:delete', {
        detail: { id: selectedImageId }
      }));
      break;
      
    case 'ArrowLeft':
      if (isWrapMode && container) {
        // Move left in wrap mode
        e.preventDefault();
        const htmlContainer = container as HTMLElement;
        const currentX = parseInt(htmlContainer.style.left || '0', 10);
        htmlContainer.style.left = `${currentX - 10}px`;
      }
      break;
      
    case 'ArrowRight':
      if (isWrapMode && container) {
        // Move right in wrap mode
        e.preventDefault();
        const htmlContainer = container as HTMLElement;
        const currentX = parseInt(htmlContainer.style.left || '0', 10);
        htmlContainer.style.left = `${currentX + 10}px`;
      }
      break;
      
    case 'ArrowUp':
      if (isWrapMode && container) {
        // Move up in wrap mode
        e.preventDefault();
        const htmlContainer = container as HTMLElement;
        const currentY = parseInt(htmlContainer.style.top || '0', 10);
        htmlContainer.style.top = `${currentY - 10}px`;
      }
      break;
      
    case 'ArrowDown':
      if (isWrapMode && container) {
        // Move down in wrap mode
        e.preventDefault();
        const htmlContainer = container as HTMLElement;
        const currentY = parseInt(htmlContainer.style.top || '0', 10);
        htmlContainer.style.top = `${currentY + 10}px`;
      }
      break;
      
    case 'Escape':
      // Deselect the image
      deselectImage(selectedImageId);
      break;
  }
}

/**
 * Apply crop to an image
 */
export function cropImage(imageId: string, crop: { x: number, y: number, width: number, height: number }) {
  // In a real implementation, this would involve using canvas to create a cropped version
  // For this example, we'll just dispatch an event
  document.dispatchEvent(new CustomEvent('image:cropped', {
    detail: {
      id: imageId,
      crop: crop
    }
  }));
}

/**
 * Reset image to original size and rotation
 */
export function resetImage(imageId: string) {
  const image = document.getElementById(imageId) as HTMLImageElement;
  if (!image) return;
  
  // Clear any transformations
  image.style.transform = '';
  
  // Reset width and height to auto (let browser determine based on natural size)
  image.style.width = '';
  image.style.height = '';
  
  // Dispatch custom event for image reset
  document.dispatchEvent(new CustomEvent('image:reset', {
    detail: { id: imageId }
  }));
}

/**
 * Replace image with a new one
 */
export function replaceImage(imageId: string, newSrc: string) {
  const image = document.getElementById(imageId) as HTMLImageElement;
  if (!image) return;
  
  // Set new source
  image.src = newSrc;
  
  // Dispatch custom event for image replaced
  document.dispatchEvent(new CustomEvent('image:replaced', {
    detail: { 
      id: imageId,
      src: newSrc
    }
  }));
}

/**
 * Set alt text for an image
 */
export function setImageAltText(imageId: string, altText: string) {
  const image = document.getElementById(imageId) as HTMLImageElement;
  if (!image) return;
  
  // Set alt attribute
  image.alt = altText;
  
  // Dispatch custom event for alt text change
  document.dispatchEvent(new CustomEvent('image:altTextChanged', {
    detail: { 
      id: imageId,
      altText: altText
    }
  }));
}

/**
 * Get current selected image ID
 */
/**
 * Get the currently selected image ID (primary selection)
 */
export function getSelectedImageId(): string | null {
  return selectedImageId;
}

/**
 * Deselect all selected images
 */
export function deselectAllImages() {
  // Use our internal implementation
  _deselectAllImages();
}

/**
 * Get all selected image IDs
 */
export function getAllSelectedImageIds(): string[] {
  return Array.from(selectedImages);
}

/**
 * Check if an image is selected
 */
export function isImageSelected(imageId: string): boolean {
  return selectedImages.has(imageId);
}

/**
 * Listen for document clicks to deselect images when clicking outside
 */
document.addEventListener('click', (e) => {
  if (selectedImages.size === 0) return;
  
  // Check if click is outside the selected images and their handles
  const clickedElement = e.target as HTMLElement;
  
  // Check if clicking on any selected image
  const isClickOnSelectedImage = Array.from(selectedImages).some(id => 
    clickedElement.id === id
  );
  
  // Check if clicking on handle or toolbar or floating toolbar
  const isClickOnHandle = clickedElement.classList.contains('resize-handle') || 
                           clickedElement.classList.contains('rotate-handle');
  const isClickOnContainer = clickedElement.classList.contains('image-container');
  const isClickOnToolbar = clickedElement.closest('.floating-image-toolbar') != null;
  
  // If clicking outside all selected elements, deselect all
  if (!isClickOnSelectedImage && !isClickOnHandle && !isClickOnContainer && !isClickOnToolbar) {
    // Get all selected images to deselect them
    const imagesToDeselect = Array.from(selectedImages);
    
    // Clear selection
    selectedImages.clear();
    
    // Deselect primary selected image
    if (selectedImageId) {
      deselectImage(selectedImageId);
    }
    
    // Deselect all other images
    for (const imageId of imagesToDeselect) {
      if (imageId !== selectedImageId) {
        // Just visually deselect without affecting primary selection
        const image = document.getElementById(imageId);
        if (image) {
          image.classList.remove('image-selected');
        }
        
        // Dispatch deselection event
        document.dispatchEvent(new CustomEvent('image:deselected', {
          detail: { id: imageId }
        }));
      }
    }
  }
});