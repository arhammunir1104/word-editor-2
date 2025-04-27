import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { RedBoxNodeView } from './red-box-node-view';

// Define a proper TipTap extension for the red box
export const RedBoxExtension = Node.create({
  name: 'redBox',
  
  group: 'block',
  
  // Make it selectable so user can delete it
  selectable: true,
  
  // Set draggable to false to prevent accidental moves
  draggable: false,
  
  // Define the HTML that will be parsed to identify our red box
  parseHTML() {
    return [
      {
        tag: 'div[data-type="red-box"]',
      },
    ];
  },
  
  // Define how this node should be rendered in HTML
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'red-box', class: 'red-box' }), ''];
  },
  
  // Connect our React component as the node view
  addNodeView() {
    return ReactNodeViewRenderer(RedBoxNodeView);
  },
});

export default RedBoxExtension;