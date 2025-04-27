import { useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { commentObserver } from '../comment-observer';
import { styleLinks, setupPeriodicLinkStyling, setupLinkEventListeners } from '../direct-link-styling';
import { initDirectLinkHandler, setupDirectLinkListeners } from '../super-direct-link';
import { initCustomLinkHandlers } from '../link-custom-handlers';
import { setupBruteForceLinks } from '../brute-force-links';
import { setupImageHandlers } from '../gdoc-image-extension';

interface EditorEventsProps {
  editor: Editor | null;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  setShowLinkModal: (show: boolean) => void;
  setShowLineSpacingDialog: (show: boolean) => void;
  setActiveCommentId: (id: string | undefined) => void;
  toggleParentCommentSidebar?: () => void;
  setShowCommentsSidebar: (show: boolean) => void;
  setTableContextMenuPosition: (position: { x: number; y: number } | null) => void;
  setSelectedText: (text: string) => void;
  tableContextMenuPosition: { x: number; y: number } | null;
}

/**
 * EditorEvents is a non-visual component that handles all editor event listeners
 * This component centralizes event management for clean organization
 */
export function EditorEvents({
  editor,
  selectedImageId,
  setSelectedImageId,
  setShowLinkModal,
  setShowLineSpacingDialog,
  setActiveCommentId,
  toggleParentCommentSidebar,
  setShowCommentsSidebar,
  setTableContextMenuPosition,
  setSelectedText,
  tableContextMenuPosition
}: EditorEventsProps) {
  // Line spacing dialog event handler
  useEffect(() => {
    if (!editor) return;
    
    // Handle line spacing dialog show event
    function handleShowLineSpacingDialog() {
      console.log("🔍 Line spacing dialog show event received");
      setShowLineSpacingDialog(true);
    }
    
    // Add the event listener
    document.addEventListener('format:lineSpacing:show', handleShowLineSpacingDialog);
    
    // Add a global function for direct access
    window.showLineSpacingDialog = () => {
      console.log("🔍 Global showLineSpacingDialog function called");
      setShowLineSpacingDialog(true);
    };
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('format:lineSpacing:show', handleShowLineSpacingDialog);
      delete window.showLineSpacingDialog;
    };
  }, [editor, setShowLineSpacingDialog]);

  // Comments event handler
  useEffect(() => {
    if (!editor) return;
    
    // Handle comment click events from the extension
    function handleCommentClick(e: CustomEvent) {
      const commentId = e.detail?.commentId;
      if (commentId) {
        console.log("Comment clicked:", commentId);
        setActiveCommentId(commentId);
        
        // Toggle the comment sidebar
        if (toggleParentCommentSidebar) {
          toggleParentCommentSidebar();
        } else {
          setShowCommentsSidebar(true);
        }
      }
    }
    
    // Add the event listener
    document.addEventListener('comment:clicked', handleCommentClick as EventListener);
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('comment:clicked', handleCommentClick as EventListener);
    };
  }, [editor, setActiveCommentId, toggleParentCommentSidebar, setShowCommentsSidebar]);

  // Link event handlers
  useEffect(() => {
    if (!editor) return;
    
    // Handle link click events from the extension
    function handleLinkClick(e: CustomEvent) {
      if (e.detail && e.detail.href) {
        console.log("Link click event received:", e.detail.href);
        
        // Store currently selected text (if any)
        if (editor) {
          const { state } = editor;
          const { from, to } = state.selection;
          const selectedContent = state.doc.textBetween(from, to, ' ');
          setSelectedText(selectedContent);
        }
        
        // Show the link modal
        setShowLinkModal(true);
      }
    }
    
    // Handle insert link events from the toolbar
    function handleInsertLink(e: CustomEvent) {
      console.log("Insert link event received from toolbar");
      
      if (e.detail && typeof e.detail.selectedText === 'string') {
        // Store the selected text
        setSelectedText(e.detail.selectedText);
      } else if (editor) {
        // Fallback: get selection from editor
        const { state } = editor;
        const { from, to } = state.selection;
        const selectedContent = state.doc.textBetween(from, to, ' ');
        setSelectedText(selectedContent);
      }
      
      // Show the link modal
      setShowLinkModal(true);
    }
    
    // Add the event listeners
    document.addEventListener('link:clicked', handleLinkClick as EventListener);
    document.addEventListener('toolbar:insertLink', handleInsertLink as EventListener);
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('link:clicked', handleLinkClick as EventListener);
      document.removeEventListener('toolbar:insertLink', handleInsertLink as EventListener);
    };
  }, [editor, setShowLinkModal, setSelectedText]);

  // Image event handlers
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Google Docs-style image handling...");
    
    // Initialize our new Google Docs-style image handlers
    setupImageHandlers(editor);
    
    // Handle image selection events from our GDocImage extension
    function handleImageSelected(e: CustomEvent) {
      if (e.detail && e.detail.imageId) {
        console.log("Image selected:", e.detail.imageId);
        
        // Store the selected image ID
        setSelectedImageId(e.detail.imageId);
        
        // Record history step for undo/redo
        if (window.historyManager) {
          window.historyManager.addHistoryStep('select-image');
        }
      }
    }
    
    // Handle document clicks to deselect images when clicking elsewhere
    function handleDeselectImage(e: MouseEvent) {
      const target = e.target as HTMLElement;
      
      // Only proceed if we have a selected image
      if (selectedImageId && 
          // And we're clicking outside of image-related elements
          !target.closest('.gdoc-image') && 
          !target.closest('.gdoc-image-toolbar') &&
          !target.closest('.resize-handle')) {
        
        // Deselect the image in state
        setSelectedImageId(null);
        
        // Dispatch event to notify the image extension
        document.dispatchEvent(new CustomEvent('gdoc:image:deselect'));
      }
    }
    
    // Handle Escape key to deselect images
    function handleEscapeKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedImageId) {
        console.log('Deselecting image via Escape key');
        
        // Deselect the image in state
        setSelectedImageId(null);
        
        // Dispatch event to notify the image extension
        document.dispatchEvent(new CustomEvent('gdoc:image:deselect'));
        
        // Prevent default behavior
        e.preventDefault();
      }
    }
    
    // Add event listeners for the GDocImage extension
    document.addEventListener('gdoc:image:selected', handleImageSelected as EventListener);
    document.addEventListener('click', handleDeselectImage);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('gdoc:image:selected', handleImageSelected as EventListener);
      document.removeEventListener('click', handleDeselectImage);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [editor, selectedImageId, setSelectedImageId]);

  // Table event handlers
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Google Docs-style table handling...");
    
    // Handle table context menu events
    function handleTableContextMenu(e: CustomEvent) {
      if (e.detail && e.detail.position) {
        console.log("Table context menu triggered at:", e.detail.position);
        setTableContextMenuPosition(e.detail.position);
      }
    }
    
    // Handle clicks to close the table context menu when clicking elsewhere
    function handleCloseTableContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      
      // Only proceed if we have an open context menu
      if (tableContextMenuPosition && 
          // And we're clicking outside of table-related elements
          !target.closest('.gdocs-table') && 
          !target.closest('.table-context-menu')) {
        
        // Close the context menu
        setTableContextMenuPosition(null);
      }
    }
    
    // Add event listeners for the table extension
    document.addEventListener('table:contextmenu', handleTableContextMenu as EventListener);
    document.addEventListener('click', handleCloseTableContextMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && tableContextMenuPosition) {
        setTableContextMenuPosition(null);
      }
    });
    
    return () => {
      document.removeEventListener('table:contextmenu', handleTableContextMenu as EventListener);
      document.removeEventListener('click', handleCloseTableContextMenu);
    };
  }, [editor, tableContextMenuPosition, setTableContextMenuPosition]);

  // Initialize the Comment Observer for persistent comment highlighting
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing CommentObserver...");
    
    // Get all editor containers to observe
    // We need to observe both the editor itself and any page containers
    const editorElement = editor.view.dom;
    const editorContainer = editorElement.closest('.editor-wrapper') || document.body;
    
    // Initialize our comment observer
    commentObserver.initialize(editorContainer as HTMLElement);
    
    // Force an initial styling pass
    setTimeout(() => {
      commentObserver.forceCommentStyling();
    }, 500);
    
    // Clean up the observer when unmounting
    return () => {
      commentObserver.disconnect();
    };
  }, [editor]);

  // Initialize ALL link handler methods
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing ALL Link Handlers...");
    
    // Store cleanup functions
    const cleanupFunctions: Array<() => void> = [];
    
    // Initialize all our link handling methods for maximum compatibility
    setTimeout(() => {
      // Method 1: Super Direct Link
      initDirectLinkHandler();
      setupDirectLinkListeners();
      
      // Method 2: Custom Link Handlers
      initCustomLinkHandlers();
      
      // Method 3: BRUTE FORCE APPROACH - This is our most aggressive method
      // It physically replaces links with custom elements
      const cleanup = setupBruteForceLinks();
      cleanupFunctions.push(cleanup);
      
      console.log("All link handlers initialized including BRUTE FORCE method!");
    }, 500);
    
    // Set up handler for direct link clicks
    document.addEventListener('link:directClicked', ((e: CustomEvent) => {
      if (e.detail && e.detail.href) {
        console.log("Direct link clicked, showing modal for URL:", e.detail.href);
        
        // Open link modal with existing URL
        setShowLinkModal(true);
      }
    }) as EventListener);
    
    return () => {
      // Cleanup
      document.removeEventListener('link:directClicked', (() => {}) as EventListener);
      
      // Run all cleanup functions
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [editor, setShowLinkModal]);

  // Initialize the Global Link Styler for aggressive link styling
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Proper Link Styling...");
    
    // Force an initial styling pass after a short delay - but only for the main styling
    setTimeout(() => {
      // Apply main link styling only
      styleLinks();
    }, 300);
    
    return () => {
      // No specific cleanup needed
    };
  }, [editor]);

  // Global event listeners through React's useEffect
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Proper Link Styling...");
    
    // Set up periodic link styling - this will continuously check for links
    setupPeriodicLinkStyling();
    
    // Set up event listeners for link-related events
    setupLinkEventListeners();
    
    return () => {
      // Cleanup will be handled by those functions internally
    };
  }, [editor]);

  // Return null since this is a non-visual component
  return null;
}

export default EditorEvents;