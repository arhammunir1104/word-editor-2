import React, { useState } from 'react';

interface TableGridSelectorProps {
  onSelect: (rows: number, cols: number) => void;
  maxRows?: number;
  maxCols?: number;
}

/**
 * Grid selector component for choosing table dimensions
 * Shows a grid of cells that highlights based on user hover position
 * Similar to Google Docs table selector UI
 */
const TableGridSelector: React.FC<TableGridSelectorProps> = ({ 
  onSelect, 
  maxRows = 10, 
  maxCols = 10 
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number, col: number } | null>(null);
  
  // Function to handle mouse entering a cell
  const handleCellHover = (row: number, col: number) => {
    setHoveredCell({ row, col });
  };
  
  // Function to handle selecting a specific cell (finalizing selection)
  const handleCellSelect = () => {
    if (hoveredCell) {
      onSelect(hoveredCell.row + 1, hoveredCell.col + 1);
    }
  };

  // Create the grid rows and cells
  const renderGrid = () => {
    const grid = [];
    
    for (let i = 0; i < maxRows; i++) {
      const row = [];
      
      for (let j = 0; j < maxCols; j++) {
        const isHighlighted = hoveredCell && 
          i <= hoveredCell.row && 
          j <= hoveredCell.col;
        
        row.push(
          <div
            key={`${i}-${j}`}
            className={`table-cell ${isHighlighted ? 'highlighted' : ''}`}
            onMouseEnter={() => handleCellHover(i, j)}
            onClick={handleCellSelect}
          />
        );
      }
      
      grid.push(
        <div key={i} className="table-row">
          {row}
        </div>
      );
    }
    
    return grid;
  };
  
  // Dimension display text (e.g. "3x4 Table")
  const dimensionText = hoveredCell 
    ? `${hoveredCell.row + 1}×${hoveredCell.col + 1} Table` 
    : 'Insert Table';
  
  return (
    <div className="table-grid-selector">
      <div className="grid-header">Insert Table</div>
      <div className="grid-container">
        {renderGrid()}
      </div>
      <div className="dimension-display">
        {dimensionText}
      </div>
      
      <style>{`
        .table-grid-selector {
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          padding: 12px;
          display: flex;
          flex-direction: column;
          width: 320px;
          border: 1px solid #ccc;
        }
        
        .grid-header {
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #444;
          font-family: 'Arial', sans-serif;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        
        .grid-container {
          display: flex;
          flex-direction: column;
          padding: 5px;
          background: #f8f8f8;
          border-radius: 3px;
        }
        
        .table-row {
          display: flex;
        }
        
        .table-cell {
          width: 24px;
          height: 24px;
          border: 1px solid #ddd;
          margin: 1px;
          cursor: pointer;
          background: white;
        }
        
        .table-cell.highlighted {
          background-color: #4285f4;
          border-color: #4285f4;
        }
        
        .dimension-display {
          margin-top: 12px;
          text-align: center;
          font-size: 13px;
          color: #444;
          font-family: 'Arial', sans-serif;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default TableGridSelector;