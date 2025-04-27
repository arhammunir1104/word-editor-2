import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';

/**
 * Brute Force Image Button
 * 
 * This component completely bypasses TipTap and directly manipulates the DOM
 * to insert images using document.createElement and direct DOM insertion.
 * 
 * It's the most direct approach possible for inserting images.
 */
export default function BruteForceImageButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Find the active document editor (there might be multiple in multi-page)
  const findActiveEditor = (): HTMLElement | null => {
    // Try various methods to find the editor element
    
    // Method 1: Look for focused editor
    const activeEditor = document.querySelector('.ProseMirror:focus') as HTMLElement;
    if (activeEditor) return activeEditor;
    
    // Method 2: Look for any editor with a selection
    const editors = document.querySelectorAll('.ProseMirror');
    for (let i = 0; i < editors.length; i++) {
      const editor = editors[i] as HTMLElement;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          return editor;
        }
      }
    }
    
    // Method 3: Just use the first available editor
    if (editors.length > 0) return editors[0] as HTMLElement;
    
    // Method 4: Look for contenteditable areas
    const editables = document.querySelectorAll('[contenteditable="true"]');
    if (editables.length > 0) return editables[0] as HTMLElement;
    
    return null;
  };
  
  // Directly insert an image at the current cursor position
  const insertImageBruteForce = (imageUrl: string): boolean => {
    try {
      // Get the active editor element
      const editor = findActiveEditor();
      if (!editor) {
        console.error('Could not find editor element');
        return false;
      }
      
      // Try to focus it
      editor.focus();
      
      // Create the image element
      const img = document.createElement('img');
      img.src = imageUrl;
      img.style.maxWidth = '100%';
      img.style.margin = '10px 0';
      img.setAttribute('data-direct-insert', 'true');
      
      // Get current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // No selection found, just append to the editor
        console.log('No selection found, appending to editor');
        editor.appendChild(img);
        
        // Try to trigger TipTap to recognize the change
        const inputEvent = new InputEvent('input', { bubbles: true });
        editor.dispatchEvent(inputEvent);
        
        return true;
      }
      
      // Get the current range
      const range = selection.getRangeAt(0);
      
      // Insert at the cursor position
      range.deleteContents();
      range.insertNode(img);
      
      // Move the cursor after the image
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Try to trigger TipTap to recognize the change
      const inputEvent = new InputEvent('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
      
      // Dispatch a custom event to let other parts of the app know an image was inserted
      document.dispatchEvent(new CustomEvent('image:inserted', {
        detail: { imageUrl }
      }));
      
      console.log('Image inserted successfully via brute force approach');
      return true;
    } catch (error) {
      console.error('Error in brute force image insertion:', error);
      return false;
    }
  };
  
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      // Try to focus editor first
      const editor = findActiveEditor();
      if (editor) editor.focus();
      
      // Open file dialog
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('Selected image:', file.name);
    
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
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Insert with brute force approach
      const success = insertImageBruteForce(dataUrl);
      
      if (success) {
        toast({
          title: 'Image inserted',
          description: `${file.name} was added to your document`
        });
      } else {
        toast({
          title: 'Failed to insert image',
          description: 'Please try again or use a different image',
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
  
  // Test function to insert a placeholder image (on double click)
  const insertTestImage = () => {
    const success = insertImageBruteForce('https://via.placeholder.com/300x200');
    
    if (success) {
      toast({
        title: 'Test image inserted',
        description: 'Placeholder image was added for testing'
      });
    } else {
      toast({
        title: 'Failed to insert test image',
        description: 'Could not insert the placeholder image',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        onDoubleClick={insertTestImage}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image (brute force method)"
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
    </>
  );
}