import React from 'react';
import { ZoomIn, ZoomOut, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentControlsProps {
  pageCount: number;
  currentPage: number;
  zoom: number;
  onAddPage: () => void;
  onZoomChange?: (zoom: number) => void;
  onPageChange?: (page: number) => void;
  zoomLevels?: number[];
}

/**
 * Renders document control buttons like page navigation and add page
 */
export default function DocumentControls({
  pageCount,
  currentPage = 1,
  zoom = 100,
  onAddPage,
  onZoomChange,
  onPageChange,
  zoomLevels = [50, 75, 100, 125, 150, 175, 200]
}: DocumentControlsProps) {
  
  // Handle zoom in button
  const handleZoomIn = () => {
    if (!onZoomChange) return;
    
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };
  
  // Handle zoom out button
  const handleZoomOut = () => {
    if (!onZoomChange) return;
    
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };
  
  // Handle zoom select change
  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onZoomChange) return;
    onZoomChange(parseInt(e.target.value, 10));
  };
  
  return (
    <div className="document-controls flex items-center gap-2">
      {/* Google Docs-like page navigation controls */}
      <div 
        className="page-navigation flex items-center gap-2 bg-white shadow-sm px-4 py-2 rounded-full"
      >
        {onPageChange && (
          <>
            <button 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="page-indicator text-sm text-gray-700 font-medium mx-1">
              Page {currentPage} of {pageCount}
            </div>
            
            <button 
              onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
              className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        
        {/* Add page button */}
        <div className="h-5 border-r border-gray-300 mx-1"></div>
        <button
          onClick={onAddPage}
          className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Add page"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* Zoom controls */}
      {onZoomChange && (
        <div className="zoom-controls flex items-center gap-2 bg-white shadow-sm px-4 py-2 rounded-full">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={zoom <= zoomLevels[0]}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <select
            value={zoom}
            onChange={handleZoomChange}
            className="text-sm bg-transparent border-none focus:ring-0 px-2 py-1 rounded text-gray-700 font-medium appearance-none cursor-pointer"
          >
            {zoomLevels.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
          
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}