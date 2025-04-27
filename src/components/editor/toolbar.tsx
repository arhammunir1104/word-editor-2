import { Editor } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "../../lib/editor-store";
import { HistoryManager } from "./history-manager";
import { applyFontFamily, applyFontSize, applyHeading, toggleMark } from "./text-formatting-utils";
import { insertRedBox } from "./insert-red-box";

// Print function for Google Docs-style printing - IMPROVED EXACT VISUAL MATCH
const handlePrint = () => {
  // This approach uses a separate print window to avoid browser chrome showing
  // Create a new window for printing only
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert('Please allow pop-ups to use the print feature');
    return;
  }
  
  // Get the document content
  const documentPages = document.querySelectorAll('.document-page');
  
  // Prepare the HTML for the print window with EXACT visual matching
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Document</title>
      <style>
        @page {
          size: letter;
          margin: 0; /* Remove default margins to match our visual layout exactly */
        }
        
        body {
          font-family: Arial, sans-serif;
          color: black;
          background: white;
          margin: 0;
          padding: 0;
          /* Disable any scaling or adjustments by browser */
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Clone the exact visual appearance */
        .print-page {
          position: relative;
          width: 8.5in;
          height: 11in;
          box-sizing: border-box;
          page-break-after: always;
          overflow: hidden; /* Prevent content from flowing to next page */
          border: none;
        }
        
        .print-page:last-child {
          page-break-after: auto;
        }
        
        /* Preserve the exact styling without any browser adjustments */
        .page-content {
          position: relative;
          margin: 1in; /* Standard 1-inch margins inside the page */
          height: calc(11in - 2in); /* Account for top and bottom margins */
          overflow: hidden; /* Critical: prevent content overflow */
        }
        
        /* Fix header/footer positioning */
        .page-header, .page-footer {
          position: absolute;
          left: 1in;
          right: 1in;
          font-size: 9pt;
          color: #666;
          height: 30px;
          line-height: 30px;
        }
        
        .page-header {
          top: 0.5in;
        }
        
        .page-footer {
          bottom: 0.5in;
        }
        
        /* Preserve exact text and element formatting */
        * {
          box-sizing: border-box;
          /* Ensure all elements retain exact sizing */
          max-width: 100%;
        }
        
        /* Ensure images don't resize */
        img {
          max-width: 100%;
        }
        
        /* Fix table display */
        table {
          width: auto;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body onload="window.print(); window.setTimeout(function(){ window.close(); }, 500);">
  `;
  
  // Only include the VISIBLE pages from the editor (those that actually exist in DOM)
  const visiblePages = Array.from(documentPages).filter(page => {
    // Check if page is actually rendered and visible in the DOM
    const rect = page.getBoundingClientRect();
    const style = window.getComputedStyle(page);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  
  console.log(`Total pages: ${documentPages.length}, Visible pages: ${visiblePages.length}`);
  
  // Clone ONLY the visible pages with EXACT structure
  visiblePages.forEach((page, index) => {
    // Clone the entire page as-is to preserve exact layout
    const pageClone = page.cloneNode(true) as HTMLElement;
    
    // Get exact dimensions from the original page
    const computedStyle = window.getComputedStyle(page);
    const width = computedStyle.width;
    const height = computedStyle.height;
    
    // Remove any toolbar/UI elements from the clone
    const toolbars = pageClone.querySelectorAll('.toolbar, .menu-bar, button, [role="button"], .dropdown');
    toolbars.forEach((el: Element) => el.parentNode?.removeChild(el));
    
    // Create a clean clone of just the content
    const pageContentEl = pageClone.querySelector('.page-content');
    const headerEl = pageClone.querySelector('.page-header');
    const footerEl = pageClone.querySelector('.page-footer');
    
    // Start a new page div with exact dimensions
    printContent += `<div class="print-page" style="width:${width}; height:${height};">`;
    
    // Add header if exists
    if (headerEl) {
      printContent += `
        <div class="page-header">
          ${headerEl.innerHTML}
        </div>
      `;
    }
    
    // Add main content - preserve exact HTML structure
    if (pageContentEl) {
      printContent += `
        <div class="page-content">
          ${pageContentEl.innerHTML}
        </div>
      `;
    }
    
    // Add footer if exists
    if (footerEl) {
      printContent += `
        <div class="page-footer">
          ${footerEl.innerHTML}
        </div>
      `;
    }
    
    // Close the page div
    printContent += `</div>`;
  });
  
  // Close the HTML
  printContent += `
    </body>
    </html>
  `;
  
  // Write to the new window and initiate print
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
};
import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY, detectFontSize, detectFontFamily, detectTextColor, detectBackgroundColor, GLOBAL_FORMAT_STATE } from './format-detection';
import { indentParagraphsDirect, outdentParagraphsDirect } from './direct-paragraph-indent';
import { setLineSpacing } from './line-spacing-extension';
import ImageTestButton from './image-test'; // Import our test component
import GDocImageUploadButton from './gdoc-image-upload-button'; // Import our Google Docs image upload button
import SimpleImageButton from './simple-image-button'; // Import simple image button
import ExecCommandImageButton from './exec-command-image-button'; // Import execCommand image button
import DirectExecImageButton from './direct-exec-image-button'; // Import direct execCommand image button
import UltraDirectImageButton from './ultra-direct-image-button'; // Import ultra direct image button
import BruteForceImageButton from './brute-force-image-button'; // Import brute force image button
import NuclearImageUpload from './nuclear-image-upload'; // Import nuclear image upload button
import SuperDirectImageUploader from './super-direct-image-uploader'; // Import our super direct image uploader
// Table-related components removed
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ChevronDown, Undo, Redo, Image, Search, Moon, Sun,
  Printer, FileText, Link, MessageSquare, Highlighter, Type, Indent, Outdent,
  XCircle, ArrowUpDown, PanelTop, PanelBottom, FileInput, ArrowDownUp, Table,
} from "lucide-react";
import { useTheme } from "../../components/theme-provider";
import { debounce } from "../../lib/utils";

const fontOptions = [
  { name: "Arial", value: "Arial" },
  { name: "Roboto", value: "Roboto" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Georgia", value: "Georgia" },
  { name: "Courier New", value: "Courier New" },
  { name: "Verdana", value: "Verdana" },
];

const fontSizeOptions = [8, 9, 10, 11, 12, 14, 18, 24, 36, 48, 72];

const zoomOptions = [50, 75, 90, 100, 125, 150, 175, 200];

interface ToolbarProps {
  editor: Editor | null;
  toggleSearchModal: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomLevels?: number[];
  toggleHeaderFooterMode?: () => void;
  toggleCommentSidebar?: () => void;
  toggleComment?: () => void;
  headers?: string[];
  footers?: string[];
}

export default function Toolbar({ 
  editor, 
  toggleSearchModal, 
  zoom, 
  setZoom, 
  zoomLevels,
  toggleHeaderFooterMode,
  toggleCommentSidebar,
  toggleComment,
  headers,
  footers 
}: ToolbarProps) {
  const [currentFontSize, setCurrentFontSize] = useState<number>(11);
  const [currentFont, setCurrentFont] = useState<string>("Arial");
  const [currentHeadingLevel, setCurrentHeadingLevel] = useState<number | null>(null);
  // Add explicit state tracking for text formatting
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  // Add state for text color and background color
  const [textColor, setTextColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  // Add state for bullet list with enhanced nesting level tracking
  const [isBulletList, setIsBulletList] = useState<boolean>(false);
  const [isOrderedList, setIsOrderedList] = useState<boolean>(false);
  const [bulletListLevel, setBulletListLevel] = useState<number>(1);
  const historyManagerRef = useRef<HistoryManager | null>(null);
  const title = useEditorStore((state) => state.title);
  const setTitle = useEditorStore((state) => state.setTitle);
  const { theme, setTheme } = useTheme();
  
  // Clear all formatting from the selected text
  const clearFormatting = () => {
    if (!editor) return;
    
    editor.chain()
      .focus()
      .unsetAllMarks() // Removes bold, italic, underline, etc.
      .clearNodes() // Clears headings, lists, etc.
      .run();
      
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  // Simplified function that just uses the global state
  const updateCurrentFontSize = () => {
    if (!editor) return;
    
    // Always use the global state as source of truth
    console.log(`Toolbar: Using global font size: ${GLOBAL_FORMAT_STATE.fontSize}px`);
    setCurrentFontSize(GLOBAL_FORMAT_STATE.fontSize);
  };

  // Simplified function that just uses the global state
  const updateCurrentFont = () => {
    if (!editor) return;
    
    // Always use the global state as source of truth
    console.log(`Toolbar: Using global font family: "${GLOBAL_FORMAT_STATE.fontFamily}"`);
    setCurrentFont(GLOBAL_FORMAT_STATE.fontFamily);
  };
  
  // Function to detect current heading level
  const updateCurrentHeadingLevel = () => {
    if (!editor) return;
    
    // Check for heading levels using the editor's isActive method
    // This is more reliable than checking the node structure
    if (editor.isActive('heading', { level: 1 })) {
      setCurrentHeadingLevel(1);
    } else if (editor.isActive('heading', { level: 2 })) {
      setCurrentHeadingLevel(2);
    } else if (editor.isActive('heading', { level: 3 })) {
      setCurrentHeadingLevel(3);
    } else if (editor.isActive('heading', { level: 4 })) {
      setCurrentHeadingLevel(4);
    } else if (editor.isActive('heading', { level: 5 })) {
      setCurrentHeadingLevel(5);
    } else {
      setCurrentHeadingLevel(null);
    }
  };

  // Initialize history manager when editor is ready
  useEffect(() => {
    if (!editor) return;
    
    // Create our custom history manager and store it in the ref
    historyManagerRef.current = new HistoryManager(editor, 100);
    
    return () => {
      // Clean up if needed
      historyManagerRef.current = null;
    };
  }, [editor]);

  // Update the UI when selection changes
  useEffect(() => {
    if (!editor) return;
    
    // Improved debounced function to update all formatting controls
    const updateFormatting = debounce(() => {
      console.log('🔍 Updating toolbar formatting based on cursor position');
      
      // Font detection from GLOBAL_FORMAT_STATE (updated by document-page.tsx)
      updateCurrentFontSize();
      updateCurrentFont();
      updateCurrentHeadingLevel();
      
      // Detect text formatting directly if editor is available
      if (editor) {
        // Get current formatting status directly from editor
        const boldActive = editor.isActive('bold');
        const italicActive = editor.isActive('italic');
        const underlineActive = editor.isActive('underline');
        
        console.log(`Direct detection - Bold: ${boldActive}, Italic: ${italicActive}, Underline: ${underlineActive}`);
        
        // Update component's local state
        setIsBold(boldActive);
        setIsItalic(italicActive);
        setIsUnderline(underlineActive);
        
        // Also update global state for other components
        GLOBAL_FORMAT_STATE.setBold(boldActive);
        GLOBAL_FORMAT_STATE.setItalic(italicActive);
        GLOBAL_FORMAT_STATE.setUnderline(underlineActive);
        
        // Detect text color and background color
        const detectedTextColor = detectTextColor(editor);
        const detectedBgColor = detectBackgroundColor(editor);
        
        console.log(`Detected colors - Text: ${detectedTextColor}, Background: ${detectedBgColor}`);
        
        // Update component's local state
        setTextColor(detectedTextColor);
        setBackgroundColor(detectedBgColor);
        
        // Also update global state for other components
        GLOBAL_FORMAT_STATE.setTextColor(detectedTextColor);
        GLOBAL_FORMAT_STATE.setBackgroundColor(detectedBgColor);
        
        // Detect bullet list and ordered list state
        const bulletListActive = editor.isActive('bulletList');
        const orderedListActive = editor.isActive('orderedList');
        
        // Update component's local state
        setIsBulletList(bulletListActive);
        setIsOrderedList(orderedListActive);
        
        // If we're in a bullet list, determine the level
        if (bulletListActive) {
          // Get level from GLOBAL_FORMAT_STATE (set by custom-bullet-list.ts)
          setBulletListLevel(GLOBAL_FORMAT_STATE.bulletListLevel);
          console.log(`Toolbar detected bullet list level: ${GLOBAL_FORMAT_STATE.bulletListLevel}`);
        }
        
        // Also update global state
        GLOBAL_FORMAT_STATE.setBulletList(bulletListActive);
        GLOBAL_FORMAT_STATE.setOrderedList(orderedListActive);
      }
    }, 20); // reduced debounce time for snappier updates
    
    // Event handler for cursor movement
    const handleSelectionChange = () => {
      console.log('🔍 Selection change detected, updating toolbar');
      updateFormatting();
    };
    
    // Event handler for any transaction (edits, formatting changes)
    const handleTransaction = () => {
      console.log('🔍 Transaction detected, updating toolbar');
      updateFormatting();
    };
    
    // Track all relevant editor events more precisely
    editor.on('selectionUpdate', handleSelectionChange);
    editor.on('transaction', handleTransaction);
    editor.on('focus', updateFormatting);
    editor.on('update', updateFormatting); // Important for multi-page setups
    
    // Also track when cursor is moved via keyboard or clicks
    const editorDOM = editor.view.dom;
    
    // Store reference to event handler functions so we can remove them properly
    const handleEditorClick = () => updateFormatting();
    
    const handleKeyNavigation = (e: KeyboardEvent) => {
      // Only update on navigation keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        console.log('🔍 Cursor navigation detected, updating toolbar');
        updateFormatting();
      }
    };
    
    editorDOM.addEventListener('click', handleEditorClick);
    editorDOM.addEventListener('keyup', handleKeyNavigation);
    
    // Additional event to trigger a UI update when text style changes
    document.addEventListener('format:applied', updateFormatting);
    
    // Handle specific cursor positioning after document mutations
    document.addEventListener('content:changed', updateFormatting);
    
    // Listen for format:update events from individual page editors
    // This is crucial for receiving cursor position updates from active pages
    const handleFormatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        const { editor: pageEditor, pageIndex } = customEvent.detail;
        console.log(`Toolbar received format:update from page ${pageIndex}`);
        
        if (pageEditor) {
          // Direct format detection on the active editor
          const boldActive = pageEditor.isActive('bold');
          const italicActive = pageEditor.isActive('italic');
          const underlineActive = pageEditor.isActive('underline');
          
          console.log(`Toolbar direct detection - Bold: ${boldActive}, Italic: ${italicActive}, Underline: ${underlineActive}`);
          
          // Update our component state variables directly
          setIsBold(boldActive);
          setIsItalic(italicActive);
          setIsUnderline(underlineActive);
          
          // Also update global state for other components
          GLOBAL_FORMAT_STATE.setBold(boldActive);
          GLOBAL_FORMAT_STATE.setItalic(italicActive);
          GLOBAL_FORMAT_STATE.setUnderline(underlineActive);
          
          // Detect bullet list state
          const bulletListActive = pageEditor.isActive('bulletList');
          const orderedListActive = pageEditor.isActive('orderedList');
          
          // Update component's local state
          setIsBulletList(bulletListActive);
          setIsOrderedList(orderedListActive);
          
          // If we're in a bullet list, determine the level
          if (bulletListActive) {
            // Get level from GLOBAL_FORMAT_STATE or detect it from editor
            const level = GLOBAL_FORMAT_STATE.bulletListLevel;
            setBulletListLevel(level);
            console.log(`Toolbar detected bullet list level via format:update: ${level}`);
          }
          
          // Update global state for bullet lists
          GLOBAL_FORMAT_STATE.setBulletList(bulletListActive);
          GLOBAL_FORMAT_STATE.setOrderedList(orderedListActive);
          
          // Update heading level based on the active editor
          if (pageEditor.isActive('heading', { level: 1 })) {
            setCurrentHeadingLevel(1);
          } else if (pageEditor.isActive('heading', { level: 2 })) {
            setCurrentHeadingLevel(2);
          } else if (pageEditor.isActive('heading', { level: 3 })) {
            setCurrentHeadingLevel(3);
          } else if (pageEditor.isActive('heading', { level: 4 })) {
            setCurrentHeadingLevel(4);
          } else if (pageEditor.isActive('heading', { level: 5 })) {
            setCurrentHeadingLevel(5);
          } else {
            setCurrentHeadingLevel(null);
          }
          
          // Get font details directly from the active editor
          const fontSize = detectFontSize(pageEditor);
          const fontFamily = detectFontFamily(pageEditor);
          const detectedTextColor = detectTextColor(pageEditor);
          const detectedBgColor = detectBackgroundColor(pageEditor);
          
          if (fontSize > 0) {
            GLOBAL_FORMAT_STATE.setFontSize(fontSize);
            setCurrentFontSize(fontSize);
          }
          
          if (fontFamily) {
            GLOBAL_FORMAT_STATE.setFontFamily(fontFamily);
            setCurrentFont(fontFamily);
          }
          
          // Update text color and background color
          if (detectedTextColor) {
            GLOBAL_FORMAT_STATE.setTextColor(detectedTextColor);
            setTextColor(detectedTextColor);
          }
          
          if (detectedBgColor !== undefined) {
            GLOBAL_FORMAT_STATE.setBackgroundColor(detectedBgColor);
            setBackgroundColor(detectedBgColor);
          }
          
          console.log(`Toolbar format state after update - Bold: ${GLOBAL_FORMAT_STATE.bold}, Italic: ${GLOBAL_FORMAT_STATE.italic}, Underline: ${GLOBAL_FORMAT_STATE.underline}`);
        } else {
          // If no editor is provided, fall back to global state update
          updateFormatting();
        }
      }
    };
    
    document.addEventListener('format:update', handleFormatUpdate);
    
    // Initial update
    updateFormatting();
    
    return () => {
      // Clean up event listeners
      editor.off('selectionUpdate', handleSelectionChange);
      editor.off('transaction', handleTransaction);
      editor.off('focus', updateFormatting);
      editor.off('update', updateFormatting);
      
      editorDOM.removeEventListener('click', handleEditorClick);
      editorDOM.removeEventListener('keyup', handleKeyNavigation);
      
      document.removeEventListener('format:applied', updateFormatting);
      document.removeEventListener('content:changed', updateFormatting);
      document.removeEventListener('format:update', handleFormatUpdate);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => {
    // Dispatch a format command event to be handled by the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'toggleBold'
      }
    }));
    
    // Also run on the main editor to update toolbar state
    if (editor) {
      editor.chain().toggleBold().run();
    }
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  const toggleItalic = () => {
    // Dispatch a format command event to be handled by the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'toggleItalic'
      }
    }));
    
    // Also run on the main editor to update toolbar state
    if (editor) {
      editor.chain().toggleItalic().run();
    }
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  const toggleUnderline = () => {
    // Dispatch a format command event to be handled by the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'toggleUnderline'
      }
    }));
    
    // Also run on the main editor to update toolbar state
    if (editor) {
      editor.chain().toggleUnderline().run();
    }
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  const toggleBulletList = () => {
    // Dispatch a format command event to be handled by the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'toggleBulletList'
      }
    }));
    
    // Also run on the main editor to update toolbar state
    if (editor) {
      // Using the command defined in final-bullet-list.ts
      editor.chain().focus().toggleList('bulletList', 'listItem').run();
    }
    
    // Add history step
    if (window.historyManager) {
      window.historyManager.addHistoryStep('toggle-bullet');
    }
  };

  const toggleOrderedList = () => {
    // Dispatch a format command event to be handled by the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'toggleOrderedList'
      }
    }));
    
    // Also run on the main editor to update toolbar state
    if (editor) {
      try {
        // Use our custom toggleOrderedList command defined in numbered-list.ts
        // Split into multiple calls to avoid transaction conflicts
        editor.chain().focus().run();
        editor.commands.toggleOrderedList();
      } catch (error) {
        console.error('Error toggling ordered list:', error);
      }
    }
    
    // Add history step
    if (window.historyManager) {
      window.historyManager.addHistoryStep('toggle-numbered-list');
    }
  };

  const setFontSize = (size: number) => {
    // Update the global state first - this ensures toolbar consistency
    GLOBAL_FORMAT_STATE.setFontSize(size);
    
    // Then dispatch the format command for the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'setFontSize',
        attrs: `${size}px`
      }
    }));
    
    // Update the UI
    setCurrentFontSize(size);
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  const setFontFamily = (font: string) => {
    // Update the global state first - this ensures toolbar consistency
    GLOBAL_FORMAT_STATE.setFontFamily(font);
    
    // Then dispatch the format command for the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'setFontFamily',
        attrs: font
      }
    }));
    
    // Update the UI
    setCurrentFont(font);
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };

  const setTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    // Dispatch an event for the active editor to handle
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'setTextAlign',
        attrs: align
      }
    }));
    
    // Add history step
    if (historyManagerRef && historyManagerRef.current) {
      historyManagerRef.current.addHistoryStep();
    }
  };
  
  // Apply text color to selection or at cursor position
  const applyTextColor = (color: string) => {
    // Update the global state first - this ensures toolbar consistency
    GLOBAL_FORMAT_STATE.setTextColor(color);
    
    // Then dispatch the format command for the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'setColor',
        attrs: color
      }
    }));
    
    // Update the UI
    setTextColor(color);
    
    // Add history step using window.historyManager for global access
    if (window.historyManager) {
      window.historyManager.addHistoryStep('text-color-change');
    }
  };
  
  // Apply background (highlight) color to selection or at cursor position
  const applyBackgroundColor = (color: string) => {
    // Update the global state first - this ensures toolbar consistency
    GLOBAL_FORMAT_STATE.setBackgroundColor(color);
    
    // Then dispatch the format command for the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'setHighlight',
        attrs: { color }
      }
    }));
    
    // Update the UI
    setBackgroundColor(color);
    
    // Add history step using window.historyManager for global access
    if (window.historyManager) {
      window.historyManager.addHistoryStep('background-color-change');
    }
  };
  
  // Remove background (highlight) color
  const removeBackgroundColor = () => {
    // Update the global state first - this ensures toolbar consistency
    GLOBAL_FORMAT_STATE.setBackgroundColor('');
    
    // Then dispatch the format command for the active editor
    document.dispatchEvent(new CustomEvent('formatCommand', {
      detail: {
        command: 'unsetHighlight'
      }
    }));
    
    // Update the UI
    setBackgroundColor('');
    
    // Add history step using window.historyManager for global access
    if (window.historyManager) {
      window.historyManager.addHistoryStep('remove-highlight');
    }
  };

  const insertImage = () => {
    // Dispatch a custom event to trigger the image insertion flow
    // This uses our new Google Docs style image extension's file picker
    document.dispatchEvent(new CustomEvent('gdoc:toolbar:insertImage'));
    
    // Record this operation for undo/redo history
    if (window.historyManager) {
      window.historyManager.addHistoryStep('insert-image-intent');
    }
  };
  
  const insertPageBreak = () => {
    editor.chain().focus().insertContent('<hr class="page-break" />').run();
  };

  /**
   * Indent the current paragraph or list item
   * Implements Google Docs indentation behavior exactly:
   * - In bullet/ordered lists: Increases nesting level
   * - In paragraphs: Increases left margin by 36px (0.5 inches)
   * - Works with multiple selected paragraphs
   * - Integrates with global history for undo/redo
   */
  const indent = () => {
    // If in a list, use list indentation commands
    if (editor.isActive('bulletList')) {
      if (editor.can().sinkListItem('listItem')) {
        editor.chain().focus().sinkListItem('listItem').run();
        
        // Add history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('indent-bullet-list');
        }
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('bulletList:indented'));
        
        console.log('Indented bullet list item');
      }
      return;
    }
    
    if (editor.isActive('orderedList')) {
      if (editor.can().sinkListItem('listItem')) {
        editor.chain().focus().sinkListItem('listItem').run();
        
        // Add history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('indent-ordered-list');
        }
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('orderedList:indented'));
        
        console.log('Indented ordered list item');
      }
      return;
    }
    
    // For regular paragraphs, use our direct DOM manipulation implementation
    // This ensures exact Google Docs behavior
    const changed = indentParagraphsDirect(editor);
    
    if (changed) {
      console.log('Indented paragraph using direct DOM manipulation');
      
      // Dispatch an event to notify other components
      document.dispatchEvent(new CustomEvent('paragraph:indented'));
    }
  };

  /**
   * Outdent the current paragraph or list item
   * Implements Google Docs outdentation behavior exactly:
   * - In bullet/ordered lists: Decreases nesting level
   * - In paragraphs: Decreases left margin by 36px (0.5 inches)
   * - Works with multiple selected paragraphs
   * - Integrates with global history for undo/redo
   */
  const outdent = () => {
    // If in a list, use list outdentation commands
    if (editor.isActive('bulletList')) {
      if (editor.can().liftListItem('listItem')) {
        editor.chain().focus().liftListItem('listItem').run();
        
        // Add history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('outdent-bullet-list');
        }
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('bulletList:outdented'));
        
        console.log('Outdented bullet list item');
      }
      return;
    }
    
    if (editor.isActive('orderedList')) {
      if (editor.can().liftListItem('listItem')) {
        editor.chain().focus().liftListItem('listItem').run();
        
        // Add history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('outdent-ordered-list');
        }
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('orderedList:outdented'));
        
        console.log('Outdented ordered list item');
      }
      return;
    }
    
    // For regular paragraphs, use our direct DOM manipulation implementation
    // This ensures exact Google Docs behavior
    const changed = outdentParagraphsDirect(editor);
    
    if (changed) {
      console.log('Outdented paragraph using direct DOM manipulation');
      
      // Dispatch an event to notify other components
      document.dispatchEvent(new CustomEvent('paragraph:outdented'));
    }
  };

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  return (
    <>
      {/* Google Docs-like menu bar */}
      <div className="flex w-full bg-white border-b border-gray-200 h-8 px-4 items-center text-sm">
        <div className="flex space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer hover:bg-gray-100 px-2 py-1">
              File
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">Edit</div>
          <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">View</div>
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer hover:bg-gray-100 px-2 py-1">
              Insert
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={insertImage}>
                Image
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Use a custom event to trigger table insertion UI
                  document.dispatchEvent(new CustomEvent('gdoc:toolbar:insertTable'));
                }}>
                Table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertPageBreak}>
                Page break
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Instead of showing a modal, inform the user about direct editing
                  const headerFooters = document.querySelectorAll('.page-header, .page-footer');
                  // Briefly highlight headers and footers to show they're clickable
                  headerFooters.forEach(el => {
                    el.classList.add('highlight-clickable');
                    setTimeout(() => {
                      el.classList.remove('highlight-clickable');
                    }, 2000);
                  });
                  
                  // Create a custom event to notify when header/footer areas should be highlighted
                  document.dispatchEvent(new CustomEvent('highlightHeaderFooter'));
                  
                  if (editor) {
                    editor.chain().blur().run();
                    // Show tooltip or instruction to user
                    alert('Click directly on any header or footer to edit it');
                  }
                }}
              >
                Headers & Footers
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                Horizontal line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">Format</div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => {
                // Dispatch event to show line spacing dialog
                document.dispatchEvent(new CustomEvent('format:lineSpacing:show'));
              }}>
                Line & paragraph spacing...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearFormatting}>
                Clear formatting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">Tools</div>
          <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">Extensions</div>
          <div className="cursor-pointer hover:bg-gray-100 px-2 py-1">Help</div>
        </div>
      </div>

      {/* Google Docs-like toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-2 py-1 shadow-sm">
        <div className="flex items-center space-x-1">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editor) {
                try {
                  // Dispatch a global undo event to use our custom history manager
                  const undoEvent = new CustomEvent('document:undo');
                  document.dispatchEvent(undoEvent);
                  console.log('Undo button clicked - event dispatched');
                } catch (error) {
                  console.error('Error during undo:', error);
                }
              }
            }}
            disabled={!editor}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editor) {
                try {
                  // Dispatch a global redo event to use our custom history manager
                  const redoEvent = new CustomEvent('document:redo');
                  document.dispatchEvent(redoEvent);
                  console.log('Redo button clicked - event dispatched');
                } catch (error) {
                  console.error('Error during redo:', error);
                }
              }
            }}
            disabled={!editor}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          {/* Search button moved to left side */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSearchModal}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center ml-1"
            title="Find and replace (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Print */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrint}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center print-hide"
            title="Print (Ctrl+P)"
          >
            <Printer className="h-4 w-4" />
          </Button>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Zoom selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center px-2 py-1 rounded hover:bg-gray-100 text-sm">
                <span>{zoom}%</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(zoomLevels || zoomOptions).map((option) => (
                <DropdownMenuItem key={option} onClick={() => setZoom(option)}>
                  {option}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Styles dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center px-2 py-1 rounded hover:bg-gray-100 min-w-[110px] text-sm">
                <span>
                  {currentHeadingLevel === 1 ? 'Title' : 
                   currentHeadingLevel === 2 ? 'Subtitle' : 
                   currentHeadingLevel === 3 ? 'Heading 1' : 
                   currentHeadingLevel === 4 ? 'Heading 2' : 
                   currentHeadingLevel === 5 ? 'Heading 3' : 
                   'Normal text'}
                </span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: 1
                    }
                  }));
                  
                  // Update UI to show current heading level
                  // Don't rely on the immediate isActive state which may not update yet
                  setCurrentHeadingLevel(1);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''}
              >
                <div className="text-2xl">Title</div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: 2
                    }
                  }));
                  
                  // Update UI to show current heading level
                  // Don't rely on the immediate isActive state which may not update yet
                  setCurrentHeadingLevel(2);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}
              >
                <div className="text-xl">Subtitle</div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: 3
                    }
                  }));
                  
                  // Update UI to show current heading level
                  // Don't rely on the immediate isActive state which may not update yet
                  setCurrentHeadingLevel(3);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-100' : ''}
              >
                <div className="text-lg font-bold">Heading 1</div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: 4
                    }
                  }));
                  
                  // Update UI to show current heading level
                  // Don't rely on the immediate isActive state which may not update yet
                  setCurrentHeadingLevel(4);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={editor.isActive('heading', { level: 4 }) ? 'bg-gray-100' : ''}
              >
                <div className="text-base font-bold">Heading 2</div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: 5
                    }
                  }));
                  
                  // Update UI to show current heading level
                  // Don't rely on the immediate isActive state which may not update yet
                  setCurrentHeadingLevel(5);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={editor.isActive('heading', { level: 5 }) ? 'bg-gray-100' : ''}
              >
                <div className="text-sm font-bold">Heading 3</div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch heading command to active editor with null to set as paragraph
                  document.dispatchEvent(new CustomEvent('formatCommand', {
                    detail: {
                      command: 'setHeading',
                      attrs: null
                    }
                  }));
                  
                  // Update UI to show normal text
                  setCurrentHeadingLevel(null);
                  
                  // Dispatch event to trigger UI update
                  document.dispatchEvent(new CustomEvent('format:applied'));
                  
                  // Add history step
                  if (historyManagerRef && historyManagerRef.current) {
                    historyManagerRef.current.addHistoryStep();
                  }
                }}
                className={!currentHeadingLevel ? 'bg-gray-100' : ''}
              >
                <div>Normal text</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Font dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center px-2 py-1 rounded hover:bg-gray-100 min-w-[80px] text-sm">
                {currentFont === '' ? (
                  <span className="text-gray-500 text-xs">Mixed</span>
                ) : (
                  <span style={{ fontFamily: currentFont }}>{currentFont}</span>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {fontOptions.map((font) => (
                <DropdownMenuItem 
                  key={font.value} 
                  onClick={() => {
                    // Dispatch font family command to active editor
                    document.dispatchEvent(new CustomEvent('formatCommand', {
                      detail: {
                        command: 'setFontFamily',
                        attrs: font.value
                      }
                    }));
                    
                    // Update the UI to show the current font
                    setCurrentFont(font.value);
                    
                    // Add history step
                    if (historyManagerRef && historyManagerRef.current) {
                      historyManagerRef.current.addHistoryStep();
                    }
                  }}
                  style={{ fontFamily: font.value }}
                  className={currentFont === font.value ? 'bg-gray-100' : ''}
                >
                  {font.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Font size dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center px-2 py-1 rounded hover:bg-gray-100 min-w-[40px] text-sm">
                <span>
                  {/* Handle special value for mixed font sizes (-1) */}
                  {currentFontSize === -1 ? (
                    <span className="text-gray-500 text-xs">Mixed</span>
                  ) : (
                    <span>{currentFontSize}</span>
                  )}
                </span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {fontSizeOptions.map((size) => (
                <DropdownMenuItem 
                  key={size} 
                  onClick={() => {
                    // Dispatch font size command to active editor
                    document.dispatchEvent(new CustomEvent('formatCommand', {
                      detail: {
                        command: 'setFontSize',
                        attrs: `${size}px`
                      }
                    }));
                    
                    // Update the UI to show the current font size
                    setCurrentFontSize(size);
                    
                    // Add history step
                    if (historyManagerRef && historyManagerRef.current) {
                      historyManagerRef.current.addHistoryStep();
                    }
                  }}
                  className={currentFontSize === size ? 'bg-gray-100' : ''}
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Text formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBold}
            className={`p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center format-button ${isBold ? 'bg-primary-50 text-primary' : ''}`}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
            data-active={isBold}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleItalic}
            className={`p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center format-button ${isItalic ? 'bg-primary-50 text-primary' : ''}`}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
            data-active={isItalic}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleUnderline}
            className={`p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center format-button ${isUnderline ? 'bg-primary-50 text-primary' : ''}`}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
            data-active={isUnderline}
          >
            <Underline className="h-4 w-4" />
          </Button>

          {/* Line Spacing Dropdown - Enhanced Version */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 rounded-full hover:bg-blue-100 h-8 w-8 flex items-center justify-center border-2 border-blue-500"
                title="Line & paragraph spacing"
                aria-label="Line & paragraph spacing"
              >
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  console.log('🔍 Opening line spacing dialog...');
                  document.dispatchEvent(new CustomEvent('lineSpacing:show'));
                }}
                className="cursor-pointer justify-between"
              >
                Line & paragraph spacing...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  if (editor) {
                    // Use the proper extension command
                    editor.chain()
                      .focus()
                      .setLineSpacing('1.0')
                      .run();
                    
                    // Notify of the update
                    document.dispatchEvent(new CustomEvent('spacing:updated', { 
                      detail: { lineSpacing: '1.0' } 
                    }));
                  }
                }}
                className="cursor-pointer"
              >
                Single
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (editor) {
                    // Use the proper extension command
                    editor.chain()
                      .focus()
                      .setLineSpacing('1.15')
                      .run();
                    
                    // Notify of the update
                    document.dispatchEvent(new CustomEvent('spacing:updated', { 
                      detail: { lineSpacing: '1.15' } 
                    }));
                  }
                }}
                className="cursor-pointer"
              >
                1.15 (Default)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (editor) {
                    // Use the proper extension command
                    editor.chain()
                      .focus()
                      .setLineSpacing('1.5')
                      .run();
                    
                    // Notify of the update
                    document.dispatchEvent(new CustomEvent('spacing:updated', { 
                      detail: { lineSpacing: '1.5' } 
                    }));
                  }
                }}
                className="cursor-pointer"
              >
                1.5
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (editor) {
                    // Use the proper extension command
                    editor.chain()
                      .focus()
                      .setLineSpacing('2.0')
                      .run();
                    
                    // Notify of the update
                    document.dispatchEvent(new CustomEvent('spacing:updated', { 
                      detail: { lineSpacing: '2.0' } 
                    }));
                  }
                }}
                className="cursor-pointer"
              >
                Double
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Custom Color pickers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center" title="Text color">
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Text Color</h4>
                <div className="grid grid-cols-5 gap-2">
                  {['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#808080', '#FFFFFF'].map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-md cursor-pointer border border-gray-300 ${color === textColor ? 'ring-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => applyTextColor(color)}
                    ></div>
                  ))}
                </div>
                <div className="pt-2 flex flex-col space-y-2">
                  <h4 className="text-sm font-medium">Custom Color</h4>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      className="w-12 h-8 p-0 border-0"
                      value={textColor}
                      onChange={(e) => applyTextColor(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="#000000" 
                      className="flex-1 px-2 py-1 border rounded-md text-sm"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          applyTextColor(e.currentTarget.value);
                        }
                      }}
                      onBlur={(e) => applyTextColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center" title="Highlight color">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Highlight Color</h4>
                <div className="grid grid-cols-5 gap-2">
                  {['#FFFF00', '#00FFFF', '#FF00FF', '#ADFF2F', '#FFA500', '#D3D3D3', 'transparent'].map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-md cursor-pointer border border-gray-300 ${color === 'transparent' ? 'bg-pattern-transparent' : ''} ${color === backgroundColor ? 'ring-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => applyBackgroundColor(color)}
                    ></div>
                  ))}
                </div>
                <div className="pt-2 flex flex-col space-y-2">
                  <h4 className="text-sm font-medium">Custom Color</h4>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      className="w-12 h-8 p-0 border-0"
                      value={backgroundColor || '#FFFF00'}
                      onChange={(e) => applyBackgroundColor(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="#FFFF00" 
                      className="flex-1 px-2 py-1 border rounded-md text-sm"
                      value={backgroundColor || ''}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          applyBackgroundColor(e.currentTarget.value);
                        }
                      }}
                      onBlur={(e) => applyBackgroundColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <button 
                    className="text-sm text-gray-600 hover:text-gray-900"
                    onClick={removeBackgroundColor}
                  >
                    Remove highlighting
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Insert link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Instead of using the prompt, we dispatch an event for the editor
              // to display the link modal component
              
              // First, store the current selection text
              if (editor.state.selection) {
                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');
                
                // Send the selected text as part of the event detail
                document.dispatchEvent(new CustomEvent('toolbar:insertLink', { 
                  detail: { selectedText } 
                }));
              } else {
                // If no selection, just trigger the link modal
                document.dispatchEvent(new CustomEvent('toolbar:insertLink', { 
                  detail: { selectedText: '' } 
                }));
              }
            }}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Insert link"
          >
            <Link className="h-4 w-4" />
          </Button>
          
          {/* Comment buttons moved up from the end of toolbar */}
          {/* Add comment button with enhanced styling */}
          {toggleComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                // Prevent event bubbling
                e.stopPropagation();
                console.log("Add comment button clicked in toolbar");
                
                // Call the comment toggle function
                toggleComment();
              }}
              className="p-1 rounded-full hover:bg-blue-100 h-8 w-8 flex items-center justify-center border border-transparent hover:border-blue-300"
              title="Add comment to selected text"
            >
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          
          {/* Comment sidebar toggle with enhanced visibility and styling */}
          {toggleCommentSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                // Prevent event bubbling
                e.stopPropagation();
                console.log("Comment sidebar button clicked in toolbar");
                
                // Explicitly toggle sidebar
                toggleCommentSidebar();
              }}
              className="p-1 rounded-full hover:bg-yellow-100 h-8 w-8 flex items-center justify-center relative border border-transparent hover:border-yellow-300"
              title="Toggle comments sidebar"
            >
              <FileText className="h-4 w-4" />
              {/* Visual indicator that this is for comments */}
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-400 rounded-full"></span>
            </Button>
          )}
          
          {/* Image upload with SUPER DIRECT approach - the most robust solution */}
          <SuperDirectImageUploader />
          
          {/* Old image upload approach (NUCLEAR) */}
          <NuclearImageUpload />
          
          {/* Insert page break */}
          <Button
            variant="ghost"
            size="sm"
            onClick={insertPageBreak}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Insert page break"
          >
            <FileInput className="h-4 w-4" />
          </Button>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Alignment options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center" title="Alignment">
                <AlignLeft className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTextAlign('left')}>
                <AlignLeft className="h-5 w-5 mr-2" />
                <span>Left align</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTextAlign('center')}>
                <AlignCenter className="h-5 w-5 mr-2" />
                <span>Center align</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTextAlign('right')}>
                <AlignRight className="h-5 w-5 mr-2" />
                <span>Right align</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTextAlign('justify')}>
                <AlignJustify className="h-5 w-5 mr-2" />
                <span>Justify</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Lists */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center" title="Lists">
                <List className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={toggleBulletList}>
                <List className="h-4 w-4 mr-2" />
                <span>Bulleted list</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleOrderedList}>
                <ListOrdered className="h-4 w-4 mr-2" />
                <span>Numbered list</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Table Button - directly in toolbar like Google Docs */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Dispatch event to show the table grid selector
              console.log("Table button clicked in toolbar");
              // Using regular event to ensure propagation
              const tableEvent = new Event('gdoc:toolbar:insertTable', { bubbles: true });
              document.dispatchEvent(tableEvent);
            }}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Insert table"
            id="toolbar-table-button"
          >
            <Table className="h-4 w-4" />
          </Button>
          
          {/* Indent/Outdent */}
          <Button
            variant="ghost"
            size="sm"
            onClick={outdent}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Decrease indent"
          >
            <Outdent className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={indent}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Increase indent"
          >
            <Indent className="h-4 w-4" />
          </Button>
          
          <div className="h-5 border-r border-gray-300 mx-1"></div>
          
          {/* Clear formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFormatting}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
            title="Clear formatting"
          >
            <XCircle className="h-4 w-4" />
          </Button>
          
          {/* Red Circle Button - GLOBAL COLOR CHANGE + RED BOX */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 1. Make all text red via CSS injection
              console.log("Injecting global CSS override");
              
              // First remove any existing override
              const existingStyle = document.getElementById('red-text-override');
              if (existingStyle) {
                existingStyle.remove();
              }
              
              // Create a new style element for text color
              const style = document.createElement('style');
              style.id = 'red-text-override';
              style.textContent = `
                /* Ultra-high specificity selector to override all other styles */
                html body .document-page .ProseMirror * {
                  color: red !important;
                }
                /* Make sure editable areas show red text */
                html body .document-page .page-content .ProseMirror p,
                html body .document-page .page-content .ProseMirror h1,
                html body .document-page .page-content .ProseMirror h2,
                html body .document-page .page-content .ProseMirror h3,
                html body .document-page .page-content .ProseMirror span,
                html body .document-page .page-content .ProseMirror div {
                  color: red !important;
                }
                /* Style for our red box */
                .red-square-box {
                  display: block;
                  width: 100px;
                  height: 100px;
                  background-color: red;
                  border: 2px solid darkred;
                  margin: 20px auto;
                }
              `;
              
              // Append the style to the document head
              document.head.appendChild(style);
              
              // 2. Insert a red box into the document - ULTRA AGGRESSIVE VERSION
              
              // Method 1: Use editor commands if available
              if (editor) {
                try {
                  editor.commands.focus();
                  
                  // Try to insert with ProseMirror/TipTap's preferred way
                  editor.commands.insertContent('<div style="width:100px; height:100px; background-color:red; border:2px solid darkred; margin:20px auto;"></div>');
                  console.log("Attempted box insertion via editor commands");
                } catch (err) {
                  console.error("Failed to insert via editor:", err);
                }
              }
              
              // Method 2: Direct DOM injection into ALL editor content areas
              setTimeout(() => {
                try {
                  // Find ALL possible editor areas
                  const editorElements = document.querySelectorAll('.ProseMirror, .page-content, .document-page');
                  
                  console.log(`Found ${editorElements.length} potential editor areas for red box insertion`);
                  
                  // Insert into each editor area we can find
                  editorElements.forEach((elem, index) => {
                    // Create the red box element
                    const redBox = document.createElement('div');
                    redBox.className = 'red-square-box';
                    redBox.style.cssText = 'width:100px; height:100px; background-color:red; border:2px solid darkred; margin:20px auto;';
                    
                    // Add a text content to make it easier to see in editor
                    redBox.textContent = ' ';
                    
                    // Ensure it's added at the beginning of the element
                    if (elem.firstChild) {
                      elem.insertBefore(redBox, elem.firstChild);
                    } else {
                      elem.appendChild(redBox);
                    }
                    
                    console.log(`Inserted red box into editor area #${index}`);
                  });
                } catch (err2) {
                  console.error("Error in direct DOM insertion:", err2);
                }
              }, 100); // Short delay to ensure editor is ready
              
              // Method 3: Direct injection into the HTML body as a final fallback
              setTimeout(() => {
                try {
                  const redBoxFallback = document.createElement('div');
                  redBoxFallback.style.cssText = 'position:absolute; top:200px; left:50%; transform:translateX(-50%); width:100px; height:100px; background-color:red; border:2px solid darkred; z-index:9999;';
                  document.body.appendChild(redBoxFallback);
                  console.log("Inserted absolute positioned fallback red box");
                } catch (err3) {
                  console.error("All insertion methods failed:", err3);
                }
              }, 200);
              
              // Alert that we've made the changes
              alert("Text color changed to red and red box inserted");
              
              console.log("All text should now be forcefully red and box added");
            }}
            className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center bg-red-500"
            title="Make text red and insert red box"
          >
            <span className="h-4 w-4 rounded-full bg-white"></span>
          </Button>
          
          <div className="flex-grow"></div>
          
          {/* Mode switch and Search */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
              title="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {/* Search button moved to left side */}
            
            {/* Comment buttons moved up in the toolbar */}
          </div>
        </div>
      </div>
    </>
  );
}
