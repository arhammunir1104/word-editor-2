import { Node, mergeAttributes } from '@tiptap/core';

/**
 * SimpleRedBox Extension for TipTap
 * 
 * Implements a very basic red box node that doesn't rely on React rendering,
 * making it more resistant to rendering cycle issues.
 */
export const SimpleRedBox = Node.create({
  name: 'simpleRedBox',
  
  group: 'block',
  
  selectable: true,
  
  draggable: false,
  
  parseHTML() {
    return [
      {
        tag: 'div.simple-red-box',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        HTMLAttributes,
        {
          class: 'simple-red-box',
          style: 'width: 100px; height: 100px; background-color: red; margin: 10px 0; border: 2px solid darkred; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);'
        }
      ),
      ''
    ];
  },
  
  // Add commands for creating the red box
  addCommands() {
    return {
      insertSimpleRedBox: () => ({ chain, commands }) => {
        // Use standard commands API to insert content
        return commands.insertContent({
          type: this.name
        });
      },
    };
  },
});

export default SimpleRedBox;