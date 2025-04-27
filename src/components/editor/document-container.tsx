import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor, JSONContent } from '@tiptap/react';
import DocumentPage from './document-page';

interface DocumentContainerProps {
  editor: Editor | null;
  pageCount: number;
  zoom: number;
  headers?: string[];
  footers?: string[];
  onEditHeader?: (index: number, headerText: string) => void;
  onEditFooter?: (index: number, footerText: string) => void;
  createPageForOverflow?: () => number;
  deletePage?: (pageIndex: number) => void;
  pageDimensions?: {
    width: string;
    height: string;
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
    headerHeight: string;
    footerHeight: string;
    backgroundColor?: string;
  };
  onPageDimensionsChange?: (dimensions: any) => void;
  headerFooterOptions?: {
    differentFirstPage: boolean;
    differentOddEven: boolean;
  };
}

// Constants for page calculation
const PAGE_HEIGHT = 11 * 96; // 11 inches * 96 DPI
const HEADER_FOOTER_HEIGHT = 100; // 50px header + 50px footer
const CONTENT_HEIGHT_PER_PAGE = PAGE_HEIGHT - HEADER_FOOTER_HEIGHT;

/**
 * Main container for the document that renders the editor with proper formatting
 * similar to Google Docs with pagination and multi-page editing
 */
export default function DocumentContainer({
  editor,
  pageCount,
  zoom,
  headers = [],
  footers = [],
  onEditHeader,
  onEditFooter,
  createPageForOverflow = () => pageCount,
  deletePage,
  pageDimensions = {
    width: '816px',         // Letter size (8.5" x 11") in portrait orientation
    height: '1056px',
    marginTop: '96px',      // 1 inch margins
    marginBottom: '96px',
    marginLeft: '96px',
    marginRight: '96px',
    headerHeight: '50px',
    footerHeight: '50px',
    backgroundColor: '#ffffff'
  },
  onPageDimensionsChange,
  headerFooterOptions = {
    differentFirstPage: false,
    differentOddEven: false
  }
}: DocumentContainerProps) {
  // Reference to the container
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageEditors, setPageEditors] = useState<(Editor | null)[]>([]);
  const [pageContents, setPageContents] = useState<JSONContent[]>([]);
  
  // Initialize page contents from main editor if available
  useEffect(() => {
    if (editor) {
      const initialContent = editor.getJSON();
      const pages = Array.from({ length: pageCount }).map((_, i) => {
        if (i === 0) {
          // First page gets the full content initially
          return initialContent;
        } else {
          // Other pages start with empty content
          return {
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            }]
          };
        }
      });
      setPageContents(pages);
    }
  }, [editor]);
  
  // Update page content when page count changes (pages added or deleted)
  useEffect(() => {
    if (pageCount > pageContents.length) {
      // Adding pages: Add empty content for new pages
      setPageContents(prev => [
        ...prev,
        ...Array(pageCount - prev.length).fill({
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: '' }]
          }]
        })
      ]);
    } else if (pageCount < pageContents.length) {
      // Page deletion with Google Docs-style content redistribution
      // When a page is deleted, its content flows to the previous page, and subsequent pages' content
      // flows upward to maintain document integrity
      setPageContents(prev => {
        // Get all pages that remain after deletion
        let newContents = [...prev.slice(0, pageCount)];
        
        // If we have at least one page to preserve
        if (newContents.length > 0) {
          // Get all deleted pages' content
          const deletedPages = prev.slice(pageCount);
          
          // Extract significant content from deleted pages
          const significantContent: any[] = [];
          for (const deletedPage of deletedPages) {
            if (deletedPage && deletedPage.content && Array.isArray(deletedPage.content) && deletedPage.content.length > 0) {
              // Add all content nodes that aren't just empty paragraphs
              for (const node of deletedPage.content) {
                // For non-paragraph nodes, always include
                if (node.type !== 'paragraph') {
                  significantContent.push(node);
                  continue;
                }
                
                // For paragraphs, check if they have actual content
                if (node.content && Array.isArray(node.content) && node.content.length > 0) {
                  let hasContent = false;
                  for (const inline of node.content) {
                    if (inline.type !== 'text' || (inline.text && inline.text.trim() !== '')) {
                      hasContent = true;
                      break;
                    }
                  }
                  
                  if (hasContent) {
                    significantContent.push(node);
                  }
                }
              }
            }
          }
          
          // If we found significant content, add it to the last preserved page
          if (significantContent.length > 0) {
            const lastPageIndex = newContents.length - 1;
            const lastPageContent = newContents[lastPageIndex];
            
            // Merge the content
            if (lastPageContent?.content) {
              newContents[lastPageIndex] = {
                type: 'doc',
                content: [
                  ...lastPageContent.content,
                  ...significantContent
                ]
              };
              
              console.log(`Merged ${significantContent.length} blocks from deleted page(s) to page ${lastPageIndex + 1}`);
              
              // Schedule overflow check for the page that received content
              setTimeout(() => {
                const receivingEditor = pageEditors[lastPageIndex];
                if (receivingEditor && receivingEditor.view && receivingEditor.view.dom) {
                  console.log(`Triggering content check on page ${lastPageIndex + 1} after page deletion`);
                  const event = new CustomEvent('contentupdate');
                  receivingEditor.view.dom.dispatchEvent(event);
                }
              }, 200);
            }
          }
        }
        
        return newContents;
      });
    }
  }, [pageCount, pageEditors]);
  
  // Register a new page editor when created
  const handleEditorCreated = useCallback((pageIndex: number, editor: Editor) => {
    setPageEditors(prev => {
      const newEditors = [...prev];
      newEditors[pageIndex] = editor;
      return newEditors;
    });
  }, []);
  
  // Handle content overflow from a page to the next
  const handleContentOverflow = useCallback((pageIndex: number, overflowContent: JSONContent) => {
    console.log(`Page ${pageIndex} has overflow content with length ${overflowContent?.content?.length || 0}`);
    
    // IMPORTANT: Don't process content if we have too many pages already
    // This prevents infinite page creation
    if (pageCount > 20) { // Increased from 10 to 20 page limit for larger documents
      console.warn(`Too many pages (${pageCount}), stopping overflow handling`);
      return;
    }
    
    // More permissive throttling for proper content distribution
    // This allows content to flow between pages more naturally
    const timestamp = Date.now();
    const lastGlobalOverflow = pageEditors[0]?.storage.lastGlobalOverflow || 0;
    if (timestamp - lastGlobalOverflow < 250) { // Reduced from 500ms to 250ms for better response
      console.log(`Too many overflow events happening, will try again later`);
      
      // Instead of skipping, schedule a retry
      setTimeout(() => {
        if (pageEditors[0]) {
          pageEditors[0].storage.lastGlobalOverflow = Date.now() - 300; // Set timestamp to allow next try
        }
        const event = new CustomEvent('contentupdate');
        if (pageEditors[pageIndex] && pageEditors[pageIndex].view && pageEditors[pageIndex].view.dom) {
          pageEditors[pageIndex].view.dom.dispatchEvent(event);
        }
      }, 300);
      
      return;
    }
    
    // Set global overflow timestamp on first editor
    if (pageEditors[0]) {
      pageEditors[0].storage.lastGlobalOverflow = timestamp;
    }
    
    // Check if we need to create a new page (if we're on the last page)
    let nextPageIndex = pageIndex + 1;
    
    // If this is the last page, create a new one
    if (pageIndex >= pageCount - 1) {
      console.log(`Creating new page (page ${pageCount + 1}) for overflow content from page ${pageIndex + 1}`);
      nextPageIndex = createPageForOverflow();
      console.log(`New page created with index ${nextPageIndex}`);
    }
    
    // Validate overflow content - must have real content, not just empty paragraphs
    if (!overflowContent || !overflowContent.content || overflowContent.content.length === 0) {
      console.warn('Empty overflow content detected, skipping');
      return;
    }
    
    // Enhanced content validation to prevent content loss
    let hasValidContent = false;
    let textContent = '';
    let contentItemCount = 0;
    
    if (overflowContent.content) {
      for (const node of overflowContent.content) {
        contentItemCount++;
        
        // Non-paragraph blocks are always considered valid
        if (node.type !== 'paragraph') {
          hasValidContent = true;
          break;
        }
        
        // Check paragraph text content
        if (node.content && node.content.length > 0) {
          for (const child of node.content) {
            if (child.type === 'text' && child.text) {
              textContent += child.text;
              if (child.text.trim().length > 0) {
                hasValidContent = true;
              }
            }
          }
        }
      }
    }
    
    // Consider all content valid if there's a significant amount
    if (contentItemCount > 5) {
      hasValidContent = true;
    }
    
    console.log(`Overflow content has text: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}", items: ${contentItemCount}`);
    
    if (!hasValidContent) {
      console.warn('Overflow content has no meaningful text or objects, skipping');
      return;
    }
    
    // Move content to the next page
    console.log(`Moving content from page ${pageIndex + 1} to page ${nextPageIndex + 1}`);
    
    setPageContents(prev => {
      // Create a copy of the page contents
      const newContents = [...prev];
      
      // Ensure we have enough entries in our content array
      while (newContents.length <= nextPageIndex) {
        newContents.push({
          type: 'doc',
          content: [{ 
            type: 'paragraph',
            content: [{ type: 'text', text: '' }]
          }]
        });
      }
      
      // Get the next page's content
      const nextPageContent = newContents[nextPageIndex];
      
      if (!nextPageContent) {
        console.warn(`Next page content (${nextPageIndex}) is undefined`);
        return prev; // Return original state if we couldn't get content
      }
      
      // Create a merged content array with explicit type
      let mergedContent: Array<any> = [];
      
      // Add overflow content first
      if (overflowContent.content && overflowContent.content.length > 0) {
        mergedContent = [...overflowContent.content];
      }
      
      // Only add existing content from the target page if it has real content (not just an empty paragraph)
      let hasExistingContent = false;
      
      if (nextPageContent && nextPageContent.content && nextPageContent.content.length > 0) {
        // Check if there's any non-empty content
        for (const node of nextPageContent.content) {
          if (node.type !== 'paragraph') {
            hasExistingContent = true;
            break;
          }
          
          if (node.content && node.content.length > 0) {
            for (const inline of node.content) {
              if (inline.type === 'text' && inline.text && inline.text.trim() !== '') {
                hasExistingContent = true;
                break;
              }
            }
          }
          
          if (hasExistingContent) break;
        }
        
        // Only merge if the target page has real content
        if (hasExistingContent) {
          console.log(`Target page ${nextPageIndex + 1} has existing content, merging with overflow`);
          mergedContent = [...mergedContent, ...nextPageContent.content];
        }
      }
      
      // Safety check - ensure we have content
      if (mergedContent.length === 0) {
        mergedContent = [{ 
          type: 'paragraph',
          content: [{ type: 'text', text: '' }]
        }];
      }
      
      // Update the next page with the merged content
      newContents[nextPageIndex] = {
        type: 'doc',
        content: mergedContent
      };
      
      console.log(`Updated page ${nextPageIndex + 1} with merged content (${mergedContent.length} blocks)`);
      
      // This overflow might cascade to the next page - delay to let rendering happen
      setTimeout(() => {
        try {
          const nextEditor = pageEditors[nextPageIndex];
          if (nextEditor && nextEditor.view && nextEditor.view.dom) {
            // Force a check for overflow on the next page
            const event = new CustomEvent('contentupdate');
            nextEditor.view.dom.dispatchEvent(event);
            console.log(`Triggered contentupdate event on page ${nextPageIndex + 1}`);
          }
        } catch (err) {
          console.error('Error triggering contentupdate:', err);
        }
      }, 300);
      
      return newContents;
    });
  }, [pageCount, pageEditors, createPageForOverflow]);
  
  // Handle content underflow (when a page has minimal content and could be deleted)
  // This is currently disabled to prevent conflicts with the core overflow functionality
  const handleContentUnderflow = useCallback((pageIndex: number, availableHeight: number) => {
    console.log(`Content underflow detected on page ${pageIndex + 1} (disabled)`);
    // Feature temporarily disabled to prevent content distribution issues
    return;
  }, []);
  
  // Handle focus change between pages
  const handlePageFocus = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);
  
  // Helper functions to get the appropriate header/footer for each page
  const getHeaderForPage = (pageNumber: number): string => {
    if (headers.length === 0) return 'Double-click to add header';
    
    let headerText = '';
    
    // Handle different first page header
    if (headerFooterOptions.differentFirstPage && pageNumber === 1) {
      headerText = headers[0] || '';
    }
    // Handle different odd/even page headers
    else if (headerFooterOptions.differentOddEven) {
      if (pageNumber % 2 === 1) { // Odd pages
        headerText = headers[1] || '';
      } else { // Even pages
        headerText = headers[2] || '';
      }
    }
    // Default header for all pages
    else {
      headerText = headers[0] || '';
    }
    
    // Return the header text (or default if empty)
    return headerText || 'Double-click to add header';
  };
  
  const getFooterForPage = (pageNumber: number): string => {
    if (footers.length === 0) return `Page ${pageNumber}`;
    
    let footerText = '';
    
    // Handle different first page footer
    if (headerFooterOptions.differentFirstPage && pageNumber === 1) {
      footerText = footers[0] || '';
    }
    // Handle different odd/even page footers
    else if (headerFooterOptions.differentOddEven) {
      if (pageNumber % 2 === 1) { // Odd pages
        footerText = footers[1] || '';
      } else { // Even pages
        footerText = footers[2] || '';
      }
    }
    // Default footer for all pages
    else {
      footerText = footers[0] || '';
    }
    
    // If empty, use default page number
    if (!footerText) {
      footerText = `Page ${pageNumber}`;
    }
    
    // Replace {pageNumber} with actual page number
    return footerText.replace(/{pageNumber}/g, pageNumber.toString());
  };
  
  // Handle content changes within a page
  const handleContentChange = useCallback((pageIndex: number, content: JSONContent) => {
    // Update page content in the state
    setPageContents(prev => {
      const newContents = [...prev];
      newContents[pageIndex] = content;
      return newContents;
    });
    
    // Google Docs style automatic page deletion:
    // When a page becomes empty and it's not the first page, we should automatically delete it
    if (pageIndex > 0 && pageCount > 1) {
      // Check if the page is effectively empty - has just one empty paragraph
      const isEmpty = content?.content?.length === 1 && 
                      content.content[0].type === 'paragraph' && 
                      (!content.content[0].content || 
                       !content.content[0].content.length || 
                       (content.content[0].content.length === 1 && 
                        content.content[0].content[0].type === 'text' && 
                        (!content.content[0].content[0].text || content.content[0].content[0].text === '')));
      
      if (isEmpty) {
        console.log(`Page ${pageIndex + 1} is empty - automatically removing this page`);
        if (deletePage) {
          deletePage(pageIndex);
        }
      }
    }
  }, [pageCount, deletePage]);
  
  // Force check overflow on content changes
  useEffect(() => {
    // After content changes or pages are added, force a check of all page contents
    // This ensures content flows correctly between pages after any changes
    const timer = setTimeout(() => {
      if (pageEditors && pageEditors.length > 0) {
        // First make sure all editors are focused once to ensure they're properly initialized
        pageEditors.forEach((editor, i) => {
          if (editor && editor.commands) {
            try {
              // Focus then blur to ensure the editor is initialized
              editor.commands.focus();
              editor.commands.blur();
            } catch (err) {
              // Ignore focus errors
            }
          }
        });
        
        // Then trigger overflow checks on all pages, starting from the first page
        // This ensures content flows in the correct order
        pageEditors.forEach((pageEditor, index) => {
          if (pageEditor && pageEditor.view && pageEditor.view.dom) {
            try {
              // Use a progressive timeout to ensure pages are checked in order
              setTimeout(() => {
                console.log(`Forcing content check on page ${index + 1}`);
                const event = new CustomEvent('contentupdate');
                pageEditor.view.dom.dispatchEvent(event);
              }, index * 50); // Small delay between each page check
            } catch (err) {
              console.error(`Error checking page ${index + 1}:`, err);
            }
          }
        });
      }
    }, 800); // Increased from 500ms to 800ms to allow more time for initial rendering
    
    return () => clearTimeout(timer);
  }, [pageContents, pageCount, pageEditors, pageDimensions]);
  
  // Add a specific effect to handle page dimension changes
  useEffect(() => {
    console.log("Page dimensions changed - triggering content redistribution");
    
    // When page dimensions change, we need to force a complete re-pagination
    // because the content that fits on a page will change
    if (pageEditors && pageEditors.length > 0) {
      // Small delay to allow the DOM to update with new dimensions
      const timer = setTimeout(() => {
        // Force content check on all pages, starting with the first
        pageEditors.forEach((pageEditor, index) => {
          if (pageEditor && pageEditor.view && pageEditor.view.dom) {
            setTimeout(() => {
              console.log(`Triggering content redistribution for page ${index + 1} due to dimension change`);
              // Create a custom event with a flag for dimension change
              // Use CustomEvent instead to pass data
              const event = new CustomEvent('contentupdate', {
                detail: { dimensionChange: true }
              });
              pageEditor.view.dom.dispatchEvent(event);
            }, index * 100); // Slightly longer delay to ensure proper sequencing
          }
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [pageDimensions, pageEditors]);

  // Determine orientation type for use as part of the key
  const orientationType = parseFloat(pageDimensions.width) > parseFloat(pageDimensions.height) 
    ? 'landscape' 
    : 'portrait';
    
  // Generate a stable key that only changes when orientation or dimensions change
  // Using Math.random() was causing the container to remount on every render, preventing typing
  const containerKey = `document-${orientationType}-${pageDimensions.width}-${pageDimensions.height}`;

  return (
    <div 
      className="document-container flex flex-col items-center gap-16" 
      style={{ 
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center',
        marginBottom: '2rem',
        position: 'relative',
        isolation: 'isolate', // Create stacking context to prevent bleed-through
        backgroundColor: orientationType === 'landscape' ? '#f8f9fa' : '#f0f2f5', // Slightly different backgrounds to distinguish orientations
      }}
      ref={containerRef}
      key={containerKey}
      data-orientation={orientationType}
    >
      {Array.from({ length: pageCount }).map((_, index) => (
        <DocumentPage
          key={`page-${index}-${orientationType}`}
          mainEditor={editor}
          pageIndex={index}
          pageNumber={index + 1}
          totalPages={pageCount}
          isActive={currentPage === index}
          content={pageContents[index] || {
            type: 'doc',
            content: [{ 
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            }]
          }}
          onContentOverflow={handleContentOverflow}
          onContentUnderflow={handleContentUnderflow}
          onFocus={handlePageFocus}
          header={getHeaderForPage(index + 1)}
          footer={getFooterForPage(index + 1)}
          onEditHeader={onEditHeader}
          onEditFooter={onEditFooter}
          onEditorCreated={handleEditorCreated}
          onContentChange={handleContentChange}
          pageDimensions={pageDimensions}
        />
      ))}
    </div>
  );
}