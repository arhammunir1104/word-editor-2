/**
 * Comment Modal Component
 * 
 * A modal dialog that appears when the user clicks the "Comment" button
 * in the toolbar after selecting text. This allows the user to enter
 * a comment about the selected text.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { useComments } from './comment-provider';
import { Editor } from '@tiptap/react';
import { commentObserver } from './comment-observer';

interface CommentModalProps {
  editor: Editor;
  onClose: () => void;
  onSuccess?: (commentId: string) => void;
}

export default function CommentModal({ editor, onClose, onSuccess }: CommentModalProps) {
  const [comment, setComment] = useState('');
  const { addComment } = useComments();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus the textarea when the modal opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (!comment.trim()) return;
    
    try {
      // Make sure we have a stored selection to use
      if (!window.lastEditorSelection) {
        console.error("No stored selection available");
        alert('Please select text to comment on.');
        return;
      }
      
      // Get the selection from the stored value
      const { from, to, text: selectedText } = window.lastEditorSelection;
      
      console.log("Comment modal - using stored selection:", 
        selectedText,
        "from:", from,
        "to:", to);
      
      if (!selectedText || selectedText.trim().length === 0 || from === to) {
        alert('Please select some text to comment on.');
        return;
      }
      
      // Add the comment to our comment store
      const commentId = addComment(selectedText, comment, from, to);
      
      console.log("Applying comment to text:", selectedText);
      
      // SIMPLIFIED & RELIABLE APPROACH: Single direct transaction for comment marking
      try {
        // Focus the editor first
        editor.commands.focus();
        
        // Create a new transaction
        const tr = editor.view.state.tr;
        
        // Get the comment mark with the new comment ID
        const mark = editor.schema.marks.comment.create({ 
          id: commentId
        });
        
        // Add the mark to the specified range
        tr.addMark(from, to, mark);
        
        // Dispatch the transaction to apply the mark
        editor.view.dispatch(tr);
        
        console.log("Applied comment mark via transaction");
        
        // Use our CommentObserver to guarantee styling
        setTimeout(() => {
          try {
            // Force the CommentObserver to style all comments
            commentObserver.forceCommentStyling();
            
            // Specifically highlight this comment
            commentObserver.highlightComment(commentId);
            
            console.log(`Used CommentObserver to style and highlight comment ${commentId}`);
          } catch (err) {
            console.error("Error applying styling via CommentObserver:", err);
            
            // Fallback to direct styling as a last resort
            try {
              // Find all elements with this comment ID
              const elements = document.querySelectorAll(`[data-comment-id="${commentId}"]`);
              
              if (elements.length > 0) {
                // Force style each element
                elements.forEach(el => {
                  // Add our special classes
                  el.classList.add('comment-mark', 'yellow-highlight');
                  
                  // Direct inline styling
                  (el as HTMLElement).style.cssText = `
                    background-color: #FFEF9E !important; 
                    background: #FFEF9E !important; 
                    color: black !important; 
                    border-bottom: 2px solid #F2C94C !important; 
                    padding: 2px 0 !important; 
                    display: inline !important; 
                    border-radius: 2px !important;
                  `;
                });
              }
            } catch (fallbackErr) {
              console.error("Even fallback styling failed:", fallbackErr);
            }
          }
        }, 100);
        
        // Add to history manager
        if (window.historyManager) {
          window.historyManager.addHistoryStep('add-comment');
        }
        
        // Log success for debugging
        console.log("Comment successfully added:", commentId);
        
        // CRITICAL: Ensure comment styling is applied IMMEDIATELY
        // This multi-layered approach guarantees styling is applied
        try {
          // 1. Apply styling via CommentObserver
          setTimeout(() => {
            // Force immediate styling on all comments
            commentObserver.forceCommentStyling();
            
            // Specifically highlight this comment with animation
            commentObserver.highlightComment(commentId);
            
            console.log("Applied styling via CommentObserver");
          }, 0);
          
          // 2. Direct DOM manipulation as a fallback
          setTimeout(() => {
            try {
              const commentElements = document.querySelectorAll(`[data-comment-id="${commentId}"]`);
              console.log(`Found ${commentElements.length} elements with comment ID ${commentId}`);
              
              if (commentElements.length > 0) {
                commentElements.forEach(el => {
                  const element = el as HTMLElement;
                  
                  // Apply classes
                  element.classList.add('comment-mark', 'yellow-highlight');
                  
                  // Apply inline styling directly
                  element.setAttribute('style', 
                    'background-color: #FFEF9E !important;' +
                    'background: #FFEF9E !important;' +
                    'border-bottom: 2px solid #F2C94C !important;' +
                    'padding: 2px 0 !important;' +
                    'display: inline !important;' +
                    'border-radius: 2px !important;' +
                    'position: relative !important;' +
                    'z-index: 2 !important;' +
                    'box-shadow: 0 0 0 2px #FFEF9E !important;' +
                    'color: black !important;'
                  );
                });
                
                console.log("Applied direct DOM styling to comment elements");
              }
            } catch (err) {
              console.error("Error in direct DOM styling fallback:", err);
            }
          }, 50);
        } catch (stylingError) {
          console.error("Error applying comment styling:", stylingError);
        }
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(commentId);
        }
        
        // Clear stored selection
        window.lastEditorSelection = undefined;
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error("Error in comment mark application:", error);
        
        // FALLBACK: Try another approach if the direct transaction failed
        try {
          // Force selection again
          editor.commands.setTextSelection({ from, to });
          
          // Use the command chain API instead
          editor.chain()
            .focus()
            .setMark('comment', { id: commentId })
            .run();
          
          console.log("Applied comment mark via command chain (fallback)");
          
          // CRITICAL: Apply the same styling enhancements in the fallback path too
          try {
            // 1. Apply styling via CommentObserver
            setTimeout(() => {
              // Force immediate styling on all comments
              commentObserver.forceCommentStyling();
              
              // Specifically highlight this comment with animation
              commentObserver.highlightComment(commentId);
              
              console.log("Applied styling via CommentObserver (fallback path)");
            }, 0);
            
            // 2. Direct DOM manipulation as a second fallback
            setTimeout(() => {
              try {
                const commentElements = document.querySelectorAll(`[data-comment-id="${commentId}"]`);
                console.log(`Found ${commentElements.length} elements with comment ID ${commentId}`);
                
                if (commentElements.length > 0) {
                  commentElements.forEach(el => {
                    const element = el as HTMLElement;
                    
                    // Apply classes
                    element.classList.add('comment-mark', 'yellow-highlight');
                    
                    // Apply inline styling directly
                    element.setAttribute('style', 
                      'background-color: #FFEF9E !important;' +
                      'background: #FFEF9E !important;' +
                      'border-bottom: 2px solid #F2C94C !important;' +
                      'padding: 2px 0 !important;' +
                      'display: inline !important;' +
                      'border-radius: 2px !important;' +
                      'position: relative !important;' +
                      'z-index: 2 !important;' +
                      'box-shadow: 0 0 0 2px #FFEF9E !important;' +
                      'color: black !important;'
                    );
                  });
                  
                  console.log("Applied direct DOM styling to comment elements (fallback path)");
                }
              } catch (err) {
                console.error("Error in direct DOM styling fallback:", err);
              }
            }, 50);
          } catch (stylingError) {
            console.error("Error applying comment styling in fallback path:", stylingError);
          }
          
          // Clear stored selection
          window.lastEditorSelection = undefined;
          
          // Call the success callback if provided
          if (onSuccess) {
            onSuccess(commentId);
          }
          
          // Close the modal
          onClose();
        } catch (fallbackError) {
          console.error("Both comment application methods failed:", fallbackError);
          alert("Failed to apply comment. Please try again with a different text selection.");
        }
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert('There was an error adding your comment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div 
        className="bg-white rounded-md shadow-lg w-full max-w-md p-4 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Add comment</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full" 
            onClick={() => {
              window.lastEditorSelection = undefined;
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          {(window as any).lastEditorSelection 
            ? 'Add your comment about the selected text:' 
            : 'Please select text to comment on.'}
        </div>
        
        <Textarea
          ref={textareaRef}
          className="min-h-[100px] mb-4"
          placeholder="Write your comment here"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!(window as any).lastEditorSelection}
        />
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline" 
            onClick={() => {
              window.lastEditorSelection = undefined;
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || !(window as any).lastEditorSelection}
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}