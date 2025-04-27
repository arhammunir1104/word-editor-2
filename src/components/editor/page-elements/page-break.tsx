import React from 'react';

interface PageBreakProps {
  index: number;
  pageHeight: number;
}

/**
 * Renders a visual page break between document pages
 */
export default function PageBreak({ index, pageHeight }: PageBreakProps) {
  return (
    <div 
      className="page-break"
      style={{
        position: 'absolute',
        top: `${(index + 1) * pageHeight}px`,
        left: 0,
        width: '100%',
        height: '1px',
        backgroundColor: '#ddd',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
        zIndex: 1,
      }}
    />
  );
}