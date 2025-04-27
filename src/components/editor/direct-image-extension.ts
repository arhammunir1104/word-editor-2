import { Extension, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import TiptapImage from '@tiptap/extension-image';

/**
 * DirectImage extension
 * A simplified version of the image extension that focuses on reliability
 */
export const DirectImage = TiptapImage.extend({
  name: 'directImage',

  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true, // Enable base64 images
      HTMLAttributes: {
        class: 'direct-image',
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      
      // Add a direct command to insert an image from a File object
      insertImageFromFile: (file: File) => ({ commands }: any) => {
        return new Promise<boolean>((resolve) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const src = e.target?.result as string;
            
            // Use the standard setImage command from @tiptap/extension-image
            const result = commands.setImage({ 
              src, 
              alt: file.name,
              title: file.name,
            });
            
            resolve(result);
          };
          
          reader.onerror = () => {
            console.error('Error reading file:', reader.error);
            resolve(false);
          };
          
          // Read the file as data URL (base64)
          reader.readAsDataURL(file);
        });
      }
    };
  }
});

/**
 * Helper function to insert an image from a File object
 */
export function insertImageFromFile(file: File, editor: any): Promise<boolean> {
  if (!editor) {
    console.error('Editor is not available');
    return Promise.resolve(false);
  }
  
  return new Promise<boolean>((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const src = e.target?.result as string;
      
      // Use the standard setImage command
      const result = editor.chain().focus().setImage({
        src,
        alt: file.name,
        title: file.name
      }).run();
      
      console.log('Image inserted:', result ? 'success' : 'failed');
      resolve(result);
    };
    
    reader.onerror = () => {
      console.error('Error reading file:', reader.error);
      resolve(false);
    };
    
    // Read the file as data URL
    reader.readAsDataURL(file);
  });
}