import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import DocumentContainer from './document-container';
import DocumentControls from './document-controls';
import PageSetupModal from './page-setup-modal';
import { useDocument } from '../../hooks/use-document';
import { Button } from '../../components/ui/button';
import { Trash2, Plus, Settings } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';


interface PageManagerProps {
  editor: Editor | null;
  zoom: number; 
}

export default function PageManager({ editor, zoom }: PageManagerProps) {
  const {
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
    restoreDocumentState
  } = useDocument({});
  
  const { toast } = useToast();
  
  // Handle zoom change
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const zoomLevels = [50, 75, 100, 125, 150, 175, 200];
  
  const handleZoomChange = useCallback((newZoom: number) => {
    setCurrentZoom(newZoom);
  }, []);
  
  // Scroll to page
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    
    // Scroll to the page
    const pageHeight = 11 * 96; // 11 inches * 96 DPI
    window.scrollTo({
      top: (page - 1) * pageHeight * (currentZoom / 100),
      behavior: 'smooth',
    });
  }, [currentZoom, setCurrentPage]);

  // Add new page with button
  const handleAddPage = useCallback(() => {
    addPage();
    // After adding a page, navigate to it
    setTimeout(() => {
      handlePageChange(pageCount + 1);
    }, 50);
  }, [addPage, handlePageChange, pageCount]);

  // Delete current page
  const handleDeletePage = useCallback(() => {
    if (pageCount <= 1) return; // Don't delete the last page
    
    const pageToDelete = currentPage - 1; // Convert to 0-based index
    deletePage(pageToDelete);
    
    // If we deleted the current page, move to the previous page
    if (currentPage > 1 && currentPage === pageCount) {
      handlePageChange(currentPage - 1);
    }
  }, [pageCount, currentPage, deletePage, handlePageChange]);
  
  // Helper functions to update document state from history
  const updateHeadersFromHistory = useCallback((newHeaders: string[]) => {
    if (editHeader && newHeaders) {
      // For each header in the array, update it in the document
      newHeaders.forEach((headerContent, index) => {
        if (index < pageCount) {
          editHeader(index, headerContent);
        }
      });
    }
  }, [editHeader, pageCount]);
  
  const updateFootersFromHistory = useCallback((newFooters: string[]) => {
    if (editFooter && newFooters) {
      // For each footer in the array, update it in the document
      newFooters.forEach((footerContent, index) => {
        if (index < pageCount) {
          editFooter(index, footerContent);
        }
      });
    }
  }, [editFooter, pageCount]);
  
  const updateHeaderFooterOptionsFromHistory = useCallback((options: any) => {
    if (handleHeaderFooterOptionsChange && options) {
      handleHeaderFooterOptionsChange(options);
    }
  }, [handleHeaderFooterOptionsChange]);
  
  // We're no longer handling undo/redo globally here, as it's now handled in the main editor component

  // Save content when editor changes
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      // Save content
      debouncedSave(editor.getJSON());
    };
    
    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);
  
  // Removed keyboard shortcut handling for undo/redo as it's now handled in the main editor component
  
  // Listen for header/footer mode events
  useEffect(() => {
    // Handle toolbar button click
    const handleToggleHeaderFooterMode = () => {
      toggleHeaderFooterMode();
    };
    
    // Handle double-clicking on a header or footer
    const handleEnterHeaderFooterMode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, pageNumber } = customEvent.detail || {};
      
      // Change to the page where the header/footer was clicked
      if (pageNumber && pageNumber !== currentPage) {
        setCurrentPage(pageNumber);
      }
      
      // Open the header/footer mode
      if (!showHeaderFooterMode) {
        toggleHeaderFooterMode();
      }
    };
    
    // Listen for header/footer events
    document.addEventListener('toggleHeaderFooterMode', handleToggleHeaderFooterMode);
    document.addEventListener('enterHeaderFooterMode', handleEnterHeaderFooterMode);
    
    return () => {
      document.removeEventListener('toggleHeaderFooterMode', handleToggleHeaderFooterMode);
      document.removeEventListener('enterHeaderFooterMode', handleEnterHeaderFooterMode);
    };
  }, [toggleHeaderFooterMode, currentPage, showHeaderFooterMode, setCurrentPage]);

  // Handle scroll to change current page
  useEffect(() => {
    const handleScroll = () => {
      if (!editor) return;
      
      // Get scroll position and estimate current page
      const scrollPosition = window.scrollY;
      const pageHeight = 11 * 96; // 11 inches * 96 DPI
      const estimatedPage = Math.floor(scrollPosition / (pageHeight * (currentZoom / 100))) + 1;
      
      if (estimatedPage !== currentPage && estimatedPage <= pageCount) {
        setCurrentPage(estimatedPage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [editor, currentPage, pageCount, currentZoom, setCurrentPage]);

  return (
    <div className="page-manager flex flex-col items-center relative bg-gray-100 min-h-screen pt-4">
      {/* Page controls - Moved to left side with increased top margin to avoid overlap with undo/redo buttons */}
      <div className="fixed top-32 left-4 flex flex-col gap-2 z-30">
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleAddPage}
          title="Add page"
          className="bg-white shadow-sm hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleDeletePage}
          disabled={pageCount <= 1}
          title="Delete current page"
          className="bg-white shadow-sm hover:bg-gray-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={togglePageSetupModal}
          title="Page setup"
          className="bg-white shadow-sm hover:bg-gray-50"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Document controls - Fixed at the bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <DocumentControls 
          pageCount={pageCount}
          currentPage={currentPage}
          zoom={currentZoom}
          onAddPage={handleAddPage}
          onPageChange={handlePageChange}
          onZoomChange={handleZoomChange}
          zoomLevels={zoomLevels}
        />
      </div>
      
      {/* Document container with all pages */}
      <div className="pb-16">
        <DocumentContainer 
          editor={editor}
          pageCount={pageCount}
          zoom={currentZoom}
          headers={headers}
          footers={footers}
          onEditHeader={editHeader}
          onEditFooter={editFooter}
          createPageForOverflow={createPageForOverflow}
          deletePage={deletePage}
          pageDimensions={pageDimensions}
          onPageDimensionsChange={handlePageDimensionsChange}
          headerFooterOptions={headerFooterOptions}
        />
      </div>
      
      {/* Page Setup Modal */}
      {showPageSetupModal && (
        <PageSetupModal
          pageDimensions={pageDimensions}
          onPageSetupChange={handlePageDimensionsChange}
          isOpen={showPageSetupModal}
          onClose={togglePageSetupModal}
        />
      )}
      
      {/* Hidden div for content measurement */}
      <div 
        ref={contentMeasureRef} 
        className="hidden"
      />
    </div>
  );
}