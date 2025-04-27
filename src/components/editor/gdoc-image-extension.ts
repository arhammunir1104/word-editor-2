/**
 * Google Docs-style Image Extension for Tiptap
 *
 * This extension implements a complete image handling system that mimics
 * Google Docs behavior including:
 * - Image insertion from local files
 * - Resizable images with drag handles
 * - Image selection and movement
 * - Full undo/redo integration
 */

import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface GDocImageOptions {
  // Whether images are inline (true) or block-level (false)
  inline: boolean;
  // HTML attributes applied to all images
  HTMLAttributes: Record<string, any>;
}

// Regular expression for parsing image markdown (e.g. ![alt](src))
export const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

/**
 * GDocImage node extension
 */
export const GDocImage = Node.create<GDocImageOptions>({
  name: 'gDocImage',
  
  // Set content group based on inline option
  group: 'block',
  
  // Make node selectable, draggable and atomic
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return {
      inline: false,
      HTMLAttributes: {},
    };
  },

  // Define node attributes
  addAttributes() {
    return {
      // Image source URL
      src: {
        default: null,
      },
      // Alt text for accessibility
      alt: {
        default: 'Image',
      },
      // Image title (tooltip)
      title: {
        default: null,
      },
      // Image width (can be number or percentage)
      width: {
        default: 'auto',
      },
      // Image height
      height: {
        default: 'auto',
      },
      // Unique identifier for tracking this specific image
      imageId: {
        default: () => `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        parseHTML: (element) => element.getAttribute('data-image-id'),
        renderHTML: (attributes) => {
          if (!attributes.imageId) {
            return {};
          }
          return { 'data-image-id': attributes.imageId };
        },
      },
      // Caption text (optional)
      caption: {
        default: null,
      },
      // Alignment (left, center, right)
      alignment: {
        default: 'center',
        parseHTML: (element) => {
          // Try to get alignment from parent figure or the image itself
          if (element.parentElement?.tagName === 'FIGURE') {
            return element.parentElement.style.textAlign || 'center';
          }
          return element.style.textAlign || 'center';
        },
        renderHTML: (attributes) => {
          return { style: `text-align: ${attributes.alignment}` };
        },
      },
    };
  },

  // Parse HTML image tags
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          
          // Check if we're dealing with our custom image
          const isGDocImage = node.classList.contains('gdoc-image') || 
                              node.hasAttribute('data-image-id');
          
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt') || 'Image',
            title: node.getAttribute('title'),
            width: node.getAttribute('width') || 'auto',
            height: node.getAttribute('height') || 'auto',
            imageId: node.getAttribute('data-image-id') || `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          };
        },
      },
      {
        tag: 'figure',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          
          // Find image and caption
          const img = node.querySelector('img');
          const figcaption = node.querySelector('figcaption');
          
          // Ignore if no image found
          if (!img) {
            return false;
          }
          
          // Check alignment
          const alignment = node.style.textAlign || 'center';
          
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || 'Image',
            title: img.getAttribute('title'),
            width: img.getAttribute('width') || 'auto',
            height: img.getAttribute('height') || 'auto',
            imageId: img.getAttribute('data-image-id') || `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            caption: figcaption ? figcaption.textContent : null,
            alignment,
          };
        },
      },
    ];
  },

  // Generate HTML output
  renderHTML({ HTMLAttributes }) {
    const { caption, alignment, imageId, ...imageAttributes } = HTMLAttributes;
    
    // Ensure we have a data-image-id attribute for tracking
    const imageAttrs = {
      ...imageAttributes,
      'data-image-id': imageId,
      draggable: 'true',
      class: 'gdoc-image',
      // Ensure cursor shows the image is clickable
      style: 'cursor: pointer;',
      // Add explicit width and height if specified
      width: imageAttributes.width || 'auto',
      height: imageAttributes.height || 'auto'
    };
    
    // If we have a caption, render a figure element with figcaption
    if (caption) {
      return [
        'figure', 
        { 
          class: 'gdoc-image-figure',
          style: `text-align: ${alignment}`,
        },
        ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)],
        ['figcaption', { class: 'gdoc-image-caption' }, caption],
      ];
    }
    
    // Otherwise just render the image with proper alignment
    const wrapperAttrs = { 
      class: 'gdoc-image-wrapper',
      style: `text-align: ${alignment}`,
      // Add data-wrapper attribute to help with selection
      'data-image-wrapper': 'true'
    };
    
    return [
      'div',
      wrapperAttrs,
      ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)],
    ];
  },

  // Add paste handlers to support pasting image data
  addPasteRules() {
    return [
      nodePasteRule({
        find: IMAGE_INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src, title] = match;
          
          return { src, alt, title };
        },
      }),
    ];
  },

  // Add prosemirror plugins
  addProseMirrorPlugins() {
    return [
      // Plugin for selection and resize handles
      new Plugin({
        key: new PluginKey('gdocImagePlugin'),
        props: {
          handleDOMEvents: {
            // Handle click on image to select it
            click: (view, event) => {
              // Check if we clicked on an image
              const target = event.target as HTMLElement;
              
              if (target.tagName === 'IMG' && 
                  (target.classList.contains('gdoc-image') || target.hasAttribute('data-image-id'))) {
                // Get image ID
                const imageId = target.getAttribute('data-image-id');
                
                if (!imageId) return false;
                
                // Dispatch selection event
                document.dispatchEvent(new CustomEvent('gdoc:image:selected', {
                  detail: {
                    imageId,
                    width: (target as HTMLImageElement).width,
                    height: (target as HTMLImageElement).height,
                    src: (target as HTMLImageElement).src,
                    alt: (target as HTMLImageElement).alt,
                  }
                }));
                
                // Add history step for selection
                if (window.historyManager) {
                  window.historyManager.addHistoryStep('select-image');
                }
                
                // Prevent default behavior
                event.preventDefault();
                return true;
              }
              
              return false;
            },
          },
          // Add decorations for selected image (resize handles and selection border)
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            
            // Find selected image node and add resize handles
            doc.descendants((node, pos) => {
              if (node.type.name === 'gDocImage') {
                const isSelected = document.querySelector(`.gdoc-image[data-image-id="${node.attrs.imageId}"].selected`);
                
                if (isSelected) {
                  // Add resize handles to the corners
                  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
                    const decoration = Decoration.widget(pos, () => {
                      const handle = document.createElement('div');
                      handle.className = `resize-handle ${corner}`;
                      handle.setAttribute('data-corner', corner);
                      handle.setAttribute('data-image-id', node.attrs.imageId);
                      
                      // Add resize start event handler
                      handle.addEventListener('mousedown', (event) => {
                        event.preventDefault();
                        
                        // Find the image element
                        const imageEl = document.querySelector(`.gdoc-image[data-image-id="${node.attrs.imageId}"]`) as HTMLImageElement;
                        
                        if (!imageEl) return;
                        
                        // Dispatch resize start event
                        document.dispatchEvent(new CustomEvent('gdoc:image:resize:start', {
                          detail: {
                            imageId: node.attrs.imageId,
                            corner,
                            originalWidth: imageEl.width,
                            originalHeight: imageEl.height,
                            clientX: event.clientX,
                            clientY: event.clientY
                          }
                        }));
                      });
                      
                      return handle;
                    });
                    
                    decorations.push(decoration);
                  }
                  
                  // Add middle edge handles for more Google Docs-like behavior
                  for (const edge of ['top', 'right', 'bottom', 'left']) {
                    const decoration = Decoration.widget(pos, () => {
                      const handle = document.createElement('div');
                      handle.className = `resize-handle ${edge}`;
                      handle.setAttribute('data-edge', edge);
                      handle.setAttribute('data-image-id', node.attrs.imageId);
                      
                      // Set the right cursor style
                      if (edge === 'top' || edge === 'bottom') {
                        handle.style.cursor = 'ns-resize';
                      } else {
                        handle.style.cursor = 'ew-resize';
                      }
                      
                      // Add resize start event handler
                      handle.addEventListener('mousedown', (event) => {
                        event.preventDefault();
                        
                        // Find the image element
                        const imageEl = document.querySelector(`.gdoc-image[data-image-id="${node.attrs.imageId}"]`) as HTMLImageElement;
                        
                        if (!imageEl) return;
                        
                        // Dispatch resize start event with edge info
                        document.dispatchEvent(new CustomEvent('gdoc:image:resize:start', {
                          detail: {
                            imageId: node.attrs.imageId,
                            edge,
                            originalWidth: imageEl.width,
                            originalHeight: imageEl.height,
                            clientX: event.clientX,
                            clientY: event.clientY
                          }
                        }));
                      });
                      
                      return handle;
                    });
                    
                    decorations.push(decoration);
                  }
                }
              }
              
              return true;
            });
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * Insert image from a file into the editor
 */
export async function insertImageFromFile(file: File, editor: any, addToHistory = true): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        console.error('File is not an image:', file.type);
        reject(new Error('File must be an image'));
        return;
      }
      
      console.log('Processing image file:', file.name);
      
      // Create object URL instead of base64
      const objectUrl = URL.createObjectURL(file);
      
      // Generate unique ID with timestamp to ensure uniqueness
      const imageId = `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // If image attributes need to be determined from the image itself
      const img = new Image();
      img.onload = () => {
        // Get natural dimensions
        const { naturalWidth, naturalHeight } = img;
        
        // Calculate dimensions to keep image within reasonable bounds
        let width = naturalWidth;
        let height = naturalHeight;
        
        // Limit max width to 800px (configurable)
        const maxWidth = 800;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        
        // Insert image into the editor
        editor.chain()
          .focus()
          .insertContent({
            type: 'gDocImage',
            attrs: {
              src: objectUrl,
              alt: file.name,
              title: file.name,
              width,
              height,
              imageId,
              // Set default alignment to center like Google Docs
              alignment: 'center',
            }
          })
          .run();
        
        // Record history step
        if (addToHistory && window.historyManager) {
          window.historyManager.addHistoryStep('insert-image');
        }
        
        // Notify success
        document.dispatchEvent(new CustomEvent('gdoc:image:inserted', {
          detail: {
            imageId,
            src: objectUrl,
          }
        }));
        
        // Auto-select the newly inserted image
        setTimeout(() => {
          const imageElement = document.querySelector(`.gdoc-image[data-image-id="${imageId}"]`);
          if (imageElement) {
            document.dispatchEvent(new CustomEvent('gdoc:image:selected', {
              detail: {
                imageId,
                width,
                height,
                src: objectUrl,
                alt: file.name,
              }
            }));
          }
        }, 50);
        
        resolve(objectUrl);
      };
      
      // Handle image load error
      img.onerror = () => {
        console.error('Failed to load image');
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      
      // Start loading the image
      img.src = objectUrl;
      
    } catch (error) {
      console.error('Error inserting image:', error);
      reject(error);
    }
  });
}

/**
 * Setup image interaction listeners
 */
export function setupImageHandlers(editor: any) {
  // Track resizing state
  let isResizing = false;
  let currentImageId: string | null = null;
  let startX = 0;
  let startY = 0;
  let originalWidth = 0;
  let originalHeight = 0;
  let originalRatio = 1;
  let resizeCorner = '';
  
  // Handle image upload from toolbar
  document.addEventListener('gdoc:toolbar:insertImage', () => {
    console.log('Image upload requested');
    
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      
      if (file) {
        try {
          await insertImageFromFile(file, editor);
        } catch (error) {
          console.error('Failed to insert image:', error);
        }
      }
      
      // Clean up
      document.body.removeChild(fileInput);
    };
    
    // Open file dialog
    fileInput.click();
  });
  
  // Handle image selection
  document.addEventListener('gdoc:image:selected', (event: any) => {
    const { imageId } = event.detail;
    
    // Remove selection from all images
    document.querySelectorAll('.gdoc-image.selected').forEach((img) => {
      img.classList.remove('selected');
    });
    
    // Add selection to clicked image
    const imageElement = document.querySelector(`.gdoc-image[data-image-id="${imageId}"]`);
    if (imageElement) {
      console.log('Selecting image with ID:', imageId);
      imageElement.classList.add('selected');
      
      // Add a styled border to make selection more visible
      (imageElement as HTMLElement).style.border = '2px solid #1a73e8';
      (imageElement as HTMLElement).style.borderRadius = '2px';
      
      // Force editor to update to show resize handles
      window.setTimeout(() => {
        editor.view.dispatch(editor.view.state.tr.setMeta('forceUpdate', true));
      }, 10);
      
      // Additional force update after a bit longer time
      window.setTimeout(() => {
        editor.view.dispatch(editor.view.state.tr.setMeta('forceUpdate', true));
      }, 100);
    }
  });
  
  // Handle image deselection
  document.addEventListener('gdoc:image:deselect', () => {
    // Remove selection from all images
    document.querySelectorAll('.gdoc-image.selected').forEach((img) => {
      img.classList.remove('selected');
      // Also remove the inline border style
      (img as HTMLElement).style.border = '';
      (img as HTMLElement).style.borderRadius = '';
    });
    
    // Force editor to update to remove resize handles
    window.setTimeout(() => {
      editor.view.dispatch(editor.view.state.tr.setMeta('forceUpdate', true));
    }, 10);
    
    console.log('Image deselected, removed resize handles');
  });
  
  // Handle resize start
  document.addEventListener('gdoc:image:resize:start', (event: any) => {
    const { imageId, corner, edge, originalWidth: width, originalHeight: height, clientX, clientY } = event.detail;
    
    // Find the image
    const imageElement = document.querySelector(`.gdoc-image[data-image-id="${imageId}"]`) as HTMLImageElement;
    if (!imageElement) return;
    
    // Set resize state
    isResizing = true;
    currentImageId = imageId;
    resizeCorner = corner || '';
    originalWidth = width;
    originalHeight = height;
    originalRatio = originalWidth / originalHeight;
    
    // Store the edge for edge-based resizing
    const resizeEdge = edge || '';
    
    // Store mouse start position
    startX = clientX;
    startY = clientY;
    
    // Add global mouse move and up listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', finishResize);
    
    // Set appropriate cursor style based on resize handle
    if (corner) {
      document.body.style.cursor = corner.includes('left') ? 'nwse-resize' : 'nesw-resize';
    } else if (edge) {
      if (edge === 'left' || edge === 'right') {
        document.body.style.cursor = 'ew-resize';
      } else {
        document.body.style.cursor = 'ns-resize';
      }
    }
    
    // Prevent text selection during resize
    document.body.classList.add('no-select');
  });
  
  // Handle resize during mouse movement
  function handleResize(event: MouseEvent) {
    if (!isResizing || !currentImageId) return;
    
    // Find the image
    const imageElement = document.querySelector(`.gdoc-image[data-image-id="${currentImageId}"]`) as HTMLImageElement;
    if (!imageElement) return;
    
    // Calculate mouse movement
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    // Calculate new dimensions based on corner or edge being dragged
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    
    // Check if we're dragging a corner
    if (resizeCorner) {
      // Corner-based resizing (affects both width and height)
      switch (resizeCorner) {
        case 'bottom-right':
          newWidth = Math.max(50, originalWidth + deltaX);
          newHeight = Math.max(50, originalHeight + deltaY);
          break;
        case 'bottom-left':
          newWidth = Math.max(50, originalWidth - deltaX);
          newHeight = Math.max(50, originalHeight + deltaY);
          break;
        case 'top-right':
          newWidth = Math.max(50, originalWidth + deltaX);
          newHeight = Math.max(50, originalHeight - deltaY);
          break;
        case 'top-left':
          newWidth = Math.max(50, originalWidth - deltaX);
          newHeight = Math.max(50, originalHeight - deltaY);
          break;
      }
    } else {
      // Get the resize edge from the event target
      const edge = (event.target as HTMLElement).getAttribute('data-edge');
      
      // Edge-based resizing (affects only width OR height)
      switch (edge) {
        case 'right':
          newWidth = Math.max(50, originalWidth + deltaX);
          newHeight = originalHeight; // Keep height constant
          break;
        case 'left':
          newWidth = Math.max(50, originalWidth - deltaX);
          newHeight = originalHeight; // Keep height constant
          break;
        case 'bottom':
          newWidth = originalWidth; // Keep width constant
          newHeight = Math.max(50, originalHeight + deltaY);
          break;
        case 'top':
          newWidth = originalWidth; // Keep width constant
          newHeight = Math.max(50, originalHeight - deltaY);
          break;
      }
    }
    
    // Maintain aspect ratio when holding Shift (only for corner resizing)
    if (event.shiftKey && resizeCorner) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = newWidth / originalRatio;
      } else {
        newWidth = newHeight * originalRatio;
      }
    }
    
    // Apply new dimensions to the image
    imageElement.style.width = `${newWidth}px`;
    imageElement.style.height = `${newHeight}px`;
    
    // Prevent default behavior
    event.preventDefault();
  }
  
  // Handle resize end
  function finishResize(event: MouseEvent) {
    if (!isResizing || !currentImageId) return;
    
    // Find the image
    const imageElement = document.querySelector(`.gdoc-image[data-image-id="${currentImageId}"]`) as HTMLImageElement;
    if (imageElement) {
      // Get final dimensions
      const finalWidth = parseInt(imageElement.style.width) || originalWidth;
      const finalHeight = parseInt(imageElement.style.height) || originalHeight;
      
      // Update the node in the document
      editor.view.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'gDocImage' && node.attrs.imageId === currentImageId) {
          // Update image attributes
          editor.chain()
            .setNodeSelection(pos)
            .updateAttributes('gDocImage', {
              width: finalWidth,
              height: finalHeight,
            })
            .run();
          
          // Record in history
          if (window.historyManager) {
            window.historyManager.addHistoryStep('resize-image');
          }
          
          return false;
        }
        return true;
      });
    }
    
    // Reset resizing state
    isResizing = false;
    currentImageId = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', finishResize);
    
    // Reset cursor and selection prevention
    document.body.style.cursor = '';
    document.body.classList.remove('no-select');
  }
  
  // Handle image deletion and keyboard shortcuts
  function handleImageDelete(event: KeyboardEvent) {
    // Check for Delete or Backspace key
    if ((event.key === 'Delete' || event.key === 'Backspace') && editor.isActive('gDocImage')) {
      // The editor will handle the deletion, we just need to record in history
      if (window.historyManager) {
        window.historyManager.addHistoryStep('delete-image');
      }
    }
    
    // Handle Escape key to deselect images
    if (event.key === 'Escape') {
      // If there are any selected images, deselect them
      const selectedImages = document.querySelectorAll('.gdoc-image.selected');
      if (selectedImages.length > 0) {
        document.dispatchEvent(new CustomEvent('gdoc:image:deselect'));
        event.preventDefault();
      }
    }
  }
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleImageDelete);
  
  // Add document click handler to deselect image when clicking elsewhere
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // If we clicked on something that's not an image or resize handle, deselect
    if (!target.classList.contains('gdoc-image') && 
        !target.classList.contains('resize-handle') &&
        !target.closest('.gdoc-image-toolbar')) {
      
      // Deselect all images
      document.dispatchEvent(new CustomEvent('gdoc:image:deselect'));
    }
  });
  
  // Add image caption handling
  document.addEventListener('gdoc:image:caption', (event: any) => {
    const { imageId, caption } = event.detail;
    
    // Update the node in the document
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'gDocImage' && node.attrs.imageId === imageId) {
        // Update caption
        editor.chain()
          .setNodeSelection(pos)
          .updateAttributes('gDocImage', { caption })
          .run();
        
        // Record in history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('edit-image-caption');
        }
        
        return false;
      }
      return true;
    });
  });
  
  // Add image alt text handling
  document.addEventListener('gdoc:image:alt', (event: any) => {
    const { imageId, alt } = event.detail;
    
    // Update the node in the document
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'gDocImage' && node.attrs.imageId === imageId) {
        // Update alt text
        editor.chain()
          .setNodeSelection(pos)
          .updateAttributes('gDocImage', { alt })
          .run();
        
        // Record in history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('edit-image-alt');
        }
        
        return false;
      }
      return true;
    });
  });
  
  // Handle image alignment
  document.addEventListener('gdoc:image:align', (event: any) => {
    const { imageId, alignment } = event.detail;
    
    // Update the node in the document
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'gDocImage' && node.attrs.imageId === imageId) {
        // Update alignment
        editor.chain()
          .setNodeSelection(pos)
          .updateAttributes('gDocImage', { alignment })
          .run();
        
        // Record in history
        if (window.historyManager) {
          window.historyManager.addHistoryStep('align-image');
        }
        
        return false;
      }
      return true;
    });
  });
}