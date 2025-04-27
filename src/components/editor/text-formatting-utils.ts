import { Editor } from '@tiptap/core';

/**
 * Applies font family formatting to selected text
 * Includes special handling for both empty selections and non-empty selections
 */
export function applyFontFamily(editor: Editor, fontFamily: string): boolean {
  if (!editor) return false;
  
  // Store selection state
  const { empty } = editor.state.selection;
  const from = editor.state.selection.from;
  const to = editor.state.selection.to;
  
  // If there's no selection, set mark for next input
  if (empty) {
    console.log('Empty selection: Setting font family for next input');
    editor.chain()
      .focus()
      .setMark('textStyle', { fontFamily })
      .run();
  } else {
    // With selection, use a different approach to ensure marks are applied
    console.log(`Selection from ${from} to ${to}: Applying font family ${fontFamily}`);
    
    // First focus to ensure selection is maintained
    editor.chain().focus();
    
    // Then, directly select the text range again to ensure it's active
    const tr = editor.state.tr.setSelection(
      editor.state.selection
    );
    editor.view.dispatch(tr);
    
    // Now apply the mark to the selection
    editor.chain()
      .setMark('textStyle', { fontFamily })
      .run();
  }
  
  return true;
}

/**
 * Applies font size formatting to selected text
 * Includes special handling for both empty selections and non-empty selections
 */
export function applyFontSize(editor: Editor, fontSize: string): boolean {
  if (!editor) return false;
  
  // Store selection state
  const { empty } = editor.state.selection;
  const from = editor.state.selection.from;
  const to = editor.state.selection.to;
  
  // If there's no selection, set mark for next input
  if (empty) {
    console.log('Empty selection: Setting font size for next input');
    editor.chain()
      .focus()
      .setMark('textStyle', { fontSize })
      .run();
  } else {
    // With selection, use a different approach to ensure marks are applied
    console.log(`Selection from ${from} to ${to}: Applying font size ${fontSize}`);
    
    // First focus to ensure selection is maintained
    editor.chain().focus();
    
    // Then, directly select the text range again to ensure it's active
    const tr = editor.state.tr.setSelection(
      editor.state.selection
    );
    editor.view.dispatch(tr);
    
    // Now apply the mark to the selection
    editor.chain()
      .setMark('textStyle', { fontSize })
      .run();
  }
  
  return true;
}

/**
 * Applies heading formatting to selected text
 * Handles different heading levels properly
 */
export function applyHeading(editor: Editor, level: number | null): boolean {
  if (!editor) return false;
  
  // Store selection state
  const { empty } = editor.state.selection;
  const from = editor.state.selection.from;
  const to = editor.state.selection.to;
  
  console.log(`Selection from ${from} to ${to}: Applying heading level ${level}`);
  
  // Apply heading with proper focus
  if (level === null) {
    // Set to paragraph (normal text)
    editor.chain()
      .focus()
      .setParagraph()
      .run();
  } else {
    // Set to specific heading level
    editor.chain()
      .focus()
      .setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
      .run();
  }
  
  return true;
}

/**
 * Toggles a mark (bold, italic, underline) with explicit selection handling
 * Implements Google Docs style behavior:
 * - If text is selected, applies/removes formatting only to that selection
 * - If no text is selected, toggles "mode" for next typed text
 * - Preserves cursor position and selection after applying formatting
 * - Supports mixed formatting states
 */
export function toggleMark(editor: Editor, markType: 'bold' | 'italic' | 'underline' | 'strike'): boolean {
  if (!editor) return false;
  
  // Store selection state
  const { empty } = editor.state.selection;
  const from = editor.state.selection.from;
  const to = editor.state.selection.to;
  
  // Check if the mark is currently active (either partially or fully)
  const isActive = editor.isActive(markType);
  
  if (empty) {
    // Case 1: No text selected - toggle formatting mode for next typed text
    console.log(`Empty selection: Toggling format mode for next input (${markType})`);
    
    // Tiptap's toggleBold/toggleItalic/etc. automatically handles the toggle state
    // which is exactly the behavior we want for cursor-only state
    if (markType === 'bold') {
      editor.chain().focus().toggleBold().run();
      
      // Add visual cue for active formatting at cursor
      if (!isActive) {
        editor.view.dom.classList.add('cursor-format-bold');
      } else {
        editor.view.dom.classList.remove('cursor-format-bold');
      }
    } else if (markType === 'italic') {
      editor.chain().focus().toggleItalic().run();
      
      // Add visual cue for active formatting at cursor
      if (!isActive) {
        editor.view.dom.classList.add('cursor-format-italic');
      } else {
        editor.view.dom.classList.remove('cursor-format-italic');
      }
    } else if (markType === 'underline') {
      editor.chain().focus().toggleUnderline().run();
      
      // Add visual cue for active formatting at cursor
      if (!isActive) {
        editor.view.dom.classList.add('cursor-format-underline');
      } else {
        editor.view.dom.classList.remove('cursor-format-underline');
      }
    } else if (markType === 'strike') {
      editor.chain().focus().toggleStrike().run();
    }
  } else {
    // Case 2: Text is selected - apply formatting to selection
    console.log(`Selection from ${from} to ${to}: Toggling ${markType}, currently active: ${isActive}`);
    
    // First focus to ensure selection is maintained
    editor.chain().focus();
    
    // Check for mixed formatting state (partially formatted)
    let hasMixedState = false;
    const { state } = editor;
    const { doc, selection } = state;
    
    // Analyze each position in the selection range for the mark presence
    let hasMarked = false;
    let hasUnmarked = false;
    
    doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.isText) {
        // For each text node, check if the mark exists
        const hasMarkApplied = node.marks.some((mark) => mark.type.name === markType);
        
        if (hasMarkApplied) {
          hasMarked = true;
        } else {
          hasUnmarked = true;
        }
      }
      // Continue iteration
      return true;
    });
    
    // If we have both marked and unmarked text, it's a mixed state
    hasMixedState = hasMarked && hasUnmarked;
    
    // Get the corresponding button element
    const formatButton = document.querySelector(`[data-active][aria-label="${markType.charAt(0).toUpperCase() + markType.slice(1)}"]`);
    if (formatButton) {
      // Update the mixed state attribute for visual feedback
      formatButton.setAttribute('data-mixed', hasMixedState ? 'true' : 'false');
    }
    
    // Ensure selection is properly set
    const tr = editor.state.tr.setSelection(
      editor.state.selection
    );
    editor.view.dispatch(tr);
    
    // Apply or remove the mark based on its current state
    // In mixed state: Google Docs behavior removes formatting if ANY part has formatting applied
    if (markType === 'bold') {
      if (hasMixedState || isActive) {
        // If mixed or active state, should unformat the selection
        editor.chain().unsetBold().run();
      } else {
        // Otherwise, apply the formatting
        editor.chain().setBold().run();
      }
    } else if (markType === 'italic') {
      if (hasMixedState || isActive) {
        editor.chain().unsetItalic().run();
      } else {
        editor.chain().setItalic().run();
      }
    } else if (markType === 'underline') {
      if (hasMixedState || isActive) {
        editor.chain().unsetUnderline().run();
      } else {
        editor.chain().setUnderline().run();
      }
    } else if (markType === 'strike') {
      if (hasMixedState || isActive) {
        editor.chain().unsetStrike().run();
      } else {
        editor.chain().setStrike().run();
      }
    }
    
    // Reset the mixed state attribute after applying the changes
    if (formatButton) {
      formatButton.setAttribute('data-mixed', 'false');
    }
  }
  
  return true;
}