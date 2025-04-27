import React from 'react';

interface PageNumberProps {
  index: number;
  pageCount: number;
  pageHeight: number;
}

/**
 * Renders page number indicators on document pages
 */
export default function PageNumber({ index, pageCount, pageHeight }: PageNumberProps) {
  return (
    <div 
      className="page-number"
      style={{
        position: 'absolute',
        right: '12px',
        top: `${index * pageHeight + 8}px`,
        padding: '4px 6px',
        backgroundColor: 'rgba(247, 247, 247, 0.8)',
        border: '1px solid #eee',
        borderRadius: '3px',
        fontSize: '10px',
        color: '#888',
        fontWeight: 400,
        zIndex: 10,
      }}
    >
      {index + 1}/{pageCount}
    </div>
  );
}