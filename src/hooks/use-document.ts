import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from './use-toast';
import { debounce } from '../lib/utils';
import { HistoryManager } from '../components/editor/history-manager';

interface UseDocumentOptions {
  documentId?: number;
  initialContent?: any;
  title?: string;
}

/**
 * Custom hook to manage document state and behavior
 */
export function useDocument({ documentId, initialContent, title = 'Untitled document' }: UseDocumentOptions) {
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [headers, setHeaders] = useState<string[]>(['Header']); 
  const [footers, setFooters] = useState<string[]>(['Page 1']); 
  const [headerFooterOptions, setHeaderFooterOptions] = useState({
    differentFirstPage: false,
    differentOddEven: false
  });
  const [pageDimensions, setPageDimensions] = useState({
    width: '816px',         // Letter size (8.5" x 11") in portrait orientation
    height: '1056px',
    marginTop: '96px',      // 1 inch margins
    marginBottom: '96px',
    marginLeft: '96px',
    marginRight: '96px',
    headerHeight: '50px',
    footerHeight: '50px',
    backgroundColor: '#ffffff'
  });
  const [showPageSetupModal, setShowPageSetupModal] = useState(false);
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async ({ content }: { content: any }) => {
      if (!documentId) return null;

      const res = await apiRequest(
        "PATCH",
        `/api/documents/${documentId}`,
        { 
          title, 
          content: {
            ...content,
            headers,
            footers,
            pageCount,
            pageDimensions,
            headerFooterOptions
          }
        }
      );
      return res.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the document",
        variant: "destructive",
      });
    }
  });

  // Debounced save function with history tracking
  const debouncedSave = debounce((content: any) => {
    if (documentId) {
      saveDocumentMutation.mutate({ content });
      
      // Also add to the history manager for undo/redo support
      // Note: We'll use our custom history manager from editor component instead
      // as it manages document state with the editor context
    }
  }, 1000);
  
  // Function to restore a previous state from history
  const restoreDocumentState = (state: any) => {
    if (!state) return;
    
    // Restore headers if present in state
    if (state.headers) {
      setHeaders(state.headers);
    }
    
    // Restore footers if present in state
    if (state.footers) {
      setFooters(state.footers);
    }
    
    // Return the content to be set in the editor
    return state.content;
  };

  // Constants for pagination
  const PAGE_HEIGHT = 11 * 96; // 11 inches * 96 DPI (standard letter)
  const HEADER_FOOTER_HEIGHT = 100; // Combined header (50px) and footer (50px)
  const CONTENT_HEIGHT_PER_PAGE = PAGE_HEIGHT - HEADER_FOOTER_HEIGHT;
  
  // Auto-create a new page if needed - this is called from the DocumentContainer
  // when overflow content from the last page is detected
  const createPageForOverflow = () => {
    const newPageNumber = pageCount + 1;
    console.log(`Creating new page ${newPageNumber} for overflow content`);
    
    // Set the new page count immediately
    setPageCount(prevCount => {
      const newCount = prevCount + 1;
      console.log(`Increasing page count from ${prevCount} to ${newCount}`);
      return newCount;
    });
    
    // Add new header and footer for the new page based on the header/footer options
    if (headerFooterOptions.differentFirstPage && headerFooterOptions.differentOddEven) {
      // We need to maintain 3 headers/footers: [0] first page, [1] odd pages, [2] even pages
      // But we don't add new headers/footers since they are shared across pages
      console.log('Using existing headers/footers with different first page and odd/even pages');
    } 
    else if (headerFooterOptions.differentOddEven) {
      // We need to maintain 2 headers/footers: [0] odd pages, [1] even pages
      // But we don't add new headers/footers since they are shared across pages
      console.log('Using existing headers/footers with odd/even pages');
    }
    else if (headerFooterOptions.differentFirstPage) {
      // We need to maintain 2 headers/footers: [0] first page, [1] all other pages
      // But we don't add new headers/footers since they are shared across pages
      console.log('Using existing headers/footers with different first page');
    }
    else {
      // Default case: Single header/footer for all pages
      // In this case, we still need to add a new footer if we don't have enough
      if (headers.length <= pageCount) {
        setHeaders(prev => {
          const newHeaders = [...prev, 'Header'];
          console.log('Updated headers for new page:', newHeaders);
          return newHeaders;
        });
      }
      
      if (footers.length <= pageCount) {
        setFooters(prev => {
          const newFooters = [...prev, `Page {pageNumber}`];
          console.log('Updated footers for new page:', newFooters);
          return newFooters;
        });
      }
    }
    
    // Return 0-based index of the new page
    return pageCount; // Current pageCount is still the old value due to state updates
  };

  // Add a new page manually
  const addPage = () => {
    setPageCount(prev => prev + 1);
    
    // Add headers/footers only if needed based on the current options
    if (!headerFooterOptions.differentFirstPage && !headerFooterOptions.differentOddEven) {
      // Default case: one header/footer per page
      setHeaders(prev => [...prev, 'Header']);
      setFooters(prev => [...prev, `Page {pageNumber}`]);
    }
    // Otherwise, headers/footers are shared across pages based on first/odd/even settings
  };
  
  // Delete a page with Google Docs-like behavior
  const deletePage = (pageIndex: number) => {
    // Don't delete the first/only page
    if (pageCount <= 1 || pageIndex < 0) {
      console.log('Cannot delete the first or only page');
      return;
    }
    
    console.log(`Deleting page ${pageIndex + 1} - Google Docs style`);
    
    // Reduce the page count
    setPageCount(prev => prev - 1);
    
    // Only remove headers/footers if they're not shared across pages
    if (!headerFooterOptions.differentFirstPage && !headerFooterOptions.differentOddEven) {
      // In the default case (one header/footer per page), remove this page's header/footer
      setHeaders(prev => {
        const newHeaders = [...prev];
        newHeaders.splice(pageIndex, 1);
        return newHeaders;
      });
      
      setFooters(prev => {
        const newFooters = [...prev];
        newFooters.splice(pageIndex, 1);
        
        // Update page numbers in footers (if they follow the standard format)
        return newFooters.map((footer, idx) => {
          // If the footer contains a page number token, don't change it (it will be dynamically replaced)
          if (footer.includes('{pageNumber}')) {
            return footer;
          }
          // If the footer is a standard page number format, update it
          else if (footer.match(/^Page \d+$/)) {
            return `Page ${idx + 1}`;
          }
          return footer;
        });
      });
    } 
    // Otherwise, do not modify the headers/footers array since the items are shared
    // across multiple pages based on the first/odd/even settings
    
    // The content redistribution happens in document-container.tsx
    // It will update the page contents array when this page is removed
  };

  // Edit header content with history tracking
  const editHeader = (index: number, headerText: string) => {
    // Store the previous state before making changes
    const prevHeaders = [...headers];
    
    setHeaders(prev => {
      const newHeaders = [...prev];
      newHeaders[index] = headerText;
      
      // Add to history manager to support undo/redo
      // Note: History tracking for headers is now managed in the editor component
      
      return newHeaders;
    });
  };

  // Edit footer content with history tracking
  const editFooter = (index: number, footerText: string) => {
    // Store the previous state before making changes
    const prevFooters = [...footers];
    
    setFooters(prev => {
      const newFooters = [...prev];
      newFooters[index] = footerText;
      
      // Add to history manager to support undo/redo
      // Note: History tracking for footers is now managed in the editor component
      
      return newFooters;
    });
  };

  // Load initial content if available
  useEffect(() => {
    if (initialContent) {
      // If we have headers/footers/pageCount in initial content, set them
      if (initialContent.headers && Array.isArray(initialContent.headers)) {
        setHeaders(initialContent.headers);
      }
      
      if (initialContent.footers && Array.isArray(initialContent.footers)) {
        setFooters(initialContent.footers);
      }
      
      if (initialContent.pageCount && typeof initialContent.pageCount === 'number') {
        setPageCount(initialContent.pageCount);
      }
      
      // Load page dimensions if available
      if (initialContent.pageDimensions) {
        setPageDimensions(prev => ({
          ...prev,
          ...initialContent.pageDimensions
        }));
      }
      
      // Load header/footer options if available
      if (initialContent.headerFooterOptions) {
        setHeaderFooterOptions(prev => ({
          ...prev,
          ...initialContent.headerFooterOptions
        }));
      }
    }
  }, [initialContent]);

  // Handle page dimensions update
  const handlePageDimensionsChange = (newDimensions: any) => {
    // Check if orientation is changing
    const isOrientationChange = (
      (parseFloat(pageDimensions.width) > parseFloat(pageDimensions.height) && 
       parseFloat(newDimensions.width) < parseFloat(newDimensions.height)) ||
      (parseFloat(pageDimensions.width) < parseFloat(pageDimensions.height) && 
       parseFloat(newDimensions.width) > parseFloat(newDimensions.height))
    );
    
    if (isOrientationChange) {
      console.log('ORIENTATION CHANGE DETECTED - COMPLETELY REBUILDING DOCUMENT');
      
      // First update dimensions
      setPageDimensions(prev => ({
        ...prev,
        ...newDimensions
      }));
      
      // Reset to 1 page to prevent old pages from showing through
      setPageCount(1);
      
      // Reset page index
      setCurrentPage(0);
      
      // Notify user of changes
      toast({
        title: "Page orientation changed",
        description: "Document has been reset to the new orientation",
      });
    } else {
      // For non-orientation changes, just update the dimensions
      setPageDimensions(prev => ({
        ...prev,
        ...newDimensions
      }));
      
      // Notify user of changes
      toast({
        title: "Page setup updated",
        description: "Document dimensions and appearance have been updated",
      });
    }
  };

  // Toggle page setup modal
  const togglePageSetupModal = () => {
    setShowPageSetupModal(prev => !prev);
  };
  
  // Handle header/footer options changes
  const handleHeaderFooterOptionsChange = (options: { differentFirstPage: boolean; differentOddEven: boolean }) => {
    setHeaderFooterOptions(options);
    
    // When enabling different first page, we need to ensure we have 3 headers/footers slots:
    // [0] = first page, [1] = odd pages, [2] = even pages
    if (options.differentFirstPage && options.differentOddEven) {
      const defaultHeader = "Header";
      const defaultFooter = "Page {pageNumber}";
      
      setHeaders(prev => {
        const newHeaders = [...prev];
        // Ensure we have at least 3 header slots
        while (newHeaders.length < 3) {
          newHeaders.push(defaultHeader);
        }
        return newHeaders;
      });
      
      setFooters(prev => {
        const newFooters = [...prev];
        // Ensure we have at least 3 footer slots
        while (newFooters.length < 3) {
          newFooters.push(defaultFooter);
        }
        return newFooters;
      });
    }
    
    // When enabling only odd/even pages, we need to ensure we have 2 headers/footers slots:
    // [0] = odd pages, [1] = even pages
    else if (options.differentOddEven) {
      const defaultHeader = "Header";
      const defaultFooter = "Page {pageNumber}";
      
      setHeaders(prev => {
        const newHeaders = [...prev];
        // Ensure we have at least 2 header slots
        while (newHeaders.length < 2) {
          newHeaders.push(defaultHeader);
        }
        return newHeaders;
      });
      
      setFooters(prev => {
        const newFooters = [...prev];
        // Ensure we have at least 2 footer slots
        while (newFooters.length < 2) {
          newFooters.push(defaultFooter);
        }
        return newFooters;
      });
    }
  };
  
  // Toggle header footer mode
  const [showHeaderFooterMode, setShowHeaderFooterMode] = useState(false);
  const toggleHeaderFooterMode = () => {
    setShowHeaderFooterMode(prev => !prev);
  };

  return {
    pageCount,
    currentPage,
    headers,
    footers,
    headerFooterOptions,
    pageDimensions,
    showPageSetupModal,
    showHeaderFooterMode,
    contentMeasureRef,
    setCurrentPage,
    addPage,
    deletePage,
    editHeader,
    editFooter,
    handleHeaderFooterOptionsChange,
    createPageForOverflow,
    handlePageDimensionsChange,
    togglePageSetupModal,
    toggleHeaderFooterMode,
    debouncedSave,
    restoreDocumentState // Export the restore function for undo/redo operations
  };
}