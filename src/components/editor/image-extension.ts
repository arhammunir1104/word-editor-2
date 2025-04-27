/**
 * Image Node Extension for TipTap
 * This extension provides Google Docs-like image functionality including:
 * - Image insertion at cursor position
 * - Resizable images with drag handles
 * - Caption support
 * - Alt text for accessibility
 * - Integration with the global undo/redo system
 */

import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Regular expression for matching image markdown syntax
export const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

// Custom type for image attributes
export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

// Image Extension Definition
export const ResizableImage = Node.create<ImageOptions>({
  name: 'image',
  
  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },
  
  group() {
    return this.options.inline ? 'inline' : 'block';
  },
  
  draggable: true,
  
  selectable: true,
  
  atom: true,
  
  // Image attributes
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: 'Image',
      },
      title: {
        default: 'Image',
      },
      width: {
        default: 400,
      },
      height: {
        default: 'auto',
      },
      dataId: {
        default: () => `image-${Date.now()}`,
        parseHTML: (element) => {
          return element.getAttribute('data-id') || `image-${Date.now()}`;
        },
      },
      caption: {
        default: null,
      },
      'data-type': {
        default: 'resizable-image',
      },
      'data-is-selected': {
        default: 'false',
      }
    };
  },
  
  // Parse image tags from HTML
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          // Check if we're dealing with an HTMLElement
          if (!(node instanceof HTMLElement)) {
            return {};
          }
          
          // Don't parse base64 images if not allowed
          if (!this.options.allowBase64 && /^data:image/.test(node.getAttribute('src') || '')) {
            return false;
          }
          
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt') || 'Image',
            title: node.getAttribute('title') || 'Image',
            width: node.getAttribute('width') || 400,
            height: node.getAttribute('height') || 'auto',
            dataId: node.getAttribute('data-id') || `image-${Date.now()}`,
          };
        },
      },
      {
        tag: 'figure',
        getAttrs: (node) => {
          // Check if we're dealing with an HTMLElement and contains an image
          if (!(node instanceof HTMLElement)) {
            return {};
          }
          
          const img = node.querySelector('img');
          const figcaption = node.querySelector('figcaption');
          
          if (!img) return false;
          
          // Don't parse base64 images if not allowed
          if (!this.options.allowBase64 && /^data:image/.test(img.getAttribute('src') || '')) {
            return false;
          }
          
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || 'Image',
            title: img.getAttribute('title') || 'Image',
            width: img.getAttribute('width') || 400,
            height: img.getAttribute('height') || 'auto',
            dataId: img.getAttribute('data-id') || `image-${Date.now()}`,
            caption: figcaption ? figcaption.textContent : null,
          };
        },
      },
    ];
  },
  
  // Generate HTML output from node
  renderHTML({ HTMLAttributes }) {
    const { caption, dataId, ...imageAttributes } = HTMLAttributes;
    
    // Make sure we have the data-id attribute as expected by our selection code
    const imageAttrs = {
      ...imageAttributes,
      'data-id': dataId || `image-${Date.now()}`,
      draggable: 'true',
      contenteditable: 'false',
      class: 'resizable-image'
    };
    
    if (caption) {
      // Render with caption using figure element
      return [
        'figure', 
        { class: 'resizable-image-figure' },
        [
          'img', 
          mergeAttributes(
            this.options.HTMLAttributes,
            imageAttrs
          )
        ],
        ['figcaption', { class: 'image-caption' }, caption],
      ];
    }
    
    // Render simple image without caption
    return [
      'img', 
      mergeAttributes(
        this.options.HTMLAttributes,
        imageAttrs
      )
    ];
  },
  
  // Support markdown image syntax
  addInputRules() {
    return [
      nodeInputRule({
        find: IMAGE_INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src, title] = match;
          
          return { src, alt, title };
        },
      }),
    ];
  },
  
  // Add custom plugins for image functionality
  addProseMirrorPlugins() {
    return [
      // Plugin for handling image selection and drag handles
      new Plugin({
        key: new PluginKey('resizableImagePlugin'),
        props: {
          handleDOMEvents: {
            // Handle click on image to select it
            click: (view, event) => {
              const target = event.target as HTMLElement;
              
              // Check if we clicked on an image or resize handle
              if (target.tagName === 'IMG' && target.classList.contains('resizable-image')) {
                // Mark image as selected by dispatching event
                document.dispatchEvent(new CustomEvent('image:selected', {
                  detail: {
                    id: target.getAttribute('data-id'),
                  }
                }));
                
                // Record state for undo/redo
                if (window.historyManager) {
                  window.historyManager.addHistoryStep('select-image');
                }
                
                // Prevent further event handling to keep focus in editor
                event.preventDefault();
                return true;
              }
              
              return false;
            },
          },
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            
            // Find all image nodes and add decorations for resize handles
            doc.descendants((node, pos) => {
              if (node.type.name === 'image') {
                const isSelected = node.attrs['data-is-selected'] === 'true';
                
                // Only add resize handles to selected images
                if (isSelected) {
                  // Add corner resize handles
                  for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
                    const decoration = Decoration.widget(pos, () => {
                      const handle = document.createElement('div');
                      handle.className = `resize-handle ${position}`;
                      handle.setAttribute('data-position', position);
                      handle.setAttribute('data-image-id', node.attrs.dataId);
                      
                      handle.addEventListener('mousedown', (event) => {
                        event.preventDefault();
                        
                        document.dispatchEvent(new CustomEvent('image:resize:start', {
                          detail: {
                            id: node.attrs.dataId,
                            position,
                            width: node.attrs.width,
                            height: node.attrs.height,
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

// Helper function to handle image upload
export function uploadImage(file: File, editor: any, addToHistory = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      console.error('❌ No file provided to uploadImage');
      reject(new Error('No file provided'));
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      console.error('❌ File is not an image:', file.type);
      reject(new Error('File must be an image'));
      return;
    }
    
    console.log('🔄 Starting image upload process for:', file.name);
    
    try {
      // Instead of using base64, we'll use URL.createObjectURL for direct browser references
      // This is more efficient for browser memory and doesn't require encoding/decoding
      const objectUrl = URL.createObjectURL(file);
      console.log('✅ Created object URL for image:', objectUrl);
      
      // If provided, use history manager to record this action
      if (addToHistory && window.historyManager) {
        console.log('📝 Recording history step for image insertion');
        window.historyManager.addHistoryStep('insert-image');
      }
      
      // Insert image into editor at current position with dataId for tracking
      console.log('🖼️ Inserting image into editor with setImage command');
      const imageId = `image-${Date.now()}`;
      
      editor.chain()
        .focus()
        .setImage({ 
          src: objectUrl, 
          alt: file.name,
          title: file.name,
          dataId: imageId,
          // Set some reasonable default dimensions
          width: 400,
          height: 'auto'
        })
        .run();
        
      console.log('🖼️ Image insertion command executed');
      
      // Notify success
      console.log('📣 Dispatching image:inserted event');
      document.dispatchEvent(new CustomEvent('image:inserted', {
        detail: { src: objectUrl, imageId }
      }));
      
      // Return the object URL for any further processing
      resolve(objectUrl);
    } catch (error) {
      console.error('❌ Error in image insertion:', error);
      reject(error);
    }
  });
}

// Function to initialize image listeners in the editor
export function setupImageListeners(editor: any) {
  // Listen for image upload request
  document.addEventListener('toolbar:insertImage', () => {
    console.log('📷 Image upload requested - creating file input');
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.onchange = async (e) => {
      console.log('📷 File selected, processing...');
      const file = (e.target as HTMLInputElement).files?.[0];
      
      if (file) {
        console.log('📷 File details:', file.name, file.type, file.size);
        try {
          console.log('📷 Uploading image to editor...');
          const src = await uploadImage(file, editor);
          console.log('📷 Image uploaded successfully, src length:', src.length);
          
          // We no longer need the fallback since we fixed the main insertion method
          console.log('📷 Image insertion completed successfully');
        } catch (error) {
          console.error('⚠️ Failed to upload image:', error);
        }
      } else {
        console.log('📷 No file selected');
      }
      
      // Remove the input from DOM
      document.body.removeChild(fileInput);
    };
    
    // Trigger file selection
    console.log('📷 Triggering file selection dialog');
    fileInput.click();
  });
  
  // Handle image resize events
  let isResizing = false;
  let initialWidth: number;
  let initialHeight: number;
  let resizingImageId: string | null = null;
  
  // When resize starts
  document.addEventListener('image:resize:start', (e: any) => {
    isResizing = true;
    resizingImageId = e.detail.id;
    initialWidth = parseInt(e.detail.width) || 0;
    initialHeight = parseInt(e.detail.height) || 0;
    
    // Add mousemove and mouseup event listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', finishResize);
  });
  
  // Handle resize during mouse movement
  function handleResize(e: MouseEvent) {
    if (!isResizing || !resizingImageId) return;
    
    // Find the image element
    const image = document.querySelector(`img[data-id="${resizingImageId}"]`) as HTMLImageElement;
    if (!image) return;
    
    // Calculate new dimensions
    const dx = e.movementX;
    const dy = e.movementY;
    
    // Update width and height
    const newWidth = Math.max(50, initialWidth + dx);
    const newHeight = Math.max(50, initialHeight + dy);
    
    // Update image size
    image.style.width = `${newWidth}px`;
    image.style.height = `${newHeight}px`;
    
    // Prevent selecting text during resize
    e.preventDefault();
  }
  
  // When resize ends
  function finishResize() {
    if (!isResizing || !resizingImageId) return;
    
    // Find the image element
    const image = document.querySelector(`img[data-id="${resizingImageId}"]`) as HTMLImageElement;
    if (image) {
      // Get final dimensions
      const finalWidth = parseInt(image.style.width) || initialWidth;
      const finalHeight = parseInt(image.style.height) || initialHeight;
      
      // Find the node position and update attributes
      editor.view.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'image' && node.attrs.dataId === resizingImageId) {
          // Update image node with new dimensions
          editor.chain()
            .setNodeSelection(pos)
            .updateAttributes('image', { 
              width: finalWidth,
              height: finalHeight,
            })
            .run();
          
          // Record resize operation for undo/redo
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
    resizingImageId = null;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', finishResize);
  }
  
  // Handle caption editing
  document.addEventListener('image:edit:caption', (e: any) => {
    const { id, caption } = e.detail;
    
    // Find the image node and update its caption
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'image' && node.attrs.dataId === id) {
        editor.chain()
          .setNodeSelection(pos)
          .updateAttributes('image', { caption })
          .run();
        
        // Record caption edit for undo/redo
        if (window.historyManager) {
          window.historyManager.addHistoryStep('edit-image-caption');
        }
        
        return false;
      }
      return true;
    });
  });
  
  // Handle alt text editing
  document.addEventListener('image:edit:alt', (e: any) => {
    const { id, alt } = e.detail;
    
    // Find the image node and update its alt text
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'image' && node.attrs.dataId === id) {
        editor.chain()
          .setNodeSelection(pos)
          .updateAttributes('image', { alt })
          .run();
        
        // Record alt text edit for undo/redo
        if (window.historyManager) {
          window.historyManager.addHistoryStep('edit-image-alt');
        }
        
        return false;
      }
      return true;
    });
  });
}