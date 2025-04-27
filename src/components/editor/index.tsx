import { useEffect, useState, useRef } from "react";
import { useEditor } from "@tiptap/react";
import { useToast } from "../../hooks/use-toast";
import { useEditorStore } from "../../lib/editor-store";
import { useSearchReplaceStore } from "../../lib/search-replace-store";
import Toolbar from "./toolbar";
import SearchModal from "./search-modal";
import { LineSpacingDialogEnhanced } from "./line-spacing-dialog-enhanced";
// Search functionality removed as requested
import PageManager from "./page-manager";
import CommentsSidebar from "./comments-sidebar";
import CommentModal from "./comment-modal";
import LinkModal from "./link-modal";
import GDocImageToolbar from "./gdoc-image-toolbar"; // Import our new image toolbar
import ImageManager from "./image-manager"; // Import our new image manager
import CommentProvider from "./comment-provider";
import TableContextMenu from "./table-context-menu"; // Import table context menu
import InsertTableButton from "./insert-table-button"; // Import insert table button
import { MessageSquare } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getExtensions, handleTab, handleShiftTab, handleBackspace, handleEnter } from "./tiptap-extensions";
import { HistoryManager } from "./history-manager";
import { setupTabKeyHandlers } from "./tab-key-handler"; // Import our new tab key handler
import { commentObserver } from "./comment-observer"; // Import our comment observer
// Re-added table imports for Google Docs style tables
import { createTable } from "./table-extensions"; // Import table creation function
import { setupGlobalImageHandlers } from "./image-interactive"; // Import setup function for image handlers
import "./console-silencer"; // Import our console silencer to stop the spam
import "./editor-styles.css";
import "./bullet-symbols.css"; // Import bullet styling
import "./numbered-list.css"; // Import numbered list styling
import "./custom.css"; // Import additional custom styles
import "./link-styles.css"; // Import link styling
import "./force-link-css.css"; // Import super aggressive link styling
import "./proper-link-styles.css"; // Import our proper link styles
import "./image-styles.css"; // Import image styling
import "./gdoc-image-styles.css"; // Import Google Docs-style image styling
import "./basic-image-styles.css"; // Import basic image styling for standard Image extension
import "./super-direct-image.css"; // Import super direct image styling
import "./table-styles.css"; // Re-add table styles for Google Docs-style tables
import "./search-styles.css"; // Import search & replace styling
import "./line-spacing-styles.css"; // Import line spacing styling
import "./red-box-styles.css"; // Import red box styling
import "./simple-red-box.css"; // Import simple red box styling
import "./ultimate-red-box.css"; // Import ultimate red box styling
import "./direct-red-box.css"; // Import direct DOM red box styling
import "./image-advanced-styles.css"; // Import advanced image styling
import { styleLinks, setupPeriodicLinkStyling, setupLinkEventListeners } from "./direct-link-styling"; // Import direct link styling
import { initDirectLinkHandler, setupDirectLinkListeners } from "./super-direct-link"; // Import super direct link solution
import { initCustomLinkHandlers } from "./link-custom-handlers"; // Import custom link handlers
import { setupBruteForceLinks } from "./brute-force-links"; // Import brute force link approach
import { applyLinkStyling } from "./proper-link-extension"; // Import our proper link styling function

interface EditorProps {
  initialContent?: any;
  documentId?: number;
  isLoading?: boolean;
  parentCommentSidebar?: boolean;
  toggleParentCommentSidebar?: () => void;
}

export default function EditorComponent({ initialContent, documentId, isLoading = false, parentCommentSidebar = false, toggleParentCommentSidebar }: EditorProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLineSpacingDialog, setShowLineSpacingDialog] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [zoom, setZoom] = useState(100);
  
  // Image-related state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  
  // Table-related state
  const [tableContextMenuPosition, setTableContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  const { toast } = useToast();
  
  // Reference to our custom history manager
  const historyManagerRef = useRef<HistoryManager | null>(null);
  
  // Initialize editor with extensions
  const editor = useEditor({
    extensions: getExtensions(),
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '' }
          ]
        }
      ]
    },
    autofocus: 'end',
  });
  
  // Make editor globally accessible for direct manipulation components like nuclear-image-upload
  useEffect(() => {
    if (editor) {
      (window as any).tiptapEditor = editor;
    }
    
    return () => {
      // Clean up reference when component unmounts
      if ((window as any).tiptapEditor === editor) {
        (window as any).tiptapEditor = null;
      }
    };
  }, [editor]);
  
  // Initialize our custom history manager when the editor is ready
  useEffect(() => {
    if (!editor) return;
    
    // Create our custom history manager and store it in the ref
    historyManagerRef.current = new HistoryManager(editor, 100);
    
    return () => {
      // Clean up if needed
      historyManagerRef.current = null;
    };
  }, [editor]);
  
  // Set up global keyboard shortcuts outside of React's event system
  useEffect(() => {
    // This effect doesn't depend on editor so it runs once and sets up global handlers
    
    // Enhanced handler with higher priority to ensure Ctrl+Z/Y work consistently
    function handleGlobalKeyDown(e: KeyboardEvent) {
      console.log('🎹 Global keydown:', e.key, e.ctrlKey, e.metaKey);
      
      // Handle Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        console.log('🔄 Ctrl/Cmd+Z detected - triggering UNDO');
        // Stop the event immediately to prevent other handlers
        e.stopImmediatePropagation();
        e.preventDefault();
        
        // Get the global history manager and trigger undo
        const historyManager = window.historyManager;
        if (historyManager && typeof historyManager.undo === 'function') {
          historyManager.undo();
          // Dispatch an event to update UI
          document.dispatchEvent(new CustomEvent('history:undoPerformed'));
        } else {
          console.error('History manager not available for Ctrl+Z');
        }
        return false;
      }
      
      // Handle Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac) for Redo
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        console.log('🔄 Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z detected - triggering REDO');
        // Stop the event immediately to prevent other handlers
        e.stopImmediatePropagation();
        e.preventDefault();
        
        // Get the global history manager and trigger redo
        const historyManager = window.historyManager;
        if (historyManager && typeof historyManager.redo === 'function') {
          historyManager.redo();
          // Dispatch an event to update UI
          document.dispatchEvent(new CustomEvent('history:redoPerformed'));
        } else {
          console.error('History manager not available for Ctrl+Y');
        }
        return false;
      }
    }
    
    // CRITICAL FIX: Move our event listener to window instead of document
    // and add with true (capture phase) and highest priority
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true, passive: false });
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Add additional editor features and keyboard shortcuts for editing features
  useEffect(() => {
    if (!editor) return;
    
    // Editor-specific keyboard handler
    const onEditorKeyDown = (e: KeyboardEvent) => {
      // Handle Tab key (indent)
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault(); // Always prevent default tab behavior
        handleTab(editor);
        return;
      }
      
      // Handle Shift+Tab (outdent)
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault(); // Always prevent default tab behavior
        handleShiftTab(editor);
        return;
      }
      
      // Handle Backspace (at paragraph start)
      if (e.key === 'Backspace') {
        if (handleBackspace(editor)) {
          e.preventDefault();
          return;
        }
      }
      
      // Handle Enter (new paragraph with formatting)
      if (e.key === 'Enter' && !e.shiftKey) {
        if (handleEnter(editor)) {
          e.preventDefault();
          return;
        }
      }
    };
    
    // Add keydown event listener to editor
    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', onEditorKeyDown, true); // Use capture phase
    
    // Cleanup function
    return () => {
      // Remove editor-specific event listener
      editorElement.removeEventListener('keydown', onEditorKeyDown, true);
    };
  }, [editor]);
  
  // Listen for any undo/redo events from various sources
  useEffect(() => {
    if (!editor || !historyManagerRef.current) return;
    
    const handleUndoEvent = () => {
      if (historyManagerRef.current && historyManagerRef.current.canUndo()) {
        historyManagerRef.current.undo();
        console.log('Undo event handler - using custom history manager');
      }
    };
    
    const handleRedoEvent = () => {
      if (historyManagerRef.current && historyManagerRef.current.canRedo()) {
        historyManagerRef.current.redo();
        console.log('Redo event handler - using custom history manager');
      }
    };
    
    // Listen for events from various sources:
    // 1. Toolbar buttons
    document.addEventListener('document:undo', handleUndoEvent);
    document.addEventListener('document:redo', handleRedoEvent);
    
    // 2. Our custom keyboard shortcut extension events
    document.addEventListener('customHistoryEvent:undo', handleUndoEvent);
    document.addEventListener('customHistoryEvent:redo', handleRedoEvent);
    
    // 3. Our global keyboard handler events
    document.addEventListener('history:undoPerformed', () => {
      console.log('History undo performed - UI may need to be updated');
    });
    document.addEventListener('history:redoPerformed', () => {
      console.log('History redo performed - UI may need to be updated');
    });
    
    return () => {
      // Clean up all event listeners
      document.removeEventListener('document:undo', handleUndoEvent);
      document.removeEventListener('document:redo', handleRedoEvent);
      document.removeEventListener('customHistoryEvent:undo', handleUndoEvent);
      document.removeEventListener('customHistoryEvent:redo', handleRedoEvent);
      document.removeEventListener('history:undoPerformed', () => {});
      document.removeEventListener('history:redoPerformed', () => {});
    };
  }, [editor]);

  // Set up Tab key handlers for paragraph indentation
  useEffect(() => {
    // Set a small timeout to ensure DOM is ready
    const timerId = setTimeout(() => {
      // Initialize our custom tab key handlers
      setupTabKeyHandlers();
      console.log('Tab key handlers initialized for paragraph indentation');
      
      // Initialize global image handlers for interactive image functionality
      setupGlobalImageHandlers();
      console.log('Global image handlers initialized for resizing and moving');
    }, 500);
    
    return () => clearTimeout(timerId);
  }, []);
  
  // Set up comment click event handler
  useEffect(() => {
    // Handle comment click events from the extension
    function handleCommentClick(e: CustomEvent) {
      if (e.detail && e.detail.id) {
        console.log("Comment click event received:", e.detail.id);
        setActiveCommentId(e.detail.id);
        setShowCommentsSidebar(true);
        
        // If we have a parent handler, call that too
        if (toggleParentCommentSidebar) {
          toggleParentCommentSidebar();
        }
      }
    }
    
    // Add the event listener
    document.addEventListener('comment:clicked', handleCommentClick as EventListener);
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('comment:clicked', handleCommentClick as EventListener);
    };
  }, [setActiveCommentId, toggleParentCommentSidebar]);

  // Set up line spacing dialog event handler
  useEffect(() => {
    // Handle line spacing dialog show event
    function handleShowLineSpacingDialog() {
      console.log("🔍 Line spacing dialog show event received");
      setShowLineSpacingDialog(true);
    }
    
    // Add event listeners for both event names for maximum compatibility
    document.addEventListener('format:lineSpacing:show', handleShowLineSpacingDialog);
    document.addEventListener('lineSpacing:show', handleShowLineSpacingDialog);
    
    // Add a global function for direct access
    window.showLineSpacingDialog = () => {
      console.log("🔍 Global showLineSpacingDialog function called");
      setShowLineSpacingDialog(true);
    };
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('format:lineSpacing:show', handleShowLineSpacingDialog);
      document.removeEventListener('lineSpacing:show', handleShowLineSpacingDialog);
      delete window.showLineSpacingDialog;
    };
  }, []);

  // Set up link click event handler
  useEffect(() => {
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
  }, [editor]);
  
  // Handle red box insertion
  useEffect(() => {
    // Handle inserting a red box when the toolbar button is clicked
    function handleInsertRedBox() {
      if (editor) {
        console.log("Inserting red box in the editor");
        
        // Insert a div with red background and fixed size
        const redBoxHTML = '<div style="width: 100px; height: 100px; background-color: red; margin: 10px 0;"></div>';
        editor.commands.insertContent(redBoxHTML);
        
        // Record history step if we have a history manager
        if (window.historyManager) {
          window.historyManager.addHistoryStep('insert-red-box');
        }
      }
    }
    
    // Add the event listener
    document.addEventListener('insert:redbox', handleInsertRedBox);
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('insert:redbox', handleInsertRedBox);
    };
  }, [editor]);
  
  // Set up event listener for table insertion (Google Docs style)
  useEffect(() => {
    if (!editor) return;
    
    // Handler for inserting a table with the specified dimensions
    const handleInsertTable = (event: CustomEvent) => {
      if (editor) {
        const { rows, cols } = event.detail;
        console.log(`Inserting table with ${rows} rows and ${cols} columns`);
        
        // Focus editor before inserting
        editor.commands.focus();
        
        // Use the createTable helper function to insert a table
        // This creates a table with the proper structure and attributes
        createTable(editor, rows, cols);
        
        // Record history step if we have a history manager
        if (window.historyManager) {
          window.historyManager.addHistoryStep('insert-table');
        }
      }
    };
    
    // Add the event listener
    document.addEventListener('gdoc:editor:insertTable', handleInsertTable as EventListener);
    
    // Clean up when unmounting
    return () => {
      document.removeEventListener('gdoc:editor:insertTable', handleInsertTable as EventListener);
    };
  }, [editor]);

  // Set initial content when loaded
  useEffect(() => {
    if (editor && initialContent && !editor.isDestroyed) {
      try {
        // Handle various cases of initialContent
        if (typeof initialContent === 'string') {
          editor.commands.setContent(initialContent);
        } else if (initialContent.type === 'doc') {
          editor.commands.setContent(initialContent);
        } else if (initialContent.content) {
          // If only doc.content exists without type
          editor.commands.setContent({
            type: 'doc',
            content: initialContent.content
          });
        } else {
          // If we can't use the initialContent, set a default empty doc
          editor.commands.setContent({
            type: 'doc',
            content: [{ type: 'paragraph' }]
          });
        }
      } catch (err) {
        console.error('Error setting initial content:', err);
        // Fallback to empty document on error
        editor.commands.setContent({
          type: 'doc',
          content: [{ type: 'paragraph' }]
        });
      }
    }
  }, [editor, initialContent]);

  // Toggle search modal
  const toggleSearchModal = () => {
    setShowSearchModal(!showSearchModal);
  };

  // Predefined zoom levels matching Google Docs
  const zoomLevels = [50, 75, 100, 125, 150, 175, 200];
  
  // Function to set zoom to nearest predefined level
  const setZoomLevel = (level: number) => {
    // Find closest allowed zoom level
    const closest = zoomLevels.reduce((prev, curr) => {
      return (Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev);
    });
    setZoom(closest);
  };

  // This useEffect is no longer needed - now using comment:clicked event
  // from the comment extension plugin in the useEffect above
  
  // Initialize the Comment Observer for persistent comment highlighting
  useEffect(() => {
    // We need a reference to the editor container
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
  }, []);
  
  // Initialize the Global Link Styler for aggressive link styling - disabled for now
  useEffect(() => {
    if (!editor) return;
    
    console.log("🔗 Global Link Styler disabled to stop console spam");
    
    // Force an initial styling pass after a short delay - but only for the main styling
    setTimeout(() => {
      // Apply main link styling only
      styleLinks();
    }, 300);
    
    // Clean up when unmounting
    return () => {
      // No cleanup needed anymore
    };
  }, [editor]);

  // Initialize ALL our link handler methods - using multiple methods for maximum compatibility
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
        
        // TODO: Store the link element reference so we can update it
        // window.lastClickedLink = e.detail.element;
      }
    }) as EventListener);
    
    return () => {
      // Cleanup
      document.removeEventListener('link:directClicked', (() => {}) as EventListener);
      
      // Run all cleanup functions
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [editor]);
  
  // Set up Google Docs-style image handlers
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Google Docs-style image handling...");
    
    // Initialize our new Google Docs-style image handlers
    // Removed setupImageHandlers call temporarily
    
    // Image selection events will be rebuilt in future update
    // For now, we're simplifying to a basic implementation
    
    // Placeholder for future image handling functionality
    function handleBasicImageEvents() {
      console.log("Basic image event handling initialized");
      // Future implementation will go here
    }
    
    // Handle table context menu events
    function setupTableContextMenu() {
      if (!editor) return;
      
      // Add event listener for right-click on tables
      const editorDOM = editor.view.dom;
      const handleContextMenu = (e: MouseEvent) => {
        // Check if click was inside a table cell
        const target = e.target as HTMLElement;
        const isTableCell = !!target.closest('td, th');
        
        if (isTableCell) {
          // Prevent default browser context menu
          e.preventDefault();
          
          // Show our custom context menu at click position
          setTableContextMenuPosition({
            x: e.clientX,
            y: e.clientY
          });
        }
      };
      
      // Add the event listener to the editor DOM
      editorDOM.addEventListener('contextmenu', handleContextMenu);
      
      // Also listen for document clicks to close the menu when clicking outside
      const handleDocumentClick = (e: MouseEvent) => {
        // If we have an open context menu, close it when clicking outside
        if (tableContextMenuPosition) {
          setTableContextMenuPosition(null);
        }
      };
      
      // Add the event listener to the document
      document.addEventListener('click', handleDocumentClick);
      
      console.log("Table context menu handling initialized");
      
      // Return cleanup function
      return () => {
        editorDOM.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('click', handleDocumentClick);
      };
    }
    
    // Initialize handlers
    handleBasicImageEvents();
    const cleanupTableContextMenu = setupTableContextMenu();
    
    return () => {
      // Cleanup table context menu handler
      if (cleanupTableContextMenu) cleanupTableContextMenu();
      // Cleanup will be added in future implementation for image events
    };
  }, [editor, selectedImageId, tableContextMenuPosition]);
  
  // Re-added table context menu support
  
  // Set up handlers for table insertion
  useEffect(() => {
    if (!editor) return;
    
    // Handle table insertion from toolbar
    const handleTableInsert = () => {
      console.log("Table insertion requested from toolbar");
      
      // Show a floating table dimension selector
      const editorRect = editor.view.dom.getBoundingClientRect();
      const position = {
        x: editorRect.left + editorRect.width / 2 - 100, // Center horizontally
        y: editorRect.top + 100 // Position below toolbar
      };
      
      // Create a temporary div for the table grid selector
      const selectorContainer = document.createElement('div');
      selectorContainer.className = 'table-grid-selector-container';
      selectorContainer.style.position = 'absolute';
      selectorContainer.style.left = `${position.x}px`;
      selectorContainer.style.top = `${position.y}px`;
      selectorContainer.style.zIndex = '1000';
      document.body.appendChild(selectorContainer);
      
      // Render the grid selector inside this container
      // (In a production app, we'd use ReactDOM.render here)
      // For now, we'll use a simpler approach with createTable directly
      
      // Clean up after selection is made
      const cleanup = () => {
        if (selectorContainer && selectorContainer.parentNode) {
          selectorContainer.parentNode.removeChild(selectorContainer);
        }
        document.removeEventListener('click', handleClickOutside);
      };
      
      // Close on outside click
      const handleClickOutside = (e: MouseEvent) => {
        if (!selectorContainer.contains(e.target as Node)) {
          cleanup();
        }
      };
      
      // Add listeners
      document.addEventListener('click', handleClickOutside);
      
      // Use the createTable function with default dimensions
      // This is a temporary solution until we implement the full grid selector
      setTimeout(() => {
        // In a real implementation, this would be triggered by user selection
        // from the grid selector UI
        createTable(editor, 3, 3);
        cleanup();
      }, 100);
    };
    
    // Listen for table insert requests
    document.addEventListener('gdoc:toolbar:insertTable', handleTableInsert as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('gdoc:toolbar:insertTable', handleTableInsert as EventListener);
    };
  }, [editor]);
  
  // Also keep our former link styling approach as a fallback
  useEffect(() => {
    if (!editor) return;
    
    console.log("Initializing Proper Link Styling...");
    
    // Set up periodic link styling - this will continuously check for links
    setupPeriodicLinkStyling();
    
    // Set up event listeners for link-related events
    setupLinkEventListeners();
    
    // Create a timer to continuously check and apply link styling
    const stylingTimer = setInterval(() => {
      // Apply proper link styling (new extension)
      applyLinkStyling();
      
      // Also apply legacy link styling as an extra fallback
      styleLinks();
    }, 500);
    
    // Apply initial link styling
    setTimeout(() => {
      applyLinkStyling(); // Apply our new proper link styling
      styleLinks(); // Also apply legacy link styling as a fallback
      console.log("Initial link styling applied with proper link extension");
    }, 200);
    
    // Set up transaction handlers to style links after any editor changes
    editor.on('transaction', () => {
      setTimeout(() => {
        applyLinkStyling(); // Apply our new proper link styling
        styleLinks(); // Also apply legacy styling as a fallback
      }, 10);
    });
    
    // Clean up when component unmounts
    return () => {
      clearInterval(stylingTimer);
    };
  }, [editor]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow p-8 items-center">
        <div className="w-full max-w-[816px] h-[1123px] bg-white animate-pulse rounded-sm"></div>
      </div>
    );
  }
  
  return (
    <CommentProvider editor={editor} documentId={documentId}>
      {/* Image Manager to handle advanced Google Docs-style image features */}
      <ImageManager />
      <div className="flex flex-col flex-grow">
        <Toolbar 
          editor={editor} 
          toggleSearchModal={toggleSearchModal}
          zoom={zoom}
          setZoom={setZoomLevel}
          zoomLevels={zoomLevels}
          toggleCommentSidebar={() => {
            console.log("Comment sidebar toggle clicked");
            
            // DIRECT APPROACH: Always toggle the sidebar whenever this function is called
            // This avoids any potential race conditions or stale state
            
            if (toggleParentCommentSidebar) {
              // Call the parent handler if provided
              console.log("Calling parent toggle function");
              toggleParentCommentSidebar();
            }
            
            // IMPORTANT: Always toggle the local sidebar state directly
            // This ensures we always see state changes regardless of parent behavior
            const newState = !showCommentsSidebar;
            console.log("Explicitly toggling comment sidebar to:", newState);
            setShowCommentsSidebar(newState);
            
            // If we're opening the sidebar, also ensure we don't have the comment modal open
            if (newState && showCommentModal) {
              setShowCommentModal(false);
            }
            
            // Set focus back to editor after toggling sidebar
            if (editor) {
              setTimeout(() => {
                editor.commands.focus();
              }, 100);
            }
          }}
          toggleComment={() => {
            if (!editor) return;
            
            try {
              // DIRECT APPROACH: Bypass all selection checks and use what's available
              // This makes the comment system more forgiving of edge cases
              
              // First check the editor's selection directly
              const editorSelection = editor.state.selection;
              const from = editorSelection.from;
              const to = editorSelection.to;
              const hasEditorSelection = from !== to;
              
              // Also check the browser's selection as a fallback
              const browserSelection = window.getSelection();
              const hasBrowserSelection = browserSelection && 
                                          !browserSelection.isCollapsed && 
                                          browserSelection.toString().trim().length > 0;
              
              // Get text from either source
              let selectedText = "";
              
              if (hasEditorSelection) {
                // Get text from editor selection (preferred)
                selectedText = editor.state.doc.textBetween(from, to, " ");
                console.log("Using editor selection:", selectedText);
              } else if (hasBrowserSelection && browserSelection) {
                // Get text from browser selection (fallback)
                selectedText = browserSelection.toString();
                console.log("Using browser selection:", selectedText);
              }
              
              // Final check if we have any usable selection
              if (!selectedText || selectedText.trim().length === 0) {
                console.log("No valid selection found");
                toast({
                  title: "No text selected",
                  description: "Please select some text to comment on",
                  variant: "destructive"
                });
                return;
              }
              
              // IMPORTANT: Force selection to be valid for the comment system
              // This ensures we always have something to comment on
              const validFrom = hasEditorSelection ? from : (editor.state.selection.from || 0);
              const validTo = hasEditorSelection ? to : (validFrom + selectedText.length);
              
              console.log("Comment button clicked with selection:", 
                "Text:", selectedText, 
                "From:", validFrom, 
                "To:", validTo);
              
              // Store the valid selection in global window object
              window.lastEditorSelection = {
                from: validFrom,
                to: validTo, 
                text: selectedText
              };
              
              // Show the comment modal
              setShowCommentModal(true);
              console.log("Selection stored and comment modal opened");
            } catch (error) {
              console.error("Error in comment button handler:", error);
              toast({
                title: "Error",
                description: "There was an error processing your comment request",
                variant: "destructive"
              });
            }
          }}
          toggleHeaderFooterMode={() => {
            // Delegate to PageManager's header footer mode
            // This creates a communication channel between toolbar and page manager
            const event = new CustomEvent('toggleHeaderFooterMode');
            document.dispatchEvent(event);
          }}
        />
        
        {/* Legacy search modal - will be deprecated */}
        {showSearchModal && editor && (
          <SearchModal editor={editor} onClose={() => setShowSearchModal(false)} />
        )}
        
        {/* Search functionality removed as requested */}
        
        {showCommentsSidebar && editor && (
          <CommentsSidebar 
            editor={editor} 
            onClose={() => setShowCommentsSidebar(false)} 
            openCommentId={activeCommentId}
          />
        )}
        
        {showCommentModal && editor && (
          <CommentModal 
            editor={editor} 
            onClose={() => {
              // Clear stored selection when closing
              (window as any).lastEditorSelection = null;
              setShowCommentModal(false);
            }}
            onSuccess={(commentId) => {
              setActiveCommentId(commentId);
              if (toggleParentCommentSidebar) {
                toggleParentCommentSidebar();
              } else {
                setShowCommentsSidebar(true);
              }
            }}
          />
        )}
        
        {showLinkModal && editor && (
          <LinkModal 
            editor={editor} 
            onClose={() => {
              setShowLinkModal(false);
            }}
            selectionText={selectedText}
          />
        )}
        
        {/* Line & Paragraph Spacing Dialog - Enhanced Version */}
        {showLineSpacingDialog && editor && (
          <LineSpacingDialogEnhanced
            editor={editor}
            isOpen={showLineSpacingDialog}
            onClose={() => setShowLineSpacingDialog(false)}
          />
        )}
        
        {/* Google Docs-style Image toolbar for selected images */}
        {editor && (
          <GDocImageToolbar
            editor={editor}
            imageId={selectedImageId}
          />
        )}
        
        {/* Table context menu */}
        {editor && tableContextMenuPosition && (
          <TableContextMenu
            editor={editor}
            position={tableContextMenuPosition}
            onClose={() => setTableContextMenuPosition(null)}
          />
        )}
        
        {/* Insert Table Button UI */}
        <InsertTableButton />
        
        <main className="flex-grow overflow-auto bg-gray-100">
          <div className="p-8 flex flex-col items-center">
            {/* Document manager with pagination */}
            <PageManager editor={editor} zoom={zoom} />
          </div>
        </main>
      </div>
    </CommentProvider>
  );
}
