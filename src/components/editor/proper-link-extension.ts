/**
 * Enhanced Link Extension
 * 
 * This is a complete replacement for TipTap's default link extension
 * that ensures links are properly rendered with visible styling.
 */

import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Create a properly styled link extension
export const ProperLink = Mark.create({
  name: 'link',
  
  // Give this extension higher priority to override the default one
  priority: 1000,
  
  // Define default options for the extension
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'editor-direct-link custom-link',
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        'data-type': 'link',
        'data-is-link': 'true',
        style: 'color: red; background-color: yellow; text-decoration: underline; padding: 0 2px; border-radius: 2px; font-weight: bold;'
      },
    }
  },
  
  // Define parseable attributes
  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: this.options.HTMLAttributes.target,
      },
      class: {
        default: this.options.HTMLAttributes.class,
      },
      rel: {
        default: this.options.HTMLAttributes.rel,
      },
      'data-type': {
        default: this.options.HTMLAttributes['data-type'],
      },
      'data-is-link': {
        default: this.options.HTMLAttributes['data-is-link'],
      },
      style: {
        default: this.options.HTMLAttributes.style,
      }
    }
  },
  
  // Critical: This controls how the link is rendered in the DOM
  renderHTML({ HTMLAttributes }) {
    // Force styling attributes to ensure visibility
    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        'data-type': 'link',
        'data-is-link': 'true',
        style: 'color: red; background-color: yellow; text-decoration: underline; padding: 0 2px; border-radius: 2px; font-weight: bold;'
      }
    )
    
    // Return an actual <a> tag with properly merged attributes
    // The '0' means this will wrap around child content
    return ['a', attrs, 0]
  },
  
  // Parse <a> tags from HTML content
  parseHTML() {
    return [
      { tag: 'a[href]:not([href *= "javascript:" i])' },
    ]
  },
  
  // Add prosemirror plugins for special link behavior
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('properLinkClickHandler'),
        props: {
          handleClick: (view, pos, event) => {
            // Get any link attributes at the current position
            const attrs = this.editor.getAttributes('link')
            
            // If we have a link with href
            if (attrs.href) {
              // If Ctrl/Cmd key is pressed, open in new tab
              if (event.ctrlKey || event.metaKey) {
                window.open(attrs.href, '_blank')
                return true
              }
              
              // Regular click - show the link editing modal
              document.dispatchEvent(new CustomEvent('link:clicked', {
                detail: { href: attrs.href }
              }))
              
              return true
            }
            
            return false
          },
        },
      }),
      
      // Add second plugin to ensure links are styled after any editor transaction
      new Plugin({
        key: new PluginKey('properLinkStylingPlugin'),
        // This runs after every transaction in the editor
        appendTransaction: (transactions, oldState, newState) => {
          // Check if we need to update link styling
          if (transactions.some(tr => tr.docChanged)) {
            // Schedule styling update
            setTimeout(() => {
              applyLinkStyling();
            }, 0);
          }
          return null;
        },
      }),
    ]
  },
})

// Function to directly style links in the editor when needed
export function applyLinkStyling() {
  const links = document.querySelectorAll('.ProseMirror a');
  
  if (links.length > 0) {
    console.log(`Found ${links.length} links to style properly`);
    
    links.forEach(link => {
      // Apply direct styling
      const element = link as HTMLElement;
      
      // Ensure all styling attributes are present
      element.classList.add('editor-direct-link', 'custom-link');
      element.setAttribute('data-type', 'link');
      element.setAttribute('data-is-link', 'true');
      
      // Apply direct CSS for maximum visibility
      element.style.color = 'red';
      element.style.backgroundColor = 'yellow';
      element.style.textDecoration = 'underline';
      element.style.fontWeight = 'bold';
      element.style.padding = '0 2px';
      element.style.borderRadius = '2px';
      element.style.border = '1px solid red';
      
      // Add title for better UX
      const href = element.getAttribute('href') || '#';
      element.setAttribute('title', `${href} (Ctrl+Click to open, Click to edit)`);
    });
  }
}