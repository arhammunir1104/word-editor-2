import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image"; // Standard image extension
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
// import Link from "@tiptap/extension-link"; // Replaced with our custom ProperLink extension
import { ProperLink } from "./proper-link-extension"; // Use our properly rendering link extension
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import History from '@tiptap/extension-history';
// import { ImageResize } from "./image-resize"; // No longer needed, replaced by our ResizableImage
import { DirectImage } from "./direct-image-extension"; // Import our direct image extension
import { FontSize } from "./font-size-extension";
import { FontFamily } from "./font-family-extension";
import { PageBreak } from "./page-break-extension";
import { KeyboardShortcuts } from "./keyboard-shortcut-extension";
import { CustomKeyboardShortcuts } from "./custom-keyboard-shortcuts";
import { FinalBulletList, FinalListItem } from "./final-bullet-list";
import { GoogleDocsNumberedList, NumberedListBackspaceExtension, EnhancedListItem } from "./numbered-list";
import { BulletBackspaceExtension } from "./bullet-backspace";
import { ParagraphIndent } from "./paragraph-indent-extension";
import { GLOBAL_FORMAT_STATE } from "./format-detection";
import { Comment } from "./comment-extension";
import { LinkHandlerExtension } from "./link-handler-extension";
// Re-add table extensions with Google Docs-style functionality
import {
  GoogleDocsTable,
  GoogleDocsTableRow,
  GoogleDocsTableCell,
  GoogleDocsTableHeader,
  TableExtensions
} from './table-extensions';
// Import line spacing extension for Google Docs-style line and paragraph spacing
import { LineSpacingExtension } from './line-spacing-new';
// Import our custom RedBox extension (currently broken due to ReactNodeView dependencies)
// import RedBox from './red-box-extension'; 
// Import simple red box extension
import SimpleRedBox from './simple-red-box';
// Import ultimate red box extension - a pure TipTap Node with no dependencies
import UltimateRedBox from './ultimate-red-box';
// Import our TipTap-friendly search highlight extension
import { SearchHighlightExtension } from './search-highlight-extension';

export function getExtensions() {
  return [
    // Configure StarterKit without history and without default list extensions
    StarterKit.configure({
      // Explicitly disable the built-in history
      history: false,
      // Disable default list extensions so we can use our custom ones
      bulletList: false,
      orderedList: false,
      listItem: false,
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      }
    }),
    
    // Add our custom bullet list implementation with Google Docs behavior
    FinalBulletList.configure({
      keepMarks: true,  // Keep formatting when creating new bullets
    }),
    // Add our custom ordered list implementation with Google Docs behavior
    GoogleDocsNumberedList.configure({
      keepMarks: true,  // Keep formatting when creating new numbers
    }),
    // Add our custom list items with proper indentation handling
    FinalListItem,
    EnhancedListItem,
    // Add our backspace handlers for lists
    BulletBackspaceExtension,
    NumberedListBackspaceExtension,
    // Add our direct paragraph indentation extension for Tab/Shift+Tab
    ParagraphIndent,
    
    // Add Google Docs-style comment functionality
    Comment.configure({
      HTMLAttributes: {
        class: 'comment-marked',
      },
      onCommentClick: (id) => {
        console.log("Comment clicked in editor:", id);
        // Dispatch a custom event that the editor component can listen for
        document.dispatchEvent(new CustomEvent('comment:clicked', { 
          detail: { id } 
        }));
      },
    }),
    
    // Add our link handler extension to manage link interactions
    LinkHandlerExtension.configure({
      onLinkClick: (attrs) => {
        console.log("Link clicked in editor:", attrs.href);
        // Dispatch a custom event that the editor component can listen for
        document.dispatchEvent(new CustomEvent('link:clicked', { 
          detail: { href: attrs.href } 
        }));
      },
    }),
    
    // Use a separate History extension with custom configuration
    History.configure({
      depth: 500,           // Store more history steps
      newGroupDelay: 100,   // Group changes within 100ms as a single step for better granularity
    }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
    }),
    
    // Table extensions removed
    
    // Use standard image extension with proper configuration
    Image.configure({
      inline: true, // Set to true to allow inline images
      allowBase64: true, // Enable base64 encoded images
      HTMLAttributes: {
        class: 'basic-image',
      },
    }),
    // Add our direct image extension - this will ensure images can be inserted reliably
    DirectImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'direct-image',
      },
    }),
    TextStyle,
    Color.configure({
      types: ['textStyle'],
    }),
    // Custom font size and font family extensions
    FontSize.configure({
      types: ['textStyle'],
      defaultSize: '11px', // Set to the requested 11px default
    }),
    FontFamily.configure({
      types: ['textStyle'],
      defaultFamily: 'Arial',
    }),
    // Use our custom ProperLink extension instead of the standard Link extension
    // This ensures links are rendered as proper <a> tags in the DOM
    ProperLink.configure({
      // Set HTML attributes for styling and identification
      HTMLAttributes: {
        class: 'editor-link custom-link',
        'data-type': 'link',
        'data-is-link': 'true'
      }
    }),
    Highlight.configure({
      multicolor: true,
    }),
    // Add placeholder text
    Placeholder.configure({
      placeholder: 'Type your document here...',
    }),
    // Page break support
    PageBreak,
    // Custom keyboard shortcuts for formatting (Ctrl+B, Ctrl+I, Ctrl+U)
    KeyboardShortcuts,
    // Custom keyboard shortcuts to disable default undo/redo
    CustomKeyboardShortcuts,
    // Comment extension is already loaded above with configuration
    
    // Add our search highlight extension (using ProseMirror decorations)
    SearchHighlightExtension.configure({
      searchTerm: '',
      caseSensitive: false, 
      wholeWord: false,
    }),
    
    // Add Google Docs-style table extensions
    GoogleDocsTable.configure({
      resizable: true,
      // Custom options are handled in the extension itself
    }),
    GoogleDocsTableRow,
    GoogleDocsTableCell,
    GoogleDocsTableHeader,
    
    // Add line and paragraph spacing extension
    LineSpacingExtension,
    
    // Add our simple red box extension
    SimpleRedBox,
    
    // Add our ultimate red box extension
    UltimateRedBox
  ];
}

export const handleTab = (editor: Editor): boolean => {
  // Table navigation code removed
  
  // Then handle bullet lists
  if (editor.isActive('bulletList')) {
    console.log('Tab handler - detected bullet list - handling indentation');
    
    // Force sink list item
    if (editor.can().sinkListItem('listItem')) {
      editor.chain().focus().sinkListItem('listItem').run();
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('indent-bullet-item');
      }
      
      // Notify other components
      document.dispatchEvent(new CustomEvent('bulletList:indented'));
      return true;
    } else {
      console.log('Cannot indent list item further');
      return true; // Still return true to prevent default browser behavior
    }
  }
  
  // Then handle ordered lists
  if (editor.isActive('orderedList')) {
    console.log('Tab handler - detected ordered list - handling indentation');
    
    // Force sink list item - use listItem type
    if (editor.can().sinkListItem('listItem')) {
      editor.chain().focus().sinkListItem('listItem').run();
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('indent-ordered-item');
      }
      
      // Notify other components
      document.dispatchEvent(new CustomEvent('orderedList:indented'));
      return true;
    } else {
      console.log('Cannot indent ordered list item further');
      return true; // Still return true to prevent default browser behavior
    }
  }
  
  // In normal text mode, add a paragraph-level indent exactly like Google Docs
  // We'll use a simpler approach with direct commands instead of transactions
  
  // Get the current selection
  const { selection } = editor.state;
  const { empty, from, to } = selection;
  
  // Find a paragraph around the cursor
  const around = selection.$from.node(1);
  if (!around || around.type.name !== 'paragraph') return false;
  
  // The position where the paragraph node starts
  const pos = selection.$from.before(1);
  
  // Get existing style
  const style = around.attrs.style || '';
  
  // Calculate current indent level
  const currentMargin = style.includes('margin-left') ? 
    parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0') : 0;
  
  // Standard Google Docs indent is 36px
  const newMargin = currentMargin + 36;
  
  // Create new style with increased margin
  let newStyle = '';
  if (style.includes('margin-left')) {
    newStyle = style.replace(/margin-left:\s*\d+px/, `margin-left: ${newMargin}px`);
  } else {
    newStyle = `margin-left: ${newMargin}px;${style}`;
  }
  
  // Apply the indentation using simpler chain approach
  // This avoids selection issues with transactions
  editor.chain()
    .focus()
    .updateAttributes('paragraph', { style: newStyle })
    .run();
  
  return true;
};

export const handleShiftTab = (editor: Editor): boolean => {
  // Table navigation code removed
  
  // Then handle bullet lists with high priority
  if (editor.isActive('bulletList')) {
    console.log('Shift+Tab handler - handling bullet list outdentation');
    
    // Use direct command
    if (editor.can().liftListItem('listItem')) {
      // Un-nest (outdent) the list item
      editor.chain().focus().liftListItem('listItem').run();
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('outdent-bullet-item');
      }
      
      // Notify other components
      document.dispatchEvent(new CustomEvent('bulletList:outdented'));
      return true;
    }
    
    return true; // Prevent default tab behavior even if we can't outdent
  }
  
  // Then handle ordered lists
  if (editor.isActive('orderedList')) {
    console.log('Shift+Tab handler - handling ordered list outdentation');
    
    // Use direct command with listItem type
    if (editor.can().liftListItem('listItem')) {
      // Un-nest (outdent) the list item
      editor.chain().focus().liftListItem('listItem').run();
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('outdent-ordered-item');
      }
      
      // Notify other components
      document.dispatchEvent(new CustomEvent('orderedList:outdented'));
      return true;
    }
    
    return true; // Prevent default tab behavior even if we can't outdent
  }
  
  // In normal text mode, reduce indentation using the simpler approach
  
  // Get the current selection
  const { selection } = editor.state;
  const { empty, from, to } = selection;
  
  // Find a paragraph around the cursor
  const around = selection.$from.node(1);
  if (!around || around.type.name !== 'paragraph') return false;
  
  // Get existing style
  const style = around.attrs.style || '';
  
  // If there's no margin, nothing to outdent
  if (!style.includes('margin-left')) return false;
  
  // Calculate current margin
  const currentMargin = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
  
  // Calculate new style with decreased margin
  let newStyle = '';
  if (currentMargin <= 36) {
    // Remove margin completely if it's at the first indent level
    newStyle = style.replace(/margin-left:\s*\d+px;?/, '');
  } else {
    // Reduce margin by 36px (Google Docs standard)
    newStyle = style.replace(
      /margin-left:\s*\d+px/, 
      `margin-left: ${currentMargin - 36}px`
    );
  }
  
  // Apply the outdentation using the chain approach
  editor.chain()
    .focus()
    .updateAttributes('paragraph', { style: newStyle })
    .run();
  
  // Record history step
  if (window.historyManager) {
    window.historyManager.addHistoryStep('outdent-paragraph');
  }
  
  return true;
};

export const handleBackspace = (editor: Editor): boolean => {
  const { selection } = editor.state;
  const { empty } = selection;
  const { from, $from } = selection;
  
  // Only run specialized handlers if we're at the start of an empty node
  if (empty && $from.parentOffset === 0) {
    // Check if we're in a bullet list
    if (editor.isActive('bulletList') && $from.parent.content.size === 0) {
      // We're in an empty bullet list item at the start position
      // Let's manually handle the special Google Docs behavior
      
      // Are we at the first level or a nested level?
      let nestingLevel = 0;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'bulletList') {
          nestingLevel++;
        }
      }
      
      // If we can lift the item (reduce nesting), do that first
      if (nestingLevel > 1 && editor.can().liftListItem('listItem')) {
        // Reduce nesting level
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('bullet-unnest');
        }
        
        return true;
      }
      
      // Otherwise, convert the bullet to a paragraph
      editor.chain().focus().toggleList('bulletList', 'listItem').run();
      
      // Update UI state
      GLOBAL_FORMAT_STATE.setBulletList(false);
      document.dispatchEvent(new CustomEvent('format:update'));
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('exit-bullet-list');
      }
      
      return true;
    }
    
    // Check if we're in an ordered list
    if (editor.isActive('orderedList') && $from.parent.content.size === 0) {
      // We're in an empty ordered list item at the start position
      // Let's manually handle the special Google Docs behavior
      
      // Are we at the first level or a nested level?
      let nestingLevel = 0;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'orderedList') {
          nestingLevel++;
        }
      }
      
      // If we can lift the item (reduce nesting), do that first
      if (nestingLevel > 1 && editor.can().liftListItem('listItem')) {
        // Reduce nesting level
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('ordered-unnest');
        }
        
        return true;
      }
      
      // Otherwise, convert the ordered list item to a paragraph
      editor.chain().focus().toggleList('orderedList', 'listItem').run();
      
      // Update UI state
      GLOBAL_FORMAT_STATE.setOrderedList(false);
      document.dispatchEvent(new CustomEvent('format:update'));
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('exit-ordered-list');
      }
      
      return true;
    }
  }
  
  // Case 3: At the start of a paragraph - should merge with previous paragraph
  if (empty && $from.pos === $from.start() && $from.depth === 1) {
    // We're at the start of a block, and there's a previous block
    if ($from.index() > 0) {
      // Use the built-in behavior to join with the previous block
      // This preserves the formatting of the previous block
      return false; // Let the editor handle it naturally
    }
  }
  
  // Case 4: Check if we're at the beginning of a paragraph with indentation
  if (empty && $from.pos === $from.start()) {
    // Find a paragraph around the cursor
    const around = $from.node(1);
    if (!around || around.type.name !== 'paragraph') return false;
    
    // Get existing style for standard paragraphs
    const style = around.attrs.style || '';
    
    // If there's no margin, nothing to outdent
    if (!style.includes('margin-left')) return false;
    
    // Calculate current margin
    const currentMargin = parseInt(style.match(/margin-left:\s*(\d+)px/)?.[1] || '0');
    
    // Apply the Google Docs standard of 36px per indent level
    let newStyle = '';
    if (currentMargin <= 36) {
      // Remove margin completely if it's at the first indent level
      newStyle = style.replace(/margin-left:\s*\d+px;?/, '');
    } else {
      // Reduce margin by 36px (Google Docs standard)
      newStyle = style.replace(
        /margin-left:\s*\d+px/, 
        `margin-left: ${currentMargin - 36}px`
      );
    }
    
    // Apply the outdentation using the chain approach
    editor.chain()
      .focus()
      .updateAttributes('paragraph', { style: newStyle })
      .run();
    
    // Add history step for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep('outdent-paragraph');
    }
    
    return true;
  }
  
  return false;
};

export const handleEnter = (editor: Editor): boolean => {
  const { selection } = editor.state;
  const { empty } = selection;
  const { from, $from } = selection;
  
  // Case 1: In an empty bullet list item - handle special exit behavior
  if (empty && editor.isActive('bulletList')) {
    const currentNode = $from.node();
    
    if (currentNode.content.size === 0) {
      console.log('Enter in empty bullet list item - handling special exit behavior');
      
      // First try to lift (un-nest) this list item
      if (editor.can().liftListItem('listItem')) {
        // Reduce indentation level
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('exit-bullet-enter');
        }
        
        return true;
      } else {
        // If we can't lift anymore (at top level), exit the list completely
        editor.chain().focus().toggleList('bulletList', 'listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('exit-bullets-completely');
        }
        
        return true;
      }
    }
    
    // For non-empty bullet list items, let our custom bullet-list extension handle it
    // It will decide whether to handle the Enter through the FinalListItem extension
    return false;
  }
  
  // Case 2: In an empty ordered list item - handle special exit behavior (same pattern as bullets)
  if (empty && editor.isActive('orderedList')) {
    const currentNode = $from.node();
    
    if (currentNode.content.size === 0) {
      console.log('Enter in empty ordered list item - handling special exit behavior');
      
      // First try to lift (un-nest) this list item
      if (editor.can().liftListItem('listItem')) {
        // Reduce indentation level
        editor.chain().focus().liftListItem('listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('exit-ordered-item-enter');
        }
        
        return true;
      } else {
        // If we can't lift anymore (at top level), exit the list completely
        editor.chain().focus().toggleList('orderedList', 'listItem').run();
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('exit-ordered-list-completely');
        }
        
        // Update global format state
        GLOBAL_FORMAT_STATE.setOrderedList(false);
        document.dispatchEvent(new CustomEvent('format:update'));
        
        return true;
      }
    }
    
    // For non-empty ordered list items, let our custom list extension handle it
    return false;
  }
  
  // Case 3: Regular Enter in paragraph - keep formatting and indentation (Google Docs style)
  
  // Find a paragraph around the cursor for simpler approach
  const around = $from.node(1);
  if (!around || around.type.name !== 'paragraph') return false;
  
  // Get current style and marks to preserve
  const style = around.attrs.style || '';
  const marks = $from.marks();
  
  // Handle soft break (Shift+Enter) separately
  if (editor.view.state.selection.$from.nodeBefore?.text?.endsWith('\n')) {
    return false; // Let default behavior happen for soft breaks
  }
  
  // Remember cursor position for reference
  const oldPos = editor.state.selection.from;
  
  // First, create the new paragraph with default Enter behavior
  editor.commands.enter();
  
  // Record history step
  if (window.historyManager) {
    window.historyManager.addHistoryStep('new-paragraph');
  }
  
  // Wait briefly to ensure the new paragraph is created
  setTimeout(() => {
    // Get the current paragraph (which should be the new one)
    const paragraph = editor.state.selection.$from.node(1);
    if (!paragraph || paragraph.type.name !== 'paragraph') return;
    
    // Apply indentation style if the original paragraph had it
    if (style) {
      editor.chain()
        .updateAttributes('paragraph', { style: style })
        .run();
    }
    
    // Reapply active marks if needed (just like Google Docs)
    marks.forEach(mark => {
      if (mark.type.name === 'bold') editor.chain().setBold().run();
      if (mark.type.name === 'italic') editor.chain().setItalic().run();
      if (mark.type.name === 'underline') editor.chain().setUnderline().run();
      if (mark.type.name === 'strike') editor.chain().setStrike().run();
      if (mark.type.name === 'textStyle') {
        // Preserve custom text styling
        const attrs = { ...mark.attrs };
        if (attrs.color) editor.chain().setColor(attrs.color).run();
        if (attrs.fontSize) editor.chain().setFontSize(attrs.fontSize).run();
        if (attrs.fontFamily) editor.chain().setFontFamily(attrs.fontFamily).run();
      }
    });
  }, 10);
  
  // Ensure the editor retains focus
  editor.commands.focus();
  
  return true;
};