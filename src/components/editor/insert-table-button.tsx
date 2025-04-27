import React, { useState, useRef, useEffect } from 'react';
import TableGridSelector from './table-grid-selector';

/**
 * Component for handling the table insertion UI and logic
 * Acts as a controller for the grid selector and communicates with the editor
 */
const InsertTableButton: React.FC = () => {
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Function to toggle the grid visibility
  const toggleGrid = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent document click from immediately closing it
    
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      // Position the grid just below the button
      setPosition({
        top: buttonRect.bottom + 5,
        left: buttonRect.left - 150, // Center it under the button
      });
      
      // Toggle the grid visibility
      setShowTableGrid(!showTableGrid);
      console.log("Table grid toggled, visibility:", !showTableGrid);
    }
  };

  // Set up event listener for clicks outside
  useEffect(() => {
    // Only add click outside listener when grid is showing
    if (showTableGrid) {
      const handleClickOutside = (e: MouseEvent) => {
        if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
          setShowTableGrid(false);
        }
      };
      
      // Add with a delay to avoid the current click triggering it
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      
      // Cleanup
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTableGrid]);

  // Handle global event from toolbar button
  useEffect(() => {
    const handleGlobalEvent = () => {
      console.log("Global table insert event received");
      // Use button ref if available, otherwise set a default position
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: buttonRect.bottom + 5,
          left: buttonRect.left - 150,
        });
      } else {
        // Fallback position relative to toolbar
        const toolbar = document.querySelector('.editor-toolbar');
        if (toolbar) {
          const toolbarRect = toolbar.getBoundingClientRect();
          setPosition({
            top: toolbarRect.bottom + 5,
            left: toolbarRect.left + 200,
          });
        }
      }
      setShowTableGrid(true);
    };
    
    // Listen for both click and global event
    document.addEventListener('gdoc:toolbar:insertTable', handleGlobalEvent);
    
    return () => {
      document.removeEventListener('gdoc:toolbar:insertTable', handleGlobalEvent);
    };
  }, []);

  // Function to handle table creation with selected dimensions
  const createTable = (rows: number, cols: number) => {
    console.log(`Creating table with dimensions: ${rows}x${cols}`);
    // Create a custom event to insert the table with the editor
    const tableEvent = new CustomEvent('gdoc:editor:insertTable', {
      detail: { rows, cols }
    });
    document.dispatchEvent(tableEvent);
    setShowTableGrid(false);
  };

  // Explicitly create an invisible button to capture toolbar clicks
  // This will help fix positioning issues by giving us a consistent reference
  useEffect(() => {
    // Create invisible button to hook into
    const invisibleButton = document.createElement('button');
    invisibleButton.id = 'table-button-hook';
    invisibleButton.style.position = 'absolute';
    invisibleButton.style.opacity = '0';
    invisibleButton.style.pointerEvents = 'none';
    
    // Get the real button and position our invisible one over it
    const realButton = document.querySelector('button[title="Insert table"]');
    if (realButton) {
      const rect = realButton.getBoundingClientRect();
      invisibleButton.style.left = `${rect.left}px`;
      invisibleButton.style.top = `${rect.top}px`;
      invisibleButton.style.width = `${rect.width}px`;
      invisibleButton.style.height = `${rect.height}px`;
      
      // Store a reference
      buttonRef.current = realButton as HTMLButtonElement;
      
      // Listen to the real button click to toggle grid
      realButton.addEventListener('click', toggleGrid as any);
    }
    
    return () => {
      // Clean up
      const realButton = document.querySelector('button[title="Insert table"]');
      if (realButton) {
        realButton.removeEventListener('click', toggleGrid as any);
      }
      if (invisibleButton.parentNode) {
        invisibleButton.parentNode.removeChild(invisibleButton);
      }
    };
  }, []);

  return (
    <>
      {showTableGrid && (
        <div 
          ref={gridRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            background: 'white',
            borderRadius: '4px',
            padding: '8px',
          }}
        >
          <TableGridSelector onSelect={createTable} />
        </div>
      )}
    </>
  );
};

export default InsertTableButton;