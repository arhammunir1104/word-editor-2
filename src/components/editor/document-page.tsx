import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorContent, Editor, JSONContent, useEditor } from '@tiptap/react';
import { getExtensions } from './tiptap-extensions';
import { getGlobalHistoryManager } from './history-manager';
import { 
  GLOBAL_FORMAT_STATE, 
  detectTextColor, 
  detectBackgroundColor,
  detectBulletList,
  detectOrderedList
} from './format-detection';
import './header-footer.css';
import './bullet-symbols.css';
import './numbered-list.css';

interface PageDimensions {
  width: string;
  height: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  headerHeight: string;
  footerHeight: string;
  backgroundColor?: string;
  contentArea?: {
    width: string;
    height: string;
  };
}

interface DocumentPageProps {
  mainEditor: Editor | null;
  pageIndex: number;
  pageNumber: number;
  totalPages: number;
  pageDimensions?: PageDimensions;
  content: JSONContent;
  isActive: boolean;
  onContentOverflow: (pageIndex: number, overflowContent: JSONContent) => void;
  onContentUnderflow: (pageIndex: number, availableHeight: number) => void;
  onFocus: (pageIndex: number) => void;
  header?: string;
  footer?: string;
  onEditHeader?: (index: number, text: string) => void;
  onEditFooter?: (index: number, text: string) => void;
  onEditorCreated?: (pageIndex: number, editor: Editor) => void;
  onContentChange?: (pageIndex: number, content: JSONContent) => void;
}

export default function DocumentPage({ 
  mainEditor,
  pageIndex,
  pageNumber,
  totalPages,
  pageDimensions,
  content,
  isActive,
  onContentOverflow,
  onContentUnderflow,
  onFocus,
  header = 'Header',
  footer = `Page ${pageNumber}`,
  onEditHeader,
  onEditFooter,
  onEditorCreated,
  onContentChange
}: DocumentPageProps) {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [headerText, setHeaderText] = useState(header);
  const [footerText, setFooterText] = useState(footer);
  
  // Helper function to replace {pageNumber} placeholders in text
  // and handle HTML formatting properly
  const getFormattedText = (text: string) => {
    if (!text) return '';
    
    // Check if the text contains HTML tags
    if (text.includes('<') && text.includes('>')) {
      // Replace {pageNumber} token inside HTML with actual page number
      return text.replace(/\{pageNumber\}/g, String(pageNumber));
    } else {
      // Simple text replacement
      return text.replace(/\{pageNumber\}/g, String(pageNumber));
    }
  };
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<JSONContent>(content);
  const pageHeightRef = useRef<number>(0);
  const isInitialMount = useRef(true);

  // Create page-specific editor
  const editor = useEditor({
    extensions: getExtensions(),
    content: content && Object.keys(content).length > 0 ? content : {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ 
          type: 'text', 
          text: '',
          marks: [
            {
              type: 'textStyle',
              attrs: {
                fontSize: '11px',
                fontFamily: 'Arial'
              }
            }
          ]
        }]
      }]
    },
    editable: true,
    autofocus: isActive,
    onUpdate: ({ editor }) => {
      const newContent = editor.getJSON();
      contentRef.current = newContent;
      
      if (onContentChange) {
        onContentChange(pageIndex, newContent);
      }
      
      // Check for content overflow/underflow
      checkContentOverflow();
    },
    onFocus: () => {
      onFocus(pageIndex);
      
      // Update active page in history manager
      const historyManager = getGlobalHistoryManager();
      if (historyManager) {
        historyManager.setActivePage(pageIndex);
      }
    }
  });

  // Track whether we've already called onEditorCreated
  const editorCreatedRef = useRef(false);

  // Update content if props change
  useEffect(() => {
    if (editor && JSON.stringify(content) !== JSON.stringify(contentRef.current)) {
      editor.commands.setContent(content);
      contentRef.current = content;
    }
  }, [editor, content]);
  
  // Update header/footer text if props change
  useEffect(() => {
    setHeaderText(header);
    setFooterText(footer);
  }, [header, footer]);
  
  // Default page dimensions (Letter size with margins)
  const defaultDimensions: PageDimensions = {
    width: '8.5in',
    height: '11in',
    marginTop: '1in',
    marginBottom: '1in',
    marginLeft: '1in',
    marginRight: '1in',
    headerHeight: '50px',
    footerHeight: '50px',
    backgroundColor: '#ffffff',
    contentArea: {
      width: 'calc(8.5in - 2in)', // Full width minus margins
      height: 'calc(11in - 2in - 50px - 50px)' // Full height minus margins and header/footer
    }
  };
  
  // Merge with passed dimensions or use defaults
  const dimensions = { ...defaultDimensions, ...pageDimensions };

  // Calculate available height for content
  // Enhanced function to calculate available height accurately based on dimension values
  // with improved orientation and custom dimensions support
  const calculateAvailableHeight = useCallback(() => {
    // Helper function to parse size values with units
    const parseSize = (size: string): number => {
      const match = size.match(/^(\d*\.?\d+)(\w+)?$/);
      if (!match) return 0;
      
      const value = parseFloat(match[1]);
      const unit = match[2] || 'px';
      
      // Convert to pixels
      switch (unit) {
        case 'in': return value * 96; // 1 inch = 96px
        case 'cm': return value * 37.8; // 1cm = 37.8px
        case 'mm': return value * 3.78; // 1mm = 3.78px
        case 'pt': return value * 1.33; // 1pt = 1.33px
        default: return value;
      }
    };
    
    // PRIORITY 1: Calculate from dimension specifications if available
    if (dimensions) {
      const pageWidth = parseSize(dimensions.width);
      const pageHeight = parseSize(dimensions.height);
      const marginTop = parseSize(dimensions.marginTop);
      const marginBottom = parseSize(dimensions.marginBottom);
      const marginLeft = parseSize(dimensions.marginLeft);
      const marginRight = parseSize(dimensions.marginRight);
      const headerHeight = parseSize(dimensions.headerHeight);
      const footerHeight = parseSize(dimensions.footerHeight);
      
      // Detect orientation based on dimensions
      const isLandscape = pageWidth > pageHeight;
      
      // Calculate available content height based on page orientation
      const calculatedHeight = pageHeight - marginTop - marginBottom - headerHeight - footerHeight;
      const calculatedWidth = pageWidth - marginLeft - marginRight;
      
      if (calculatedHeight > 0) {
        console.log(`Page ${pageIndex}: ${isLandscape ? 'Landscape' : 'Portrait'} orientation detected.`);
        console.log(`Page ${pageIndex}: Content area: ${calculatedWidth}px × ${calculatedHeight}px`);
        console.log(`Page ${pageIndex}: Height from dimensions: ${calculatedHeight}px (${pageHeight}px - margins - headers/footers)`);
        
        // Store the calculated height for future reference
        pageHeightRef.current = calculatedHeight;
        return calculatedHeight;
      }
    }
    
    // PRIORITY 2: Measure from DOM if reference is available
    if (editorWrapperRef.current) {
      const containerHeight = editorWrapperRef.current.clientHeight;
      const containerWidth = editorWrapperRef.current.clientWidth;
      
      if (containerHeight && !isNaN(containerHeight) && containerHeight > 0) {
        console.log(`Page ${pageIndex}: Height from DOM measurement: ${containerHeight}px, width: ${containerWidth}px`);
        pageHeightRef.current = containerHeight;
        return containerHeight;
      }
    }
    
    // PRIORITY 3: Fall back to previously calculated height if available
    if (pageHeightRef.current && pageHeightRef.current > 0) {
      console.log(`Page ${pageIndex}: Using cached height value: ${pageHeightRef.current}px`);
      return pageHeightRef.current;
    }
    
    // Determine a reasonable default based on dimensions if possible
    if (dimensions) {
      const width = parseSize(dimensions.width);
      const height = parseSize(dimensions.height);
      
      // If dimensions suggest landscape, use a lower default height
      if (width > height) {
        console.warn(`Page ${pageIndex}: Using landscape default height 450px`);
        return 450;
      }
    }
    
    // PRIORITY 4: Fall back to reasonable default if all else fails
    console.warn(`Page ${pageIndex}: Could not determine height, using default 940px`);
    return 940; // Default reasonable value for portrait content area
  }, [pageIndex, dimensions]);

  // Check if content overflows the page - NEW APPROACH WITH HEIGHT CALCULATION
  const checkContentOverflow = useCallback(() => {
    if (!editor || !editorWrapperRef.current) return;
    
    // Get all paragraphs/blocks
    const blocks = Array.from(editor.view.dom.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table'));
    
    // Early exit if not enough content
    if (blocks.length <= 1) return;
    
    // IMPORTANT: We want to fit a large number of lines on a page to maximize page usage
    // Using a very high value for safety (will be limited by physical page size)
    const MIN_LINES_PER_PAGE = 45;
    
    // Calculate the physical container dimensions for accurate overflow detection
    const editorRect = editor.view.dom.getBoundingClientRect();
    const editorTop = editorRect.top;
    
    // Get containerHeight using our enhanced calculation function that handles different units
    const containerHeight = calculateAvailableHeight();
    
    // Determine page orientation
    const pageWidth = parseFloat(dimensions.width);
    const pageHeight = parseFloat(dimensions.height);
    const isLandscapeOrientation = pageWidth > pageHeight;
    
    // Log the available height based on current dimensions and orientation
    console.log(`Page ${pageIndex} content area height based on dimensions: ${containerHeight}px (${isLandscapeOrientation ? 'landscape' : 'portrait'})`);
    
    // IMPORTANT FIX FOR CUSTOM PAGE SIZES:
    // For custom page dimensions and orientations, we need a dynamic buffer calculation
    // We'll calculate this as a percentage of the container height
    // ENHANCED BUFFER CALCULATION SYSTEM for proper content distribution
    
    // Step 1: Calculate base buffer percentage based on orientation
    let bufferPercentage = isLandscapeOrientation ? 0.20 : 0.05; // Increased buffers
    
    // Step 2: Calculate aspect ratio to determine more precise buffer adjustments
    const aspectRatio = pageWidth / pageHeight;
    console.log(`Page ${pageIndex} aspect ratio: ${aspectRatio.toFixed(2)}`);
    
    // Step 3: Adjust buffer percentage based on aspect ratio
    // For extreme aspect ratios, we need more aggressive buffers
    if (isLandscapeOrientation) {
      if (aspectRatio > 1.8) {        // Very wide landscape
        bufferPercentage = 0.25;
      } else if (aspectRatio > 1.5) { // Wide landscape
        bufferPercentage = 0.22;
      }
    } else {
      if (aspectRatio < 0.6) {        // Very narrow portrait
        bufferPercentage = 0.08;
      } else if (aspectRatio < 0.7) { // Narrow portrait
        bufferPercentage = 0.06;
      }
    }
    
    // Step 4: Apply minimum buffer value to ensure we always have some space
    const dynamicBuffer = Math.max(containerHeight * bufferPercentage, 30); // At least 30px buffer
    
    console.log(`Using enhanced dynamic buffer of ${Math.round(dynamicBuffer)}px (${bufferPercentage * 100}% of ${containerHeight}px) for ${isLandscapeOrientation ? 'landscape' : 'portrait'} orientation`);
    
    // Step 5: Use enhanced buffer for visibility calculations
    const visibilityBuffer = dynamicBuffer;
    
    // COMPLETELY REDESIGNED HEIGHT ALGORITHM (based on user feedback)
    // Use nearly the full height of the page - 95% for both orientations
    // This solves the issue of creating new pages too early and wasting space
    // Previous issues: portrait splitting after 17 blocks, landscape after just 7
    
    // We'll use a consistent 95% of available height for both orientations
    // This ensures maximum content per page while still leaving a small buffer
    const heightPercentage = 0.95; // Use 95% of the available height
    
    console.log(`NEW OPTIMIZED ALGORITHM: Using ${Math.round(heightPercentage * 100)}% of page height for BOTH orientations`);
    console.log(`This fixes premature page creation and maximizes content per page`);
    
    // Step 7: Apply the optimized height for content flow calculations
    const adjustedHeight = containerHeight * heightPercentage;
                         
    // This is where we determine the "visible" area of the page for pagination purposes
    // We only use a very small buffer (5px) to maximize page content
    const maxVisibleBottom = editorTop + adjustedHeight - 5; // Minimal buffer of 5px
    
    console.log(`Page ${pageIndex} - Container height: ${containerHeight}px`);
    console.log(`Page ${pageIndex} has ${blocks.length} blocks, analyzing height...`);
    
    // Analyze each block's position to find the first one that extends beyond our page
    let cutIndex = -1;
    
    // Measure each block's position to accurately determine when content overflows
    for (let i = 0; i < blocks.length; i++) {
      const blockRect = blocks[i].getBoundingClientRect();
      // Get the distance from top of editor and bottom of this block
      const blockBottom = blockRect.bottom;
      
      console.log(`Block ${i+1}: bottom=${Math.round(blockBottom-editorTop)}px, max=${Math.round(maxVisibleBottom-editorTop)}px`);
      
      // Check if this block extends beyond the visible area
      if (blockBottom > maxVisibleBottom) {
        cutIndex = i;
        console.log(`Found overflow at block ${i+1} - extends ${Math.round(blockBottom-maxVisibleBottom)}px beyond page`);
        break;
      }
    }
    
    // NEW PURE HEIGHT-BASED ALGORITHM (fixed per user feedback)
    // We now ONLY split content when it actually overflows the page height
    // This will fix the issues where:
    // 1. Portrait mode was splitting after just 17 blocks when it could fit 23
    // 2. Landscape mode was splitting after just 7 blocks when it could fit 17+
    
    if (cutIndex === -1) {
      // If no overflow detected, don't create a new page
      // This is the most important fix - don't use arbitrary block counts!
      
      console.log(`✓ FIXED ALGORITHM: No ACTUAL height overflow detected`);
      console.log(`✓ Page has ${blocks.length} blocks that all fit within ${Math.round(adjustedHeight)}px`);
      console.log(`✓ Will NOT create new page until content actually reaches page boundary`);
      
      // Exit without splitting - allow content to use available space efficiently
      return;
    }
    
    // Just to be safe - don't cut too aggressively
    // This prevents weird cases where we might cut very early
    if (cutIndex <= 5 && blocks.length > 10) {
      console.log(`Safety check: Won't cut after just ${cutIndex} blocks, using fallback logic`);
      return; // Don't cut too early
    }
    
    // Enhanced logic to prevent early content cutting
    // Instead of using fixed numbers, we'll use percentage-based limits
    
    // For landscape or custom orientations, we're more flexible with content distribution
    // We already determined the orientation above, no need to recalculate
    console.log(`Page orientation appears to be ${isLandscapeOrientation ? 'landscape' : 'portrait'}, dimensions: ${dimensions.width}x${dimensions.height}`);
    
    // We already handle this case earlier with the special check - no need to duplicate
    
    // NEW SIMPLIFIED HEIGHT-BASED OVERFLOW HANDLING
    // When we detect actual overflow, put the overflowing block on next page
    // but avoid splitting too early (first few blocks)
    
    // Just simple safety checks to ensure we're not cutting content unnaturally
    console.log(`DETECTED OVERFLOW: Block ${cutIndex+1} extends beyond page boundary`);
    
    if (cutIndex === 0) {
      console.log(`First block overflows - this might be a very tall element`);
      // Special case: check if there's only one block
      if (blocks.length === 1) {
        console.log(`Only one block exists - can't split, will scroll`);
        return; // Can't split the only block
      }
      // Move to the second block since first block overflows
      cutIndex = 1;
      console.log(`Setting cut point to the second block`);
    }
    
    // FINAL SAFETY CHECK: Don't split if we've reached 95%+ of page height
    // and have less than 5% content overflow - this ensures maximized page usage
    if (cutIndex > 0 && cutIndex < blocks.length - 1) {
      const lastFittingBlock = blocks[cutIndex - 1];
      const overflowingBlock = blocks[cutIndex];
      
      const lastFittingBottom = lastFittingBlock.getBoundingClientRect().bottom - editorTop;
      const overflowingHeight = overflowingBlock.getBoundingClientRect().height;
      
      const percentOfMaxHeight = lastFittingBottom / maxVisibleBottom;
      const percentOverflow = (overflowingHeight - (maxVisibleBottom - lastFittingBottom)) / maxVisibleBottom;
      
      console.log(`Page filled: ${Math.round(percentOfMaxHeight * 100)}%, Overflow: ${Math.round(percentOverflow * 100)}%`);
      
      // If we've used at least 90% of the page and overflow is minimal (<5%), keep overflow block on this page
      if (percentOfMaxHeight > 0.9 && percentOverflow < 0.05) {
        console.log(`✓ OPTIMIZED: Used ${Math.round(percentOfMaxHeight * 100)}% of page, minimal overflow`);
        console.log(`✓ Keeping content on current page for better space usage (avoiding early page break)`);
        return; // Don't split yet - we're using page efficiently
      }
    }
    
    // Get the blocks we need to move
    const overflowBlocks = blocks.slice(cutIndex);
    
    // Exit if nothing to move (already checked, but being extra safe)
    if (overflowBlocks.length === 0) {
      console.log(`No blocks to move, keeping all content on this page`);
      return;
    }
    
    console.log(`PHYSICAL OVERFLOW: Moving ${overflowBlocks.length} blocks to next page`);
    
    // Find the position of the first block to cut
    const firstOverflowBlock = overflowBlocks[0];
    let targetPos = -1;
    const editorElement = editor.view.dom;
    
    // Try to find position from block attributes
    let current: Element | null = firstOverflowBlock;
    
    // First try to find a data-node-pos attribute
    while (current && current !== editorElement) {
      const posAttr = current.getAttribute('data-node-pos');
      if (posAttr) {
        targetPos = parseInt(posAttr, 10);
        break;
      }
      current = current.parentElement || null;
    }
    
    // Fallback: Approximate position by counting text content
    if (targetPos === -1) {
      let textBefore = '';
      for (let i = 0; i < cutIndex; i++) {
        textBefore += blocks[i].textContent || '';
      }
      // Adjust for newlines
      targetPos = Math.min(textBefore.length + cutIndex, editor.state.doc.content.size - 1);
      targetPos = Math.max(1, targetPos);
    }
    
    // Ensure we have a valid position
    const docSize = editor.state.doc.content.size;
    if (targetPos <= 0 || targetPos >= docSize) {
      console.warn(`Invalid target position ${targetPos} (doc size: ${docSize})`);
      return;
    }
    
    // Adjust to block boundary
    try {
      const $pos = editor.state.doc.resolve(targetPos);
      if ($pos.depth > 0) {
        targetPos = $pos.start($pos.depth);
      }
    } catch (e) {
      console.error('Error resolving position:', e);
      return;
    }
    
    // Extract content from this position to the end
    try {
      const slice = editor.state.doc.slice(targetPos, docSize);
      const docType = editor.schema.nodes.doc;
      const overflowDoc = docType.create(null, slice.content);
      
      // Convert to JSON
      const overflowContent = {
        type: 'doc',
        content: (overflowDoc as any).toJSON().content || []
      };
      
      // Verify content is meaningful
      if (!overflowContent.content || overflowContent.content.length === 0) {
        return;
      }
      
      // Remove extracted content from current page
      const tr = editor.state.tr.delete(targetPos, docSize);
      editor.view.dispatch(tr);
      
      // Move content to next page
      console.log(`Moving content from block ${cutIndex+1} to next page`);
      onContentOverflow(pageIndex, overflowContent);
    } catch (err) {
      console.error('Error extracting overflow content:', err);
    }
  }, [editor, pageIndex, onContentOverflow, calculateAvailableHeight]);
  
  // NEW FUNCTION: Extract only the specific overflowing blocks identified by our algorithm
  const extractOverflowingBlocks = (editor: Editor, overflowingBlocks: Element[], allBlocks: Element[]): JSONContent | null => {
    if (!editor || !editor.view || !editor.view.dom || overflowingBlocks.length === 0) {
      return null;
    }
    
    const editorElement = editor.view.dom;
    
    // Find the index of the first overflowing block in the full blocks array
    const firstOverflowingBlock = overflowingBlocks[0];
    const cutIndex = allBlocks.indexOf(firstOverflowingBlock);
    
    if (cutIndex === -1) {
      console.error("Couldn't find overflowing block in the blocks array");
      return null;
    }
    
    console.log(`Will cut document at block ${cutIndex} of ${allBlocks.length}`);
    
    // Find the position of this block in the document
    let targetPos = -1;
    
    // Try to find position from data attribute first
    let current: Element | null = firstOverflowingBlock;
    while (current && current !== editorElement) {
      const posAttr = current.getAttribute('data-node-pos');
      if (posAttr) {
        targetPos = parseInt(posAttr, 10);
        break;
      }
      current = current.parentElement || null;
    }
    
    // If we couldn't find a position, approximate by counting text
    if (targetPos === -1) {
      // Approximate position by counting text content
      let textBefore = '';
      for (let i = 0; i < cutIndex; i++) {
        textBefore += allBlocks[i].textContent || '';
      }
      // Adjust for newlines
      targetPos = Math.min(textBefore.length + cutIndex, editor.state.doc.content.size - 1);
      targetPos = Math.max(1, targetPos);
    }
    
    // Ensure target position is within valid document range
    const docSize = editor.state.doc.content.size;
    if (targetPos <= 0 || targetPos >= docSize) {
      console.warn(`Invalid target position ${targetPos} (doc size: ${docSize})`);
      return null;
    }
    
    console.log(`Splitting document at position ${targetPos} (document size: ${docSize})`);
    
    // Adjust to block boundary
    try {
      const $pos = editor.state.doc.resolve(targetPos);
      if ($pos.depth > 0) {
        targetPos = $pos.start($pos.depth);
        console.log(`Adjusted to block boundary at position ${targetPos}`);
      }
    } catch (e) {
      console.error('Error resolving position:', e);
    }
    
    // Extract the content from the cut position to the end
    const endPos = docSize;
    
    // Final validation
    if (targetPos <= 0 || targetPos >= endPos) {
      console.warn(`Invalid final position ${targetPos} (end: ${endPos})`);
      return null;
    }
    
    try {
      // Extract content slice
      const slice = editor.state.doc.slice(targetPos, endPos);
      
      // Create standalone document
      const docType = editor.schema.nodes.doc;
      const overflowDoc = docType.create(null, slice.content);
      
      // Convert to JSON
      const overflowContent = {
        type: 'doc',
        content: (overflowDoc as any).toJSON().content || []
      };
      
      // Verify content is meaningful
      if (!overflowContent.content || overflowContent.content.length === 0) {
        return null;
      }
      
      // Remove extracted content from current page
      const tr = editor.state.tr.delete(targetPos, endPos);
      editor.view.dispatch(tr);
      console.log(`Removed ${overflowingBlocks.length} overflowing blocks from current page`);
      
      return overflowContent;
    } catch (err) {
      console.error('Error extracting overflow content:', err);
      return null;
    }
  };
  
  // Original extraction function - keep as a fallback
  const extractOverflowContent = (editor: Editor, maxHeight: number): JSONContent | null => {
    if (!editor || !editor.view || !editor.view.dom) {
      console.warn('Editor not available for extracting overflow content');
      return null;
    }
    
    const editorElement = editor.view.dom;
    
    // Get all block nodes (paragraphs, headings, etc.)
    const blocks = Array.from(editorElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table'));
    
    if (blocks.length <= 1) {
      // If there's only one or zero blocks, we don't need to extract anything
      console.log('Not enough blocks to extract overflow content');
      return null;
    }
    
    console.log(`Looking for overflow content in ${blocks.length} blocks`);
    
    // We'll analyze the position of blocks to determine which ones are overflowing
    // We need to do this because Tiptap doesn't provide direct position information
    
    // Get editor boundaries
    const editorRect = editorElement.getBoundingClientRect();
    const editorTop = editorRect.top;
    const maxVisibleBottom = editorTop + maxHeight;
    
    // Find the LAST block that fits and the FIRST block that overflows
    let cutIndex = -1;
    
    // Log all block positions for debugging
    console.log(`Analyzing ${blocks.length} blocks for overflow detection`);
    
    for (let i = 0; i < blocks.length; i++) {
      const blockRect = blocks[i].getBoundingClientRect();
      console.log(`Block ${i+1}: top=${Math.round(blockRect.top-editorTop)}px, bottom=${Math.round(blockRect.bottom-editorTop)}px, maxVisible=${Math.round(maxHeight)}px`);
      
      // If the bottom of this block extends beyond our visible area
      if (blockRect.bottom > maxVisibleBottom) {
        cutIndex = i;
        console.log(`Found first overflowing block at index ${i} (block ${i+1})`);
        break;
      }
    }
    
    // No overflowing blocks found
    if (cutIndex === -1) {
      console.log(`No blocks are overflowing the page boundary of ${maxHeight}px`);
      return null;
    }
    
    console.log(`Will cut document at overflowing block ${cutIndex+1} (showing blocks 1-${cutIndex})`);
    
    
    try {
      // Only get the blocks beyond our fixed limit
      const overflowingBlocks = blocks.slice(cutIndex);
      
      if (overflowingBlocks.length === 0) {
        console.log('No blocks to extract for overflow');
        return null;
      }
      
      // Need to find the position of the first overflowing block in the document
      // First, find the closest ancestor that has a data-node-pos attribute
      let firstBlock = overflowingBlocks[0];
      let targetPos = -1;
      
      // Traverse upward to find nodes with position information
      let current: Element | null = firstBlock;
      while (current && current !== editorElement) {
        const nodePosAttr = current.getAttribute('data-node-pos');
        if (nodePosAttr) {
          targetPos = parseInt(nodePosAttr, 10);
          break;
        }
        current = current.parentElement || null;
      }
      
      // If we couldn't find a position, use an approximate method
      if (targetPos === -1) {
        // Approximate position by counting text content
        let textBefore = '';
        for (let i = 0; i < cutIndex; i++) {
          textBefore += blocks[i].textContent || '';
        }
        // Add 1 for each block to account for newlines/etc.
        targetPos = Math.min(textBefore.length + cutIndex, editor.state.doc.content.size - 1);
        targetPos = Math.max(1, targetPos);
      }
      
      // Ensure target position is within valid document range
      const docSize = editor.state.doc.content.size;
      if (targetPos <= 0 || targetPos >= docSize) {
        console.warn(`Invalid target position ${targetPos} (doc size: ${docSize})`);
        
        // Simple fallback: extract half of the content
        targetPos = Math.floor(docSize / 2);
        console.log(`Using fallback position: ${targetPos}`);
      }
      
      console.log(`Splitting document at position ${targetPos} (document size: ${docSize})`);
      
      // Get a node resolution for this position to find block boundaries
      try {
        const $pos = editor.state.doc.resolve(targetPos);
        
        // Find the closest parent block node
        if ($pos.depth > 0) {
          // Move to the start of the containing block
          targetPos = $pos.start($pos.depth);
          console.log(`Adjusted to block boundary at position ${targetPos}`);
        }
      } catch (e) {
        console.error('Error resolving position:', e);
      }
      
      // Now extract content from this position to the end
      const endPos = editor.state.doc.content.size;
      
      // Final position validation
      if (targetPos <= 0 || targetPos >= endPos) {
        console.warn(`Invalid final position ${targetPos} (end: ${endPos})`);
        return null;
      }
      
      // Extract the slice of content from target position to end
      const slice = editor.state.doc.slice(targetPos, endPos);
      
      // Convert to a standalone document
      const docType = editor.schema.nodes.doc;
      const overflowDoc = docType.create(null, slice.content);
      
      // Convert to JSON for the next page
      const overflowContent = {
        type: 'doc',
        content: (overflowDoc as any).toJSON().content || []
      };
      
      // Verify we have real content, not just empty paragraphs
      let hasRealContent = false;
      let contentSummary = '';
      
      if (overflowContent.content && overflowContent.content.length > 0) {
        for (const node of overflowContent.content) {
          // Non-paragraph nodes are always considered real content
          if (node.type !== 'paragraph') {
            hasRealContent = true;
            contentSummary += `[${node.type}] `;
            break;
          }
          
          // Check if paragraph has actual text content
          if (node.content && node.content.length > 0) {
            for (const inline of node.content) {
              if (inline.type === 'text' && inline.text) {
                contentSummary += inline.text.substring(0, 20);
                if (inline.text.trim().length > 0) {
                  hasRealContent = true;
                  break;
                }
              } else if (inline.type !== 'text') {
                // Non-text inline nodes (like images) are considered real content
                hasRealContent = true;
                contentSummary += `[${inline.type}] `;
                break;
              }
            }
          }
          
          if (hasRealContent) break;
        }
      }
      
      if (!hasRealContent) {
        console.log('Overflow content has no meaningful content, skipping');
        return null;
      }
      
      console.log(`Extracted overflow content (preview): ${contentSummary}`);
      
      // Remove this content from the current page
      try {
        const tr = editor.state.tr.delete(targetPos, endPos);
        editor.view.dispatch(tr);
        console.log(`Removed overflow content from current page (${endPos - targetPos} chars)`);
      } catch (err) {
        console.error('Error removing overflow content from page:', err);
        return null;
      }
      
      return overflowContent;
      
    } catch (err) {
      console.error('Error in overflow extraction:', err);
      return null;
    }
  };
  
  // IMPROVED PASTE HANDLING SOLUTION
  useEffect(() => {
    if (!editor) return;
    
    // Completely rewritten paste handler to properly integrate with existing content
    const handlePasteOperation = (e?: ClipboardEvent) => {
      console.log('🔥 PASTE DETECTED - IMPROVED HANDLER 🔥');
      
      // Store where the cursor was at paste time
      const cursorPos = editor.state.selection.from;
      console.log(`Paste cursor position: ${cursorPos}`);
      
      // First attempt - let the editor's built-in paste handling work
      // Then we'll process the result afterward in a delayed fashion
      setTimeout(() => {
        // Force an update to ensure content is properly processed
        editor.commands.focus();
        
        // Log a marker to make our paste handling visible in the logs
        console.log('=====================================================');
        console.log('INITIATING PASTE HANDLING - MAKING CONTENT VISIBLE');
        console.log('=====================================================');
        
        try {
          // Get the final content after the paste has been processed by the editor
          const docContent = editor.getJSON();
          
          // Check if content is valid
          if (!docContent || !docContent.content || !Array.isArray(docContent.content)) {
            console.log('No valid content detected - paste may have failed');
            return;
          }
          
          // Count the blocks and make log output to help debug paste issues
          const blockCount = docContent.content.length;
          console.log(`Content has ${blockCount} blocks after paste operation`);
          
          // Log the first few blocks to help with debugging
          const blockPreview = docContent.content.slice(0, 5).map((block, index) => {
            // Try to extract text from the block for preview
            let text = '';
            if (block.content && Array.isArray(block.content)) {
              for (const content of block.content) {
                if (content.type === 'text' && content.text) {
                  text += content.text.substring(0, 20);
                  if (content.text.length > 20) text += '...';
                  break;
                }
              }
            }
            return `Block ${index+1}: [${block.type}] ${text}`;
          }).join('\n');
          
          console.log(`Block preview:\n${blockPreview}\n...plus ${Math.max(0, blockCount-5)} more blocks`);
          
          // For small content (under 15 blocks), just let the normal overflow detection handle it
          if (blockCount <= 15) {
            console.log('Small content - using normal overflow detection');
            checkContentOverflow();
            return;
          }
          
          // For large content, we need our advanced pagination approach
          console.log('Large content detected - using pagination algorithm');
          
          // The maximum blocks we want on a single page 
          const maxBlocksPerPage = 30;
          
          // CRITICAL FIX: Instead of replacing the content, we need to properly identify
          // the pasted content and distribute only that, preserving existing content
          
          // The content is now in the editor - need to split it across pages
          // First split the content for the current page
          const currentPageContent = {
            type: 'doc',
            content: docContent.content.slice(0, maxBlocksPerPage)
          };
          
          // Update the current page
          console.log(`Setting current page to first ${maxBlocksPerPage} blocks`);
          editor.commands.setContent(currentPageContent);
          
          // Get overflow content for additional pages
          const remainingBlocks = docContent.content.slice(maxBlocksPerPage);
          const additionalPagesNeeded = Math.ceil(remainingBlocks.length / maxBlocksPerPage);
          
          if (additionalPagesNeeded > 0) {
            console.log(`Need ${additionalPagesNeeded} additional pages for overflow content`);
            
            // Split remaining content into page-sized chunks
            for (let i = 0; i < additionalPagesNeeded; i++) {
              const startIdx = i * maxBlocksPerPage;
              const endIdx = Math.min((i + 1) * maxBlocksPerPage, remainingBlocks.length);
              const pageBlocks = remainingBlocks.slice(startIdx, endIdx);
              
              // Create the content object for this page
              const pageContent = {
                type: 'doc',
                content: pageBlocks
              };
              
              console.log(`Created page ${i+1} with ${pageBlocks.length} blocks`);
              
              // Schedule creating this page with a delay to prevent race conditions
              setTimeout(() => {
                console.log(`Sending overflow content for page ${i+1} (from page ${pageIndex + 1})`);
                onContentOverflow(pageIndex, pageContent);
              }, (i + 1) * 300);
            }
          }
          
          // After initial page content is set, trigger a content check
          setTimeout(() => {
            // Force overflow check on the current page
            if (editor && editor.view && editor.view.dom) {
              const event = new Event('contentupdate');
              editor.view.dom.dispatchEvent(event);
              console.log('Triggered content overflow check after paste handling');
            }
          }, 100);
        } catch (err) {
          console.error('Error processing paste:', err);
        }
      }, 200);
    };
    
    // Add paste event listener
    document.addEventListener('paste', handlePasteOperation);
    
    // Enhanced input monitor to detect paste operations that the paste event might miss
    let lastHandleTime = 0;
    let lastContentLength = 0;
    const inputThreshold = 800; // Reduced from 1000ms to 800ms for better responsiveness
    
    const monitorContentSize = () => {
      const now = Date.now();
      if (now - lastHandleTime < inputThreshold) {
        return;
      }
      
      try {
        const content = editor.getJSON();
        // Check if content exists and track its length
        const contentArray = content?.content as any[] | undefined;
        
        if (!contentArray) return;
        
        // If content length suddenly increased by a large amount, it's likely a paste operation
        const currentLength = contentArray.length;
        const contentGrowthThreshold = 10; // If content grows by this many blocks, consider it a paste
        
        if (currentLength > 0 && lastContentLength > 0) {
          const contentGrowth = currentLength - lastContentLength;
          
          if (contentGrowth >= contentGrowthThreshold) {
            console.log(`Large content growth detected: +${contentGrowth} blocks (from ${lastContentLength} to ${currentLength})`);
            console.log('Large paste operation detected through content monitoring');
            lastHandleTime = now;
            handlePasteOperation();
          }
        }
        
        // Always track current length for next comparison
        lastContentLength = currentLength;
        
        // Also check absolute size as a fallback detection method
        if (currentLength > 25) {
          console.log(`Large content detected (${currentLength} blocks) - possible paste operation`);
          lastHandleTime = now;
          handlePasteOperation();
        }
      } catch (err) {
        console.error('Error in content monitoring:', err);
      }
    };
    
    // Monitor content updates
    editor.on('update', monitorContentSize);
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePasteOperation);
      editor.off('update', monitorContentSize);
    };
  }, [editor, pageIndex, onContentOverflow, checkContentOverflow]);

  // Update the editor when this component mounts
  useEffect(() => {
    if (editor && !editorCreatedRef.current) {
      console.log(`Editor created for page ${pageIndex}`);
      
      // Register with history manager
      const historyManager = getGlobalHistoryManager();
      if (historyManager) {
        historyManager.registerPageEditor(pageIndex, editor);
        
        // Update active page when focused
        if (isActive) {
          historyManager.setActivePage(pageIndex);
        }
        console.log(`Page ${pageIndex} registered with history manager`);
      } else {
        console.warn(`History manager not available for page ${pageIndex}`);
      }
      
      if (onEditorCreated) {
        onEditorCreated(pageIndex, editor);
      }
      
      editorCreatedRef.current = true;
      
      // Force a content update check after editor is initialized
      setTimeout(() => {
        calculateAvailableHeight();
        checkContentOverflow();
      }, 200);
    }
  }, [editor, pageIndex, onEditorCreated, calculateAvailableHeight, checkContentOverflow]);
  
  // Handle formatting commands - separate effect to properly clean up listeners
  useEffect(() => {
    // Function to handle formatCommand events
    function handleFormatCommand(event: Event) {
      const customEvent = event as CustomEvent<{command: string; attrs?: any; listType?: string; itemType?: string}>;
      if (isActive && editor && customEvent.detail) {
        const { command, attrs, listType, itemType } = customEvent.detail;
        console.log(`Page ${pageIndex} received format command: ${command}`, attrs, listType, itemType);
        
        // Save original selection state
        const { from, to } = editor.state.selection;
        const isCollapsedSelection = from === to;
        
        // Execute the command on this editor if it's active
        try {
          // Special handling for font size to prevent formatting flicker during typing
          if (command === 'setFontSize') {
            // Set the current selection to the font size
            editor.chain().focus().setFontSize(attrs).run();
            
            // Extract the numeric value from the font size
            const sizeValue = parseInt(attrs.replace('px', ''), 10);
            if (!isNaN(sizeValue)) {
              // Update the global format state
              if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
                GLOBAL_FORMAT_STATE.setFontSize(sizeValue);
                console.log(`Page ${pageIndex} updated global font size: ${sizeValue}px`);
              }
            }
            
            // Store the font size for persistence during typing
            editor.storage.lastAppliedFontSize = attrs;
            
            // For cursor position (not selection), ensure next characters inherit the formatting
            if (isCollapsedSelection) {
              // We ensure the cursor position inherits the formatting
              // by setting a mark at that position
              const textStyle = editor.schema.marks.textStyle.create({ fontSize: attrs });
              editor.view.dispatch(
                editor.view.state.tr.addStoredMark(textStyle)
              );
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-fontSize', fontSize: attrs } 
            }));
          } 
          // Special handling for font family to prevent formatting flicker during typing
          else if (command === 'setFontFamily') {
            // Set the current selection to the font family
            editor.chain().focus().setFontFamily(attrs).run();
            
            // Update the global format state
            if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
              GLOBAL_FORMAT_STATE.setFontFamily(attrs);
              console.log(`Page ${pageIndex} updated global font family: "${attrs}"`);
            }
            
            // Store the font family for persistence during typing
            editor.storage.lastAppliedFontFamily = attrs;
            
            // For cursor position (not selection), ensure next characters inherit the formatting
            if (isCollapsedSelection) {
              // We ensure the cursor position inherits the formatting
              // by setting a mark at that position
              const textStyle = editor.schema.marks.textStyle.create({ fontFamily: attrs });
              editor.view.dispatch(
                editor.view.state.tr.addStoredMark(textStyle)
              );
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-fontFamily', fontFamily: attrs } 
            }));
          }
          // Special handling for setHeading command
          else if (command === 'setHeading') {
            if (attrs === null) {
              // For paragraph (null level), we need to use setParagraph
              editor.chain().focus().setParagraph().run();
              // Dispatch event to notify that format was applied
              document.dispatchEvent(new CustomEvent('format:applied'));
              
              // Notify history manager content changed
              document.dispatchEvent(new CustomEvent('content:changed', { 
                detail: { pageIndex, source: 'format-paragraph' } 
              }));
            } else {
              // For headings, set the level
              editor.chain().focus().setHeading({ level: attrs }).run();
              // Dispatch event to notify that format was applied
              document.dispatchEvent(new CustomEvent('format:applied'));
              
              // Notify history manager content changed
              document.dispatchEvent(new CustomEvent('content:changed', { 
                detail: { pageIndex, source: 'format-heading' } 
              }));
            }
          }
          // Special handling for text color
          else if (command === 'setColor') {
            // Set the current selection to the text color
            editor.chain().focus().setColor(attrs).run();
            
            // Update the global format state
            if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
              GLOBAL_FORMAT_STATE.setTextColor(attrs);
              console.log(`Page ${pageIndex} updated global text color: "${attrs}"`);
            }
            
            // For cursor position (not selection), ensure next characters inherit the formatting
            if (isCollapsedSelection) {
              const textStyle = editor.schema.marks.textStyle.create({ color: attrs });
              editor.view.dispatch(
                editor.view.state.tr.addStoredMark(textStyle)
              );
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-textColor', textColor: attrs } 
            }));
          }
          // Special handling for highlight color
          else if (command === 'setHighlight') {
            // Set the current selection to the highlight color
            editor.chain().focus().setHighlight(attrs).run();
            
            // Update the global format state
            if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
              GLOBAL_FORMAT_STATE.setBackgroundColor(attrs.color);
              console.log(`Page ${pageIndex} updated global background color: "${attrs.color}"`);
            }
            
            // For cursor position (not selection), ensure next characters inherit the formatting
            if (isCollapsedSelection) {
              const highlight = editor.schema.marks.highlight.create(attrs);
              editor.view.dispatch(
                editor.view.state.tr.addStoredMark(highlight)
              );
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-highlight', backgroundColor: attrs.color } 
            }));
          }
          // Special handling for unsetting highlight
          else if (command === 'unsetHighlight') {
            // Remove highlight from selection
            editor.chain().focus().unsetHighlight().run();
            
            // Update the global format state
            if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
              GLOBAL_FORMAT_STATE.setBackgroundColor('');
              console.log(`Page ${pageIndex} removed highlight color`);
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-unsetHighlight' } 
            }));
          }
          // Special handling for toggleBulletList command
          else if (command === 'toggleBulletList') {
            console.log(`Page ${pageIndex} toggling bullet list`);
            // Toggle bullet list with our custom extension using the toggleList command
            editor.chain().focus().toggleList('bulletList', 'listItem').run();
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: 'format-toggleBulletList' } 
            }));
            
            // Ensure global history manager records this change
            if (window.historyManager) {
              window.historyManager.addHistoryStep('toggle-bullet-list');
            }
          }
          // Special handling for toggleList command which handles both ordered and bullet lists
          else if (command === 'toggleList' && listType && itemType) {
            console.log(`Page ${pageIndex} toggling list type: ${listType}`);
            
            // Handle based on list type
            if (listType === 'orderedList') {
              try {
                // Use the custom toggleOrderedList command
                // This command provides the proper styling for Google Docs-style numbered lists
                editor.commands.toggleOrderedList();
                
                // The command itself updates the global format state already
              } catch (error) {
                console.error('Error toggling ordered list:', error);
              }
            } else if (listType === 'bulletList') {
              // Use our custom bullet list toggle for bullet lists
              editor.chain().focus().toggleList('bulletList', 'listItem').run();
              
              // Update global format state
              const isActive = editor.isActive('bulletList');
              GLOBAL_FORMAT_STATE.setBulletList(!isActive);
            }
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: `format-toggleList-${listType}` } 
            }));
            
            // Ensure global history manager records this change
            if (window.historyManager) {
              window.historyManager.addHistoryStep(`toggle-${listType}`);
            }
            
            // Schedule a style update for ordered lists
            if (listType === 'orderedList') {
              setTimeout(() => {
                try {
                  // Apply styling to ordered lists
                  const orderedLists = editor.view.dom.querySelectorAll('ol[data-type="orderedList"]');
                  orderedLists.forEach(list => {
                    // Determine nesting level
                    let level = 1;
                    let parent = list.parentElement;
                    
                    while (parent) {
                      if (parent.tagName === 'OL' && parent.getAttribute('data-type') === 'orderedList') {
                        level++;
                      }
                      parent = parent.parentElement;
                    }
                    
                    // Apply the appropriate Google Docs-style class
                    const levelClass = `gdoc-numbered-list-l${((level - 1) % 5) + 1}`;
                    
                    // Remove existing level classes
                    for (let i = 1; i <= 5; i++) {
                      list.classList.remove(`gdoc-numbered-list-l${i}`);
                    }
                    
                    // Add correct level class
                    list.classList.add(levelClass);
                    list.setAttribute('data-level', level.toString());
                  });
                } catch (error) {
                  console.error('Error updating ordered list styles:', error);
                }
              }, 10);
            }
          }
          // For all other commands
          else if (attrs) {
            const chain = editor.chain().focus() as Record<string, Function>;
            chain[command](attrs).run();
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: `format-${command}` } 
            }));
          } else {
            const chain = editor.chain().focus() as Record<string, Function>;
            chain[command]().run();
            
            // Notify of content change for history tracking
            document.dispatchEvent(new CustomEvent('content:changed', { 
              detail: { pageIndex, source: `format-${command}` } 
            }));
          }
          
          // Also notify that format was applied for toolbar updates
          document.dispatchEvent(new CustomEvent('format:applied'));
          
          // Ensure global history manager records this change
          if (window.historyManager) {
            window.historyManager.addHistoryStep();
          }
        } catch (error) {
          console.error(`Error executing command ${command}:`, error);
        }
      }
    }
    
    // Add event listener when component mounts
    if (editor) {
      document.addEventListener('formatCommand', handleFormatCommand);
      
      // Clean up event listener when component unmounts
      return () => {
        document.removeEventListener('formatCommand', handleFormatCommand);
      };
    }
  }, [editor, isActive, pageIndex]);

  // Track cursor position to update formatting state with debouncing
  useEffect(() => {
    if (!editor || !isActive) return;
    
    // Simple debounce function to avoid rapid updates
    let formatUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Function to send formatter update events when cursor position changes
    const notifyFormatChange = () => {
      // Clear any pending update
      if (formatUpdateTimeout) {
        clearTimeout(formatUpdateTimeout);
      }
      
      // Create new timeout for this update (50ms delay gives DOM time to update)
      formatUpdateTimeout = setTimeout(() => {
        console.log(`Page ${pageIndex}: Cursor position changed, notifying format detection`);
        
        // Detect current formatting at cursor position
        if (editor && isActive) {
          // Check for font size
          const fontSize = editor.getAttributes('textStyle').fontSize;
          if (fontSize && typeof GLOBAL_FORMAT_STATE !== 'undefined') {
            // Convert fontSize (like '36px') to number (36)
            const sizeValue = parseInt(fontSize.replace('px', ''), 10);
            if (!isNaN(sizeValue)) {
              GLOBAL_FORMAT_STATE.setFontSize(sizeValue);
              console.log(`Cursor update - font size: ${sizeValue}px`);
            }
          }
          
          // Check for font family
          const fontFamily = editor.getAttributes('textStyle').fontFamily;
          if (fontFamily && typeof GLOBAL_FORMAT_STATE !== 'undefined') {
            GLOBAL_FORMAT_STATE.setFontFamily(fontFamily);
            console.log(`Cursor update - font family: "${fontFamily}"`);
          }
          
          // Check for text formatting (bold/italic/underline) with enhanced detection
          if (typeof GLOBAL_FORMAT_STATE !== 'undefined') {
            // More robust format detection - check both editor state and DOM
            
            // First, use editor's isActive method which is most reliable
            const isBold = editor.isActive('bold');
            const isItalic = editor.isActive('italic');
            const isUnderline = editor.isActive('underline');
            
            // Also check DOM for possible edge cases
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const parentElement = range.commonAncestorContainer.parentElement;
              
              // If we have a parent element, do a DOM-based check as backup
              if (parentElement) {
                const computedStyle = window.getComputedStyle(parentElement);
                
                // Combine results - if either detection method says formatting is applied, consider it active
                const boldFromDOM = computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight, 10) >= 700;
                const italicFromDOM = computedStyle.fontStyle === 'italic';
                const underlineFromDOM = computedStyle.textDecoration.includes('underline');
                
                // Log what each detection method found
                console.log(`DOM detection - Bold: ${boldFromDOM}, Italic: ${italicFromDOM}, Underline: ${underlineFromDOM}`);
                console.log(`Editor detection - Bold: ${isBold}, Italic: ${isItalic}, Underline: ${isUnderline}`);
                
                // Set global state with combined results
                GLOBAL_FORMAT_STATE.setBold(isBold || boldFromDOM);
                GLOBAL_FORMAT_STATE.setItalic(isItalic || italicFromDOM);
                GLOBAL_FORMAT_STATE.setUnderline(isUnderline || underlineFromDOM);
              } else {
                // If no parent element is available, just use editor state
                GLOBAL_FORMAT_STATE.setBold(isBold);
                GLOBAL_FORMAT_STATE.setItalic(isItalic);
                GLOBAL_FORMAT_STATE.setUnderline(isUnderline);
              }
            } else {
              // Fallback to just editor state if no selection
              GLOBAL_FORMAT_STATE.setBold(isBold);
              GLOBAL_FORMAT_STATE.setItalic(isItalic);
              GLOBAL_FORMAT_STATE.setUnderline(isUnderline);
            }
            
            // Get text color and background color
            const textColor = detectTextColor(editor);
            const bgColor = detectBackgroundColor(editor);
            
            if (textColor) {
              GLOBAL_FORMAT_STATE.setTextColor(textColor);
              console.log(`Cursor update - text color: ${textColor}`);
            }
            
            if (bgColor !== undefined) {
              GLOBAL_FORMAT_STATE.setBackgroundColor(bgColor);
              console.log(`Cursor update - background color: ${bgColor || 'none'}`);
            }
            
            // Detect list states using our enhanced detection functions
            // We imported these at the top of the file
            
            // Use enhanced list detection with nesting levels
            const bulletListState = detectBulletList(editor);
            const orderedListState = detectOrderedList(editor);
            
            // Update global state with the detected list formats
            GLOBAL_FORMAT_STATE.setBulletList(bulletListState.active);
            if (bulletListState.active) {
              GLOBAL_FORMAT_STATE.setBulletListLevel(bulletListState.level);
            }
            
            GLOBAL_FORMAT_STATE.setOrderedList(orderedListState.active);
            if (orderedListState.active) {
              GLOBAL_FORMAT_STATE.setOrderedListLevel(orderedListState.level);
            }
            
            // Log final state after all detection
            console.log(`Final format state - Bold: ${GLOBAL_FORMAT_STATE.bold}, Italic: ${GLOBAL_FORMAT_STATE.italic}, Underline: ${GLOBAL_FORMAT_STATE.underline}, BulletList: ${GLOBAL_FORMAT_STATE.bulletList}, OrderedList: ${GLOBAL_FORMAT_STATE.orderedList}`);
          }
        }
      
        // Dispatch event to notify toolbar to update formatting
        document.dispatchEvent(new CustomEvent('format:update', { 
          detail: { 
            editor, 
            pageIndex,
            timestamp: Date.now() // Add timestamp to ensure event is treated as new 
          } 
        }));
      }, 50);
    };
    
    // Enhanced selection tracking that ensures proper update timing
    const handleSelectionUpdate = () => {
      if (isActive) {
        // For selection updates, we need immediate notification for UI feedback
        notifyFormatChange();
        
        // Also schedule another update slightly later to catch formatting after DOM is stable
        setTimeout(notifyFormatChange, 100);
      }
    };
    
    // Track content changes with enhanced logic for input consistency
    const handleDocChange = () => {
      if (isActive) {
        // We deliberately do NOT update formatting during typing
        // This prevents the "flicker" effect where formatting temporarily changes
        // Format updates will come from selectionUpdate events or explicit formatting commands
        
        // Only dispatch this to ensure toolbar stays consistent with content
        // We don't want to detect formatting here as it can cause flickering
        document.dispatchEvent(new CustomEvent('content:changed'));
      }
    };
    
    // Track click events - these need to be very reliable
    const handleClick = () => {
      if (isActive) {
        // On click, we do multiple delayed checks to ensure we get updated formatting
        // First immediate check
        notifyFormatChange();
        
        // Secondary check after DOM has updated
        setTimeout(notifyFormatChange, 50);
        
        // Final check for slow DOM updates
        setTimeout(notifyFormatChange, 150);
      }
    };
    
    // Track key navigation and handle special keys
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      // Only update on navigation keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        console.log(`Key navigation detected in page ${pageIndex} (${e.key})`);
        notifyFormatChange();
      }
    };
    
    // Enhanced keydown handler for format persistence and keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || !editor) return;
      
      // Special handling for Tab key - ensure proper behavior with bullet lists
      if (e.key === 'Tab' && editor.isActive('bulletList')) {
        console.log(`Page ${pageIndex}: Tab pressed in bullet list - handling in final-bullet-list.ts`);
        
        // The event will be handled by our keyboard shortcut in final-bullet-list.ts
        // We don't need to do anything else, but prevent browser's default behavior
        e.preventDefault();
        return;
      }
      
      // Special handling for Tab key - ensure proper behavior with numbered lists
      if (e.key === 'Tab' && editor.isActive('orderedList')) {
        console.log(`Page ${pageIndex}: Tab pressed in ordered list - handling in numbered-list.ts`);
        
        // The event will be handled by our keyboard shortcut in numbered-list.ts
        // We don't need to do anything else, but prevent browser's default behavior
        e.preventDefault();
        return;
      }
      
      // Special handling for Shift+Tab - ensure proper outdenting of bullet lists
      if (e.key === 'Tab' && e.shiftKey && editor.isActive('bulletList')) {
        console.log(`Page ${pageIndex}: Shift+Tab pressed in bullet list - handling in final-bullet-list.ts`);
        
        // The event will be handled by our keyboard shortcut in final-bullet-list.ts
        // We don't need to do anything else, but prevent browser's default behavior
        e.preventDefault();
        return;
      }
      
      // Special handling for Shift+Tab - ensure proper outdenting of numbered lists
      if (e.key === 'Tab' && e.shiftKey && editor.isActive('orderedList')) {
        console.log(`Page ${pageIndex}: Shift+Tab pressed in ordered list - handling in numbered-list.ts`);
        
        // The event will be handled by our keyboard shortcut in numbered-list.ts
        // We don't need to do anything else, but prevent browser's default behavior
        e.preventDefault();
        return;
      }
      
      // Special Backspace handling for bullet lists
      if (e.key === 'Backspace' && editor.isActive('bulletList')) {
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // If we're at the start of an empty list item 
        if (empty && $from.parentOffset === 0 && $from.parent.content.size === 0) {
          console.log(`Page ${pageIndex}: Backspace at start of empty bullet - handling in final-bullet-list.ts`);
          
          // Prevent any default browser behavior
          e.preventDefault();
          
          // Let our Backspace handler in final-bullet-list.ts handle this
          // It will either reduce nesting level or exit the list
          return;
        }
      }
      
      // Special Backspace handling for numbered lists
      if (e.key === 'Backspace' && editor.isActive('orderedList')) {
        const { selection } = editor.state;
        const { empty, $from } = selection;
        
        // If we're at the start of an empty list item 
        if (empty && $from.parentOffset === 0 && $from.parent.content.size === 0) {
          console.log(`Page ${pageIndex}: Backspace at start of empty numbered list item - handling in numbered-list.ts`);
          
          // Prevent any default browser behavior
          e.preventDefault();
          
          // Let our Backspace handler in numbered-list.ts handle this
          // It will either reduce nesting level or exit the list
          return;
        }
      }
      
      // For printable keys (typing), ensure format persistence
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If we have stored formatting from previous commands, apply it to the cursor
        const lastFontSize = editor.storage.lastAppliedFontSize;
        const lastFontFamily = editor.storage.lastAppliedFontFamily;
        
        if (lastFontSize || lastFontFamily) {
          // Create attributes object for the text style mark
          const attrs: Record<string, any> = {};
          if (lastFontSize) attrs.fontSize = lastFontSize;
          if (lastFontFamily) attrs.fontFamily = lastFontFamily;
          
          // Apply the stored mark to ensure format persistence
          const textStyle = editor.schema.marks.textStyle.create(attrs);
          editor.view.dispatch(
            editor.view.state.tr.addStoredMark(textStyle)
          );
        }
      }
    };
    
    // Register all event listeners
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('update', handleDocChange);
    editor.view.dom.addEventListener('click', handleClick);
    editor.view.dom.addEventListener('keyup', handleKeyUp);
    editor.view.dom.addEventListener('keydown', handleKeyDown);
    
    // Initial format update when active
    if (isActive) {
      // Initial check
      notifyFormatChange();
      // Secondary check after DOM has stabilized
      setTimeout(notifyFormatChange, 200);
    }
    
    // Cleanup
    return () => {
      // Clear any pending timeout
      if (formatUpdateTimeout) {
        clearTimeout(formatUpdateTimeout);
      }
      
      // Remove all event listeners
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('update', handleDocChange);
      editor.view.dom.removeEventListener('click', handleClick);
      editor.view.dom.removeEventListener('keyup', handleKeyUp);
      editor.view.dom.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, isActive, pageIndex]);

  // Recalculate overflow on resize
  useEffect(() => {
    const handleResize = () => {
      if (editor) {
        calculateAvailableHeight();
        checkContentOverflow();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editor, calculateAvailableHeight, checkContentOverflow]);
  
  // Check content overflow on initial render and when content changes
  useEffect(() => {
    if (editor && !isInitialMount.current) {
      // Wait for editor to render
      setTimeout(() => {
        calculateAvailableHeight();
        checkContentOverflow();
      }, 100);
      
      // Add a listener for manual content update events
      // This is used when content from another page is moved to this page
      // or when page dimensions are changed
      const handleContentUpdate = (e?: Event) => {
        // Check if this is a CustomEvent with dimension change data
        const customEvent = e as CustomEvent;
        const isDimensionChangeEvent = customEvent && 
                                       customEvent.detail && 
                                       customEvent.detail.dimensionChange === true;
        
        if (isDimensionChangeEvent) {
          console.log(`Page ${pageIndex} received dimension change event - running thorough content recalculation`);
          
          // Get current page dimensions for orientation detection
          if (dimensions) {
            const width = parseFloat(dimensions.width);
            const height = parseFloat(dimensions.height);
            const isLandscape = width > height;
            
            console.log(`Page ${pageIndex} orientation: ${isLandscape ? 'landscape' : 'portrait'} (${width}×${height})`);
          }
          
          // Use a longer delay for dimension changes to ensure DOM has fully updated
          setTimeout(() => {
            // Force recalculation of available height based on new dimensions
            const newHeight = calculateAvailableHeight();
            console.log(`Page ${pageIndex} - Dimension change: new height = ${newHeight}px`);
            
            // For dimension changes, always check all pages regardless of active state
            // This ensures proper content flow when dimensions are modified
            checkContentOverflow();
          }, 250); // Increased delay for better DOM updates
        } else {
          console.log(`Page ${pageIndex} received content update event`);
          
          // For regular content updates, we're more selective about which pages to check
          // Only process if this is the active page or first page
          if (isActive || pageIndex === 0) {
            setTimeout(() => {
              calculateAvailableHeight();
              checkContentOverflow();
            }, 50);
          }
        }
      };
      
      // Add event listener to the editor DOM element
      const editorElement = editor.view.dom;
      editorElement.addEventListener('contentupdate', handleContentUpdate);
      
      // Clean up when component unmounts or editor changes
      return () => {
        editorElement.removeEventListener('contentupdate', handleContentUpdate);
      };
    }
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [editor, calculateAvailableHeight, checkContentOverflow, pageIndex, pageDimensions]);
  
  // Handle header edit
  const handleHeaderBlur = () => {
    setIsEditingHeader(false);
    if (onEditHeader) {
      onEditHeader(pageIndex, headerText);
    }
  };
  
  // Handle footer edit
  const handleFooterBlur = () => {
    setIsEditingFooter(false);
    if (onEditFooter) {
      onEditFooter(pageIndex, footerText);
    }
  };
  
  // Determine if this is a landscape or portrait page
  const isLandscape = parseFloat(dimensions.width) > parseFloat(dimensions.height);
  const pageOrientation = isLandscape ? 'landscape-page' : 'portrait-page';
  
  // Generate a stable key for this page based on dimensions and orientation
  // We removed the Date.now() part because it was causing the component to remount on every render
  const pageKey = `page-${pageIndex}-${isLandscape ? 'landscape' : 'portrait'}-${dimensions.width}-${dimensions.height}`;

  return (
    <div 
      className={`document-page shadow-md relative ${isActive ? 'page-active' : ''} ${pageOrientation}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '2px',
        backgroundColor: dimensions.backgroundColor || '#ffffff',
        position: 'relative',
        zIndex: isLandscape ? 5 : 1, // Much higher z-index for landscape pages
        boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
        isolation: 'isolate', // Create stacking context for each page
        transition: 'none', // Disable transitions to prevent visual artifacts
      }}
      key={pageKey} // Force complete remount of the component when orientation changes
    >
      {/* Absolute opaque background to prevent any bleed-through */}
      <div 
        style={{
          position: 'absolute',
          top: '-5px',
          left: '-5px',
          right: '-5px',
          bottom: '-5px',
          backgroundColor: dimensions.backgroundColor || '#ffffff',
          borderRadius: '5px',
          zIndex: -2,
          opacity: 1,
        }}
      ></div>
      
      {/* Multiple nested opaque background layers */}
      <div 
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: dimensions.backgroundColor || '#ffffff',
          opacity: 1,
          zIndex: -1,
          borderRadius: '2px',
        }}
      ></div>
      
      {/* Third opaque background layer */}
      <div 
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: dimensions.backgroundColor || '#ffffff',
          opacity: 1,
          zIndex: 0,
        }}
      ></div>
      
      {/* Header area - Google Docs style with inline editing */}
      <div 
        className="page-header"
        style={{
          position: 'absolute',
          top: '0',
          left: dimensions.marginLeft,
          right: dimensions.marginRight,
          height: dimensions.headerHeight,
          borderBottom: isEditingHeader ? '1px solid #4285f4' : '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          zIndex: 1, // Ensure it's above background layers
          backgroundColor: dimensions.backgroundColor || '#ffffff', // Match page color
          cursor: 'text',
          // When editing, add a subtle light blue background to indicate active state
          ...(isEditingHeader && { backgroundColor: '#f0f7ff' })
        }}
        onClick={() => {
          // Directly set the header in edit mode on click
          if (!isEditingHeader) {
            setIsEditingHeader(true);
            
            // Highlight the header area to show it's in edit mode
            const pageElement = document.querySelector(`.document-page[data-page="${pageIndex}"]`);
            if (pageElement) {
              const body = document.querySelector('body');
              if (body) {
                body.classList.add('editing-header-footer');
              }
            }
          }
        }}
      >
        {isEditingHeader ? (
          // When editing, show a rich text editor for the header instead of a plain input
          <div className="w-full">
            <div className="flex items-center space-x-2 mb-1 text-sm">
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle bold in header text
                  if (headerText.includes('<strong>')) {
                    setHeaderText(headerText.replace(/<\/?strong>/g, ''));
                  } else {
                    setHeaderText(`<strong>${headerText}</strong>`);
                  }
                }}
              >
                <span className="font-bold">B</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle italic in header text
                  if (headerText.includes('<em>')) {
                    setHeaderText(headerText.replace(/<\/?em>/g, ''));
                  } else {
                    setHeaderText(`<em>${headerText}</em>`);
                  }
                }}
              >
                <span className="italic">I</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle underline in header text
                  if (headerText.includes('<u>')) {
                    setHeaderText(headerText.replace(/<\/?u>/g, ''));
                  } else {
                    setHeaderText(`<u>${headerText}</u>`);
                  }
                }}
              >
                <span className="underline">U</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100 text-xs" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Insert page number token
                  setHeaderText(headerText + '{pageNumber}');
                }}
              >
                Insert Page #
              </button>
              <div className="flex-grow"></div>
              <button 
                className="text-xs text-gray-600 p-1 rounded hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeaderBlur();
                }}
              >
                Done
              </button>
            </div>
            <div 
              className="w-full min-h-[20px] border border-blue-500 p-1 outline-none"
              contentEditable={true}
              dangerouslySetInnerHTML={{ __html: headerText || '' }}
              onBlur={() => {
                // Get the content from the contentEditable div
                const content = document.querySelector('.page-header [contenteditable]')?.innerHTML || '';
                setHeaderText(content);
                handleHeaderBlur();
              }}
              onInput={(e) => {
                // Update the header text as the user types
                const content = (e.target as HTMLDivElement).innerHTML;
                setHeaderText(content);
              }}
              ref={(el) => {
                // Focus the contentEditable div when it's mounted
                if (el && isEditingHeader) {
                  el.focus();
                }
              }}
            />
          </div>
        ) : (
          // When not editing, show the formatted header text
          <div 
            className="text-sm text-gray-500 w-full cursor-text min-h-[24px] flex items-center justify-center"
            dangerouslySetInnerHTML={{ 
              __html: headerText ? 
                getFormattedText(headerText) : 
                '<span class="text-gray-400">Double-click to add header</span>'
            }}
          />
        )}
      </div>
      
      {/* Page content area with additional background for opacity */}
      <div 
        className="page-content"
        style={{
          position: 'absolute',
          top: dimensions.headerHeight,
          left: dimensions.marginLeft,
          right: dimensions.marginRight,
          bottom: dimensions.footerHeight,
          overflow: 'hidden', /* Hide any overflow */
          padding: '8px 0',
          backgroundColor: dimensions.backgroundColor || '#ffffff', // Match page color
          zIndex: 1, // Ensure it's above background layers
        }}
      >
        {editor && (
          <div 
            ref={editorWrapperRef}
            className="editor-container"
            style={{ 
              height: `calc(${dimensions.height} - ${dimensions.headerHeight} - ${dimensions.footerHeight} - 16px)`,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <EditorContent 
              editor={editor} 
              className="editor-content"
              // Add inline style to ensure CSS isn't overriding our overflow settings
              style={{
                overflow: 'hidden',
                maxHeight: `calc(${dimensions.height} - ${dimensions.headerHeight} - ${dimensions.footerHeight} - 16px)`,
              }} 
            />
          </div>
        )}
      </div>
      
      {/* Footer area - Google Docs style with inline editing */}
      <div 
        className="page-footer"
        style={{
          position: 'absolute',
          bottom: '0',
          left: dimensions.marginLeft,
          right: dimensions.marginRight,
          height: dimensions.footerHeight,
          borderTop: isEditingFooter ? '1px solid #4285f4' : '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          zIndex: 1, // Ensure it's above background layers
          backgroundColor: dimensions.backgroundColor || '#ffffff', // Match page color
          cursor: 'text',
          // When editing, add a subtle light blue background to indicate active state
          ...(isEditingFooter && { backgroundColor: '#f0f7ff' })
        }}
        onClick={() => {
          // Directly set the footer in edit mode on click
          if (!isEditingFooter) {
            setIsEditingFooter(true);
            
            // Highlight the footer area to show it's in edit mode
            const pageElement = document.querySelector(`.document-page[data-page="${pageIndex}"]`);
            if (pageElement) {
              const body = document.querySelector('body');
              if (body) {
                body.classList.add('editing-header-footer');
              }
            }
          }
        }}
      >
        {isEditingFooter ? (
          // When editing, show a rich text editor for the footer instead of a plain input
          <div className="w-full">
            <div className="flex items-center space-x-2 mb-1 text-sm">
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle bold in footer text
                  if (footerText.includes('<strong>')) {
                    setFooterText(footerText.replace(/<\/?strong>/g, ''));
                  } else {
                    setFooterText(`<strong>${footerText}</strong>`);
                  }
                }}
              >
                <span className="font-bold">B</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle italic in footer text
                  if (footerText.includes('<em>')) {
                    setFooterText(footerText.replace(/<\/?em>/g, ''));
                  } else {
                    setFooterText(`<em>${footerText}</em>`);
                  }
                }}
              >
                <span className="italic">I</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle underline in footer text
                  if (footerText.includes('<u>')) {
                    setFooterText(footerText.replace(/<\/?u>/g, ''));
                  } else {
                    setFooterText(`<u>${footerText}</u>`);
                  }
                }}
              >
                <span className="underline">U</span>
              </button>
              <button 
                className="p-1 rounded hover:bg-gray-100 text-xs" 
                onClick={(e) => {
                  e.stopPropagation();
                  // Insert page number token
                  setFooterText(footerText + '{pageNumber}');
                }}
              >
                Insert Page #
              </button>
              <div className="flex-grow"></div>
              <button 
                className="text-xs text-gray-600 p-1 rounded hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFooterBlur();
                }}
              >
                Done
              </button>
            </div>
            <div 
              className="w-full min-h-[20px] border border-blue-500 p-1 outline-none"
              contentEditable={true}
              dangerouslySetInnerHTML={{ __html: footerText || '' }}
              onBlur={() => {
                // Get the content from the contentEditable div
                const content = document.querySelector('.page-footer [contenteditable]')?.innerHTML || '';
                setFooterText(content);
                handleFooterBlur();
              }}
              onInput={(e) => {
                // Update the footer text as the user types
                const content = (e.target as HTMLDivElement).innerHTML;
                setFooterText(content);
              }}
              ref={(el) => {
                // Focus the contentEditable div when it's mounted
                if (el && isEditingFooter) {
                  el.focus();
                }
              }}
            />
          </div>
        ) : (
          // When not editing, show the formatted footer text
          <div 
            className="text-sm text-gray-500 w-full cursor-text min-h-[24px] flex items-center justify-center"
            dangerouslySetInnerHTML={{ 
              __html: footerText ? 
                getFormattedText(footerText) : 
                '<span class="text-gray-400">Double-click to add footer</span>'
            }}
          />
        )}
      </div>
      
      {/* Page number indicator (bottom center) */}
      <div 
        className="page-number absolute text-xs text-gray-500 px-2 py-1 bg-white rounded-full shadow-sm"
        style={{
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        {pageNumber} / {totalPages}
      </div>
    </div>
  );
}