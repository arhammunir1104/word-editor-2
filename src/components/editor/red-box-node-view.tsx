import React from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'

// This is a React component that renders our red box
export const RedBoxNodeView: React.FC<NodeViewProps> = ({
  node,
  selected,
}) => {
  return (
    <NodeViewWrapper className="red-box-node-wrapper">
      <div 
        className={`red-box-element ${selected ? 'selected' : ''}`}
        style={{
          width: '100px',
          height: '100px',
          backgroundColor: 'red',
          margin: '10px 0',
          border: selected ? '3px solid blue' : '2px solid darkred',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
        }}
        data-drag-handle
      />
    </NodeViewWrapper>
  )
}

export default RedBoxNodeView