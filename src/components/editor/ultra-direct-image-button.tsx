import React, { useRef, useEffect } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';

/**
 * Ultra Direct Image Button
 * This component bypasses TipTap completely and directly manipulates the DOM
 * to insert images at the current cursor position
 */
export default function UltraDirectImageButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Function to directly find the TipTap editor DOM element
  const findEditorElement = (): HTMLElement | null => {
    // Try to find the editor element by its class
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
    if (editorEl) return editorEl;
    
    // Fallback: look for any contenteditable element
    const editableEls = document.querySelectorAll('[contenteditable="true"]');
    if (editableEls.length > 0) {
      return editableEls[0] as HTMLElement;
    }
    
    return null;
  };
  
  // Function to directly insert an image into the editor
  const insertImageDirectly = (url: string): boolean => {
    try {
      const editorEl = findEditorElement();
      if (!editorEl) {
        console.error('Cannot find editor element');
        return false;
      }
      
      // Focus the editor
      editorEl.focus();
      
      // Create an image element
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '100%';
      
      // Try to get the current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // If no selection, just append to the editor
        console.log('No selection found, appending to editor');
        editorEl.appendChild(img);
        return true;
      }
      
      // Get the current range and insert the image
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      
      // Move cursor after the image
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Dispatch input event to make TipTap recognize the change
      editorEl.dispatchEvent(new Event('input', { bubbles: true }));
      
      return true;
    } catch (error) {
      console.error('Error in direct image insertion:', error);
      return false;
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("Image selected:", file.name);
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Try to insert the image directly
      const success = insertImageDirectly(dataUrl);
      console.log(`Ultra direct image insertion: ${success ? 'Success' : 'Failed'}`);
      
      if (success) {
        toast({
          title: "Image inserted",
          description: `Image ${file.name} was successfully added to your document`,
        });
      } else {
        // If direct insertion fails, fallback to execCommand as last resort
        try {
          const editorEl = findEditorElement();
          if (editorEl) editorEl.focus();
          
          const cmdSuccess = document.execCommand('insertImage', false, dataUrl);
          console.log(`Fallback execCommand: ${cmdSuccess ? 'Success' : 'Failed'}`);
          
          if (cmdSuccess) {
            toast({
              title: "Image inserted (fallback)",
              description: `Image ${file.name} was added using fallback method`,
            });
          } else {
            throw new Error('Fallback method failed');
          }
        } catch (error) {
          console.error('All image insertion methods failed:', error);
          toast({
            title: "Failed to insert image",
            description: "Could not insert the image. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Failed to read the selected image",
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle click on the button
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // For testing with a placeholder image (double click)
  const handleDoubleClick = () => {
    const success = insertImageDirectly('https://via.placeholder.com/300');
    console.log(`Inserted placeholder image: ${success ? 'success' : 'failed'}`);
    
    if (success) {
      toast({
        title: "Test image inserted",
        description: "Placeholder image was inserted for testing",
      });
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image (ultra direct method)"
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