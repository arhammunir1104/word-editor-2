import { Node, mergeAttributes } from '@tiptap/core';

/**
 * UltimateRedBox Extension for TipTap
 * 
 * A simple, direct implementation of a red box node that renders without dependencies
 * on other components.
 */
export const UltimateRedBox = Node.create({
  name: 'ultimateRedBox',
  
  group: 'block',
  
  content: '',
  
  defining: true,
  
  selectable: true,
  
  draggable: false,
  
  atom: true, // Make it an atomic node that can't be partially selected
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="ultimate-red-box"]',
      },
    ];
  },
  
  renderHTML() {
    return [
      'div', 
      {
        'data-type': 'ultimate-red-box',
        'class': 'ultimate-red-box',
        'style': 'width: 100px; height: 100px; background-color: red; margin: 10px 0; border: 2px solid darkred; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);'
      },
      ''
    ];
  },
  
  addCommands() {
    return {
      insertUltimateRedBox: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name
        });
      },
    };
  },
});

export default UltimateRedBox;