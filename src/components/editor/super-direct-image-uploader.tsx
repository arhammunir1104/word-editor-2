import React, { useState, useRef, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent, DialogClose, Dialog } from "../../components/ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { Image as ImageIcon, X as CloseIcon, Upload } from "lucide-react";
import { insertImageSuperDirect, insertImageWithParagraph } from './super-direct-image';

/**
 * A component that provides image upload and insertion functionality
 * using direct DOM manipulation to bypass TipTap's standard approach
 */
const SuperDirectImageUploader: React.FC = () => {
  // State
  const [open, setOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadingStatus, setUploadingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isInserting, setIsInserting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  // Function to verify that the image was actually inserted in the DOM
  const verifyImageInsertion = (imageUrl: string, maxAttempts = 3) => {
    if (attemptCount >= maxAttempts) {
      console.log(`Reached max attempts (${maxAttempts}). Stopping verification.`);
      return;
    }
    
    setTimeout(() => {
      // Look for images in the editor with our src
      const editorImages = document.querySelectorAll('.ProseMirror img, .page-content img');
      let imageFound = false;
      
      // Check if any of the images have our URL
      editorImages.forEach(img => {
        if ((img as HTMLImageElement).src === imageUrl) {
          imageFound = true;
          console.log('Image verification SUCCESS: Found image in the DOM');
        }
      });
      
      // If not found, try insertion again with a more aggressive approach
      if (!imageFound && imageUrlRef.current) {
        console.log(`Image verification FAILED (attempt ${attemptCount + 1}). Trying more aggressive insertion...`);
        setAttemptCount(prevCount => prevCount + 1);
        
        // Try more aggressive insertion approaches for each attempt
        if (attemptCount === 0) {
          // First retry - use direct DOM insertion into every possible container
          const containers = document.querySelectorAll('.ProseMirror, .page-content, .document-page');
          containers.forEach(container => {
            try {
              const img = document.createElement('img');
              img.src = imageUrl;
              img.style.maxWidth = '90%';
              img.style.display = 'block';
              img.style.margin = '10px auto';
              container.prepend(img);
            } catch (e) {
              console.error('Error in aggressive retry 1:', e);
            }
          });
        } else if (attemptCount === 1) {
          // Second retry - use execCommand
          document.execCommand('insertImage', false, imageUrl);
        } else {
          // Final attempt - insert directly into the body as a last resort
          try {
            const editorArea = document.querySelector('.document-page');
            if (editorArea) {
              const img = document.createElement('img');
              img.src = imageUrl;
              img.style.position = 'absolute';
              img.style.top = '100px';
              img.style.left = '50%';
              img.style.transform = 'translateX(-50%)';
              img.style.maxWidth = '90%';
              img.style.zIndex = '9999';
              editorArea.appendChild(img);
            }
          } catch (e) {
            console.error('Error in final retry:', e);
          }
        }
        
        // Try verification again after a delay
        verifyImageInsertion(imageUrl, maxAttempts);
      } else {
        // If found or we've reached max attempts, clean up
        setIsInserting(false);
        imageUrlRef.current = null;
        setAttemptCount(0);
      }
    }, 500); // Wait a bit for the DOM to update
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept image files
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Start processing
    setUploadingStatus('processing');

    // Convert to base64 for direct insertion
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImage(event.target.result as string);
        setUploadingStatus('success');
      }
    };
    reader.onerror = () => {
      setUploadingStatus('error');
      toast({
        title: "Error processing image",
        description: "Could not read the selected image file",
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle insertion of the uploaded image into the editor
  const handleInsertImage = () => {
    if (!uploadedImage || isInserting) return;

    // Set inserting state to prevent multiple clicks
    setIsInserting(true);
    
    // Store the image URL in ref for potential retries
    imageUrlRef.current = uploadedImage;

    try {
      // First try our super direct insertion method
      const superDirectResult = insertImageSuperDirect(uploadedImage);
      
      if (!superDirectResult) {
        // Try fallback approach
        const paragraphResult = insertImageWithParagraph(uploadedImage);
        
        if (!paragraphResult) {
          // Last resort nuclear approach: Direct DOM injection
          // Find all possible editor elements
          const editorElements = document.querySelectorAll('.ProseMirror, .page-content, .document-page');
          let inserted = false;
          
          if (editorElements.length > 0) {
            // Create image element
            const img = document.createElement('img');
            img.src = uploadedImage;
            img.style.display = 'block';
            img.style.maxWidth = '90%';
            img.style.margin = '10px auto';
            img.className = 'nuclear-direct-image';
            
            // Try to insert into every possible editor target
            editorElements.forEach((editor) => {
              try {
                if (editor.firstChild) {
                  editor.insertBefore(img.cloneNode(true), editor.firstChild);
                } else {
                  editor.appendChild(img.cloneNode(true));
                }
                inserted = true;
              } catch (e) {
                console.error('Error in nuclear insertion:', e);
              }
            });
            
            if (!inserted) {
              throw new Error("Failed to insert image using all methods");
            }
          } else {
            throw new Error("Could not find any editor elements");
          }
        }
      }

      // Double-check by trying to use the global editor reference as well
      try {
        // Access global editor if available
        const globalEditor = (window as any).tiptapEditor;
        if (globalEditor) {
          globalEditor.commands.insertContent(`<img src="${uploadedImage}" alt="Image" style="max-width: 90%; display: block; margin: 10px auto;">`);
          console.log('Also tried insertion through global editor reference');
        }
      } catch (globalError) {
        // Just log this error but continue since we've already tried other methods
        console.warn('Additional insertion attempt failed:', globalError);
      }

      // Start verification process to make sure image was actually inserted
      verifyImageInsertion(uploadedImage);

      // Show success message
      toast({
        title: "Image inserted",
        description: "Image was successfully added to the document",
      });

      // Close the dialog and reset state
      setOpen(false);
      setUploadedImage(null);
      setUploadingStatus('idle');

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error inserting image:", error);
      
      // STILL ATTEMPT TO INSERT THE IMAGE as a last resort
      // Try with execCommand directly
      try {
        document.execCommand('insertImage', false, uploadedImage);
        
        // Start verification even after emergency insertion method
        verifyImageInsertion(uploadedImage);
        
        toast({
          title: "Image inserted",
          description: "Image was added to the document using fallback method",
        });
        
        // Close the dialog
        setOpen(false);
        setUploadedImage(null);
        setUploadingStatus('idle');
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (finalError) {
        // Now we truly failed
        toast({
          title: "Image insertion failed",
          description: "Could not insert the image. Please try again or refresh the page.",
          variant: "destructive"
        });
        
        // Reset inserting state
        setIsInserting(false);
        imageUrlRef.current = null;
        setAttemptCount(0);
      }
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setUploadedImage(null);
    setUploadingStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset the file input when dialog is closed
  const handleDialogClose = () => {
    handleClose();
    setOpen(false);
  };

  // Handle button click to open file browser
  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 p-0 flex items-center justify-center" 
        onClick={() => setOpen(true)}
        title="Insert image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={handleDialogClose}>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>
              Upload an image from your computer to insert into the document.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            {/* Image preview area */}
            {uploadedImage ? (
              <div className="relative w-full max-w-full h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden">
                <img
                  src={uploadedImage}
                  alt="Image preview"
                  className="object-contain max-h-full max-w-full"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-white dark:bg-gray-700 rounded-full shadow-sm"
                  onClick={() => {
                    setUploadedImage(null);
                    setUploadingStatus('idle');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center w-full h-36 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                onClick={handleSelectClick}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Click to select an image
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  JPEG, PNG, GIF, etc.
                </div>
              </div>
            )}

            {/* Status message */}
            {uploadingStatus === 'processing' && (
              <div className="text-sm text-blue-500">Processing image...</div>
            )}
            {uploadingStatus === 'error' && (
              <div className="text-sm text-red-500">Error processing image. Please try again.</div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleInsertImage}
              disabled={!uploadedImage || uploadingStatus === 'processing'}
            >
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuperDirectImageUploader;