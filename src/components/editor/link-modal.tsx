/**
 * Link Modal Component
 * 
 * This component provides a Google Docs-style modal for inserting, editing, and removing links.
 * It allows users to:
 * - Add new links to selected text
 * - Edit existing links (change URL or text)
 * - Remove links while preserving text
 * - All with proper undo/redo support
 */
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { X, ExternalLink, Trash2 } from 'lucide-react';

interface LinkModalProps {
  editor: Editor;
  onClose: () => void;
  selectionText?: string; // Optional text from the current selection
}

export default function LinkModal({ editor, onClose, selectionText = '' }: LinkModalProps) {
  // Check if we're editing an existing link
  const isEditing = editor.isActive('link');
  
  // Get attributes if we're editing an existing link
  const initialAttributes = isEditing ? editor.getAttributes('link') : {};
  const initialUrl = initialAttributes.href || '';
  
  // State for URL input
  const [url, setUrl] = useState<string>(initialUrl);
  // Use selected text or link text if available
  const [text, setText] = useState<string>(selectionText || '');
  
  // References for focus management
  const urlInputRef = useRef<HTMLInputElement>(null);
  
  // Focus URL input on mount
  useEffect(() => {
    if (urlInputRef.current) {
      urlInputRef.current.focus();
      urlInputRef.current.select();
    }
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Record this action for undo/redo history
    if (window.historyManager) {
      window.historyManager.addHistoryStep(isEditing ? 'edit-link' : 'add-link');
    }
    
    // Ensure URL has proper protocol
    let formattedUrl = url.trim();
    if (formattedUrl && !formattedUrl.startsWith('http') && !formattedUrl.startsWith('mailto:')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    // COMPLETELY BYPASS TIPTAP FOR LINK CREATION
    // This uses our super direct link approach
    if (formattedUrl) {
      // Use our custom direct link implementation to insert the link
      // This bypasses TipTap's link handling completely
      
      document.dispatchEvent(new CustomEvent('editor:createDirectLink', {
        detail: { url: formattedUrl }
      }));
      
      // Use the TipTap extension system properly - following ChatGPT's recommendation
      try {
        // Always clear any existing link first to ensure clean application
        editor.chain().focus().unsetLink().run();

        if (!editor.isActive('link')) {
          // Set link with inline styling in the attributes
          editor.chain()
            .focus()
            .extendMarkRange('link')
            .setMark('link', { 
              href: formattedUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              class: 'editor-direct-link custom-link',
              'data-type': 'link',
              'data-is-link': 'true',
              style: 'color: red; background-color: yellow; text-decoration: underline; padding: 0 2px; border-radius: 2px; font-weight: bold;'
            })
            .run();
          
          console.log('✅ Link applied via TipTap extension with inline styling');
        } else {
          // Update existing link with styling
          editor.chain()
            .focus()
            .extendMarkRange('link')
            .updateAttributes('link', { 
              href: formattedUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              class: 'editor-direct-link custom-link',
              'data-type': 'link', 
              'data-is-link': 'true',
              style: 'color: red; background-color: yellow; text-decoration: underline; padding: 0 2px; border-radius: 2px; font-weight: bold;'
            })
            .run();
          
          console.log('✅ Existing link updated via TipTap with new styling');
        }
          
        // Trigger additional link styling via our extension
        setTimeout(() => {
          // Use the extension's applyLinkStyling function
          import('./proper-link-extension').then(module => {
            module.applyLinkStyling();
            console.log('Applied additional link styling via extension');
          });
        }, 100);
      } catch (err) {
        console.error('Error applying link via TipTap:', err);
        
        // Fallback method if TipTap methods fail
        try {
          // Try to use the simplest approach by toggling the mark
          editor.chain()
            .focus()
            .toggleMark('link', { href: formattedUrl })
            .run();
            
          console.log('⚠️ Used fallback method to apply link');
        } catch (fallbackErr) {
          console.error('Even fallback link method failed:', fallbackErr);
        }
      }
      
      // Emit a custom event to trigger styling
      document.dispatchEvent(new CustomEvent('editor:linkAdded'));
      
      // Import direct styling modules
      import('./direct-link-styling').then(module => {
        setTimeout(() => module.styleLinks(), 50);
      });
      
      import('./super-direct-link').then(module => {
        // Apply our super direct link approach if needed
        if (selectionText && selectionText.trim().length > 0) {
          setTimeout(() => {
            module.applyDirectLink(formattedUrl);
            console.log("Applied super direct link to:", selectionText);
          }, 100);
        }
      });
      
      // Import and run our brute force approach
      import('./brute-force-links').then(module => {
        // This is our most aggressive approach - it physically adds styled elements
        setTimeout(() => {
          module.injectBruteForceStyledLinks();
          console.log("Applied BRUTE FORCE link styling");
        }, 200);
      });
    } else {
      // If URL is empty, remove the link
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    
    // Close the modal
    onClose();
  };
  
  // Handle link removal
  const handleRemoveLink = () => {
    // Record this action for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('remove-link');
    }
    
    // Remove the link but keep the text
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    
    // Close the modal
    onClose();
  };
  
  // Handle cancel action
  const handleCancel = () => {
    onClose();
  };
  
  // Open link in a new tab
  const handleOpenLink = () => {
    if (initialUrl) {
      window.open(initialUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h3 className="text-lg font-medium text-gray-800">{isEditing ? 'Edit link' : 'Insert link'}</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Link URL
              </label>
              <Input
                ref={urlInputRef}
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {!url.trim() 
                  ? "Enter a URL to create a link" 
                  : (!url.startsWith('http') && !url.startsWith('mailto:')) 
                    ? "URL will be prefixed with https://" 
                    : ""}
              </p>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleOpenLink}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 border-blue-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveLink}
                      className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!url.trim()}
                  className={`bg-blue-600 hover:bg-blue-700 text-white ${!url.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isEditing ? 'Save' : 'Apply'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}