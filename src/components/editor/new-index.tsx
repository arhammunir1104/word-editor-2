import { useEffect, useState, useRef } from "react";
import { useEditor } from "@tiptap/react";
import { useToast } from "../../hooks/use-toast";
import { useEditorStore } from "../../lib/editor-store";
import { useSearchReplaceStore } from "../../lib/search-replace-store";
import CommentProvider from "./comment-provider";
import { getExtensions } from "./tiptap-extensions";
import { HistoryManager } from "./history-manager";

// Import our new modular components
import {
  EditorToolbar,
  EditorModals,
  EditorContent,
  CommentsSidebarContainer,
  EditorEvents
} from "./components";

// Import all required CSS
import "./console-silencer"; 
import "./editor-styles.css";
import "./bullet-symbols.css";
import "./numbered-list.css";
import "./custom.css";
import "./link-styles.css";
import "./force-link-css.css";
import "./proper-link-styles.css";
import "./image-styles.css";
import "./gdoc-image-styles.css";
import "./table-styles.css";
import "./search-styles.css";

interface EditorProps {
  initialContent?: any;
  documentId?: number;
  isLoading?: boolean;
  parentCommentSidebar?: boolean;
  toggleParentCommentSidebar?: () => void;
}

export default function EditorComponent({ 
  initialContent, 
  documentId, 
  isLoading = false, 
  parentCommentSidebar = false, 
  toggleParentCommentSidebar 
}: EditorProps) {
  // UI state
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
  
  // Table context menu state
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
  
  // Initialize our custom history manager when the editor is ready
  useEffect(() => {
    if (!editor) return;
    
    // Create our custom history manager and store it in the ref
    historyManagerRef.current = new HistoryManager(editor, 100);
    
    // Also make it available globally for other components
    window.historyManager = historyManagerRef.current;
    
    return () => {
      // Clean up if needed
      historyManagerRef.current = null;
      delete window.historyManager;
    };
  }, [editor]);
  
  // Handler to toggle comment modal
  const toggleComment = () => {
    if (!editor) return;
    
    try {
      // Get the current selection from the editor
      const { state } = editor;
      const { from, to } = state.selection;
      const hasEditorSelection = !state.selection.empty;
      
      // Get selected text, trim it if needed
      let selectedText = '';
      if (hasEditorSelection) {
        selectedText = state.doc.textBetween(from, to, ' ');
      }
      
      console.log("Comment button toggled with selection:", 
        "Has selection:", hasEditorSelection,
        "Text:", selectedText);
      
      // Ensure we have a valid selection
      if (!hasEditorSelection && selectedText.trim() === '') {
        console.log("No valid selection for comment");
        toast({
          title: "Select text first",
          description: "Please select some text to comment on",
          variant: "default"
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
  };

  // Handler for toggling header/footer mode
  const toggleHeaderFooterMode = () => {
    // Delegate to PageManager's header footer mode
    // This creates a communication channel between toolbar and page manager
    const event = new CustomEvent('toggleHeaderFooterMode');
    document.dispatchEvent(event);
  };

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

  // Main render
  return (
    // <CommentProvider>
    <>
      <div className="flex flex-col h-full w-full bg-white editor-wrapper">
        {/* Editor Events - Non-visual component to handle events */}
        <EditorEvents
          editor={editor}
          selectedImageId={selectedImageId}
          setSelectedImageId={setSelectedImageId}
          setShowLinkModal={setShowLinkModal}
          setShowLineSpacingDialog={setShowLineSpacingDialog}
          setActiveCommentId={setActiveCommentId}
          toggleParentCommentSidebar={toggleParentCommentSidebar}
          setShowCommentsSidebar={setShowCommentsSidebar}
          setTableContextMenuPosition={setTableContextMenuPosition}
          setSelectedText={setSelectedText}
          tableContextMenuPosition={tableContextMenuPosition}
        />

        {/* Editor Toolbar */}
        <EditorToolbar
          editor={editor}
          toggleSearchModal={() => setShowSearchModal(!showSearchModal)}
          zoom={zoom}
          setZoom={setZoom}
          toggleHeaderFooterMode={toggleHeaderFooterMode}
          toggleCommentSidebar={() => setShowCommentsSidebar(!showCommentsSidebar)}
          toggleComment={toggleComment}
        />
        
        {/* Editor Modals */}
        <EditorModals
          editor={editor}
          showSearchModal={showSearchModal}
          showCommentModal={showCommentModal}
          showLinkModal={showLinkModal}
          showLineSpacingDialog={showLineSpacingDialog}
          tableContextMenuPosition={tableContextMenuPosition}
          selectedText={selectedText}
          setShowSearchModal={setShowSearchModal}
          setShowCommentModal={setShowCommentModal}
          setShowLinkModal={setShowLinkModal}
          setShowLineSpacingDialog={setShowLineSpacingDialog}
          setTableContextMenuPosition={setTableContextMenuPosition}
          setActiveCommentId={setActiveCommentId}
          toggleParentCommentSidebar={toggleParentCommentSidebar}
          setShowCommentsSidebar={setShowCommentsSidebar}
        />
        
        {/* Comments Sidebar */}
        <CommentsSidebarContainer
          editor={editor}
          showCommentsSidebar={showCommentsSidebar}
          activeCommentId={activeCommentId}
          setShowCommentsSidebar={setShowCommentsSidebar}
        />
        
        {/* Editor Content */}
        <EditorContent
          editor={editor}
          zoom={zoom}
          selectedImageId={selectedImageId}
        />
      </div>
    {/* </CommentProvider> */}
    </>
  );
}