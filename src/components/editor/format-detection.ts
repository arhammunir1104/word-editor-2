import { Editor } from '@tiptap/react';

// Default values that will be our ground truth
export const DEFAULT_FONT_SIZE = 11;
export const DEFAULT_FONT_FAMILY = 'Arial';

// Global state for font format tracking that will override detection when set
// This provides a reliable source of truth for the toolbar
export const GLOBAL_FORMAT_STATE = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  bold: false,
  italic: false,
  underline: false,
  textColor: '#000000',  // Default text color
  backgroundColor: '',   // Default background color (empty means none)
  bulletList: false,     // Whether a bullet list is active at current cursor position
  orderedList: false,    // Whether an ordered list is active at current cursor position
  bulletListLevel: 1,    // The nesting level of the current bullet list (1-5)
  orderedListLevel: 1,   // The nesting level of the current ordered list (1-5)
  
  // Add a change notification system to make the state more reactive
  listeners: [] as Array<() => void>,
  
  // Register a listener for state changes
  addListener(callback: () => void) {
    this.listeners.push(callback);
  },
  
  // Remove a listener
  removeListener(callback: () => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  },
  
  // Notify all listeners of state changes
  notifyChange() {
    requestAnimationFrame(() => {
      this.listeners.forEach(listener => listener());
      // Also dispatch a DOM event for components that don't use listeners directly
      document.dispatchEvent(new CustomEvent('format:state:changed', { 
        detail: { 
          bold: this.bold,
          italic: this.italic,
          underline: this.underline,
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
          timestamp: Date.now() 
        }
      }));
    });
  },
  
  // Update font size and persist to localStorage
  setFontSize(size: number) {
    if (this.fontSize === size) return; // Don't update if unchanged
    
    this.fontSize = size;
    try {
      localStorage.setItem('lastAppliedFontSize', size.toString());
      console.log(`GLOBAL_FORMAT_STATE: Font size set to ${size}px and saved to localStorage`);
      this.notifyChange();
    } catch (err) {
      console.error('Error saving font size to localStorage:', err);
    }
  },
  
  // Update font family and persist to localStorage
  setFontFamily(family: string) {
    if (this.fontFamily === family) return; // Don't update if unchanged
    
    this.fontFamily = family;
    try {
      localStorage.setItem('lastAppliedFontFamily', family);
      console.log(`GLOBAL_FORMAT_STATE: Font family set to "${family}" and saved to localStorage`);
      this.notifyChange();
    } catch (err) {
      console.error('Error saving font family to localStorage:', err);
    }
  },
  
  // Update bold state
  setBold(value: boolean) {
    if (this.bold === value) return; // Don't update if unchanged
    
    this.bold = value;
    console.log(`GLOBAL_FORMAT_STATE: Bold set to ${value}`);
    this.notifyChange();
  },
  
  // Update italic state
  setItalic(value: boolean) {
    if (this.italic === value) return; // Don't update if unchanged
    
    this.italic = value;
    console.log(`GLOBAL_FORMAT_STATE: Italic set to ${value}`);
    this.notifyChange();
  },
  
  // Update underline state
  setUnderline(value: boolean) {
    if (this.underline === value) return; // Don't update if unchanged
    
    this.underline = value;
    console.log(`GLOBAL_FORMAT_STATE: Underline set to ${value}`);
    this.notifyChange();
  },
  
  // Update text color state
  setTextColor(color: string) {
    if (this.textColor === color) return; // Don't update if unchanged
    
    this.textColor = color;
    try {
      localStorage.setItem('lastAppliedTextColor', color);
      console.log(`GLOBAL_FORMAT_STATE: Text color set to ${color} and saved to localStorage`);
      this.notifyChange();
    } catch (err) {
      console.error('Error saving text color to localStorage:', err);
    }
  },
  
  // Update background color state
  setBackgroundColor(color: string) {
    if (this.backgroundColor === color) return; // Don't update if unchanged
    
    this.backgroundColor = color;
    try {
      localStorage.setItem('lastAppliedBackgroundColor', color);
      console.log(`GLOBAL_FORMAT_STATE: Background color set to ${color} and saved to localStorage`);
      this.notifyChange();
    } catch (err) {
      console.error('Error saving background color to localStorage:', err);
    }
  },
  
  // Update bullet list state
  setBulletList(value: boolean) {
    if (this.bulletList === value) return; // Don't update if unchanged
    
    this.bulletList = value;
    console.log(`GLOBAL_FORMAT_STATE: Bullet list set to ${value}`);
    this.notifyChange();
  },
  
  // Update ordered list state
  setOrderedList(value: boolean) {
    if (this.orderedList === value) return; // Don't update if unchanged
    
    this.orderedList = value;
    console.log(`GLOBAL_FORMAT_STATE: Ordered list set to ${value}`);
    this.notifyChange();
  },
  
  // Update bullet list nesting level (1-5)
  setBulletListLevel(level: number) {
    // Ensure level is within valid range (1-5)
    level = Math.max(1, Math.min(5, level));
    
    if (this.bulletListLevel === level) return; // Don't update if unchanged
    
    this.bulletListLevel = level;
    console.log(`GLOBAL_FORMAT_STATE: Bullet list level set to ${level}`);
    this.notifyChange();
  },
  
  // Update ordered list nesting level (1-5)
  setOrderedListLevel(level: number) {
    // Ensure level is within valid range (1-5)
    level = Math.max(1, Math.min(5, level));
    
    if (this.orderedListLevel === level) return; // Don't update if unchanged
    
    this.orderedListLevel = level;
    console.log(`GLOBAL_FORMAT_STATE: Ordered list level set to ${level}`);
    this.notifyChange();
  },
  
  // Get font size and colors from localStorage on initial load
  initialize() {
    try {
      const savedSize = localStorage.getItem('lastAppliedFontSize');
      if (savedSize) {
        const size = parseInt(savedSize, 10);
        if (!isNaN(size)) {
          this.fontSize = size;
          console.log(`GLOBAL_FORMAT_STATE: Initialized font size to ${size}px from localStorage`);
        }
      }
      
      const savedFamily = localStorage.getItem('lastAppliedFontFamily');
      if (savedFamily) {
        this.fontFamily = savedFamily;
        console.log(`GLOBAL_FORMAT_STATE: Initialized font family to "${savedFamily}" from localStorage`);
      }
      
      const savedTextColor = localStorage.getItem('lastAppliedTextColor');
      if (savedTextColor) {
        this.textColor = savedTextColor;
        console.log(`GLOBAL_FORMAT_STATE: Initialized text color to ${savedTextColor} from localStorage`);
      }
      
      const savedBgColor = localStorage.getItem('lastAppliedBackgroundColor');
      if (savedBgColor) {
        this.backgroundColor = savedBgColor;
        console.log(`GLOBAL_FORMAT_STATE: Initialized background color to ${savedBgColor} from localStorage`);
      }
    } catch (err) {
      console.error('Error initializing format state from localStorage:', err);
    }
  },
  
  // Update bullet list level (this comment is kept for code readability)
  /* This duplicate method has been removed */
};

// Initialize global state on module load
GLOBAL_FORMAT_STATE.initialize();

// Map heading levels to their respective font sizes
const HEADING_FONT_SIZES = {
  1: 24, // Title
  2: 18, // Subtitle
  3: 16, // Heading 1
  4: 14, // Heading 2
  5: 12  // Heading 3
};

/**
 * Extract a numerical font size from a string (like "14px" -> 14)
 * Prevents returned garbage values by applying validation
 */
function extractFontSize(fontSizeStr: string | null | undefined): number | null {
  if (!fontSizeStr) return null;
  
  const match = fontSizeStr.match(/(\d+(?:\.\d+)?)px/);
  if (!match || !match[1]) return null;
  
  const parsedSize = parseInt(match[1], 10);
  
  // Sanity check to filter out absurd values
  if (isNaN(parsedSize) || parsedSize <= 0 || parsedSize > 400) {
    return null;
  }
  
  return parsedSize;
}

/**
 * Clean up font family string by removing quotes and getting first font
 */
function cleanFontFamily(fontFamily: string | null | undefined): string | null {
  if (!fontFamily) return null;
  
  // Remove quotes and get first font in the family list
  const cleaned = fontFamily.replace(/["']/g, '').split(',')[0].trim();
  
  // Return null if empty or contains only whitespace
  return cleaned && cleaned.length > 0 ? cleaned : null;
}

/**
 * Clean up color values
 */
function normalizeColor(color: string | null | undefined): string | null {
  if (!color) return null;
  
  // Remove whitespace
  const cleaned = color.trim();
  
  // Return null if empty or invalid
  if (!cleaned || cleaned === 'transparent' || cleaned === 'inherit' || cleaned === 'initial') {
    return null;
  }
  
  return cleaned;
}

/**
 * Safely traverses up the DOM tree looking for styling information
 * Helps find the nearest parent with explicit styling
 */
function findStyleInParents(element: Element | null, maxDepth: number = 5): { 
  fontSize: number | null; 
  fontFamily: string | null;
  textColor: string | null;
  backgroundColor: string | null;
} {
  let depth = 0;
  let fontSize: number | null = null;
  let fontFamily: string | null = null;
  let textColor: string | null = null;
  let backgroundColor: string | null = null;
  let current = element;
  
  while (current && depth < maxDepth) {
    // Check inline style attribute first (more reliable)
    const styleAttr = current.getAttribute('style');
    
    if (styleAttr) {
      // Check for font size in style
      if (!fontSize && styleAttr.includes('font-size')) {
        const match = styleAttr.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
        if (match && match[1]) {
          const size = parseInt(match[1], 10);
          if (!isNaN(size) && size > 0 && size < 400) {
            fontSize = size;
          }
        }
      }
      
      // Check for font family in style
      if (!fontFamily && styleAttr.includes('font-family')) {
        const match = styleAttr.match(/font-family:\s*([^;]+)/);
        if (match && match[1]) {
          fontFamily = cleanFontFamily(match[1]);
        }
      }
      
      // Check for text color in style
      if (!textColor && styleAttr.includes('color:')) {
        const match = styleAttr.match(/color:\s*([^;]+)/);
        if (match && match[1]) {
          textColor = normalizeColor(match[1]);
        }
      }
      
      // Check for background color in style
      if (!backgroundColor && (styleAttr.includes('background-color:') || styleAttr.includes('background:'))) {
        let match = styleAttr.match(/background-color:\s*([^;]+)/);
        if (!match) {
          match = styleAttr.match(/background:\s*([^;]+)/);
        }
        if (match && match[1]) {
          backgroundColor = normalizeColor(match[1]);
        }
      }
    }
    
    // If we've found all properties, no need to continue
    if (fontSize !== null && fontFamily !== null && textColor !== null && backgroundColor !== null) {
      break;
    }
    
    // Move up to parent
    current = current.parentElement;
    depth++;
  }
  
  return { fontSize, fontFamily, textColor, backgroundColor };
}

/**
 * Robust font size detection algorithm that crawls DOM and uses multiple methods
 * Returns reliable font size at cursor position, or -1 for mixed values
 */
export const detectFontSize = (editor: Editor | null): number => {
  if (!editor) return DEFAULT_FONT_SIZE;
  
  try {
    console.log('Detecting font size with improved algorithm...');
    
    // METHOD 1: Check TipTap's active nodes and marks directly
    // This is the most reliable method when it works
    
    // Check for textStyle mark with fontSize attribute
    if (editor.isActive('textStyle', { fontSize: /.*/ })) {
      const attrs = editor.getAttributes('textStyle');
      console.log('TipTap attributes found:', attrs);
      
      if (attrs.fontSize) {
        const size = extractFontSize(attrs.fontSize);
        if (size) {
          console.log(`✓ TipTap attributes: fontSize=${size}px`);
          return size;
        }
      }
    }
    
    // Check for headings which have predetermined font sizes
    for (let level = 1; level <= 5; level++) {
      if (editor.isActive('heading', { level })) {
        const size = HEADING_FONT_SIZES[level as keyof typeof HEADING_FONT_SIZES];
        console.log(`✓ Heading ${level} detected: fontSize=${size}px`);
        return size;
      }
    }
    
    // METHOD 2: Check for marks directly at the cursor position
    // This works when method 1 fails due to cursor positioning quirks
    const { from } = editor.state.selection;
    const marks = editor.state.doc.resolve(from).marks();
    
    for (const mark of marks) {
      if (mark.type.name === 'textStyle' && mark.attrs.fontSize) {
        const size = extractFontSize(mark.attrs.fontSize);
        if (size) {
          console.log(`✓ Mark at cursor: fontSize=${size}px`);
          return size; 
        }
      }
    }
    
    // METHOD 3: Analyze the actual DOM node at cursor position
    // This is a reliable fallback using browser's computed styles
    const domAtPos = editor.view.domAtPos(from);
    if (!domAtPos || !domAtPos.node) {
      console.log('No DOM node found at cursor position');
      return DEFAULT_FONT_SIZE;
    }
    
    // Find the actual element (text nodes don't have styling)
    let element: Element | null = null;
    
    if (domAtPos.node.nodeType === Node.TEXT_NODE) {
      element = domAtPos.node.parentElement;
      console.log('Text node found, using parent element:', element);
    } else if (domAtPos.node.nodeType === Node.ELEMENT_NODE) {
      element = domAtPos.node as Element;
      console.log('Element node found directly:', element);
    }
    
    if (!element) {
      console.log('No valid element found at cursor position');
      return DEFAULT_FONT_SIZE;
    }
    
    // First check inline style (highest priority)
    const styleAttr = element.getAttribute('style');
    if (styleAttr && styleAttr.includes('font-size')) {
      const match = styleAttr.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
      if (match && match[1]) {
        const size = parseInt(match[1], 10);
        if (!isNaN(size) && size > 0 && size < 400) {
          console.log(`✓ Inline style: fontSize=${size}px`);
          return size;
        }
      }
    }
    
    // Check data attributes some editors use
    const dataSize = element.getAttribute('data-font-size');
    if (dataSize) {
      const size = parseInt(dataSize, 10);
      if (!isNaN(size) && size > 0 && size < 400) {
        console.log(`✓ Data attribute: fontSize=${size}px`);
        return size;
      }
    }
    
    // If we don't find an explicit style on the current element,
    // search up through parent elements to find styling
    const { fontSize } = findStyleInParents(element);
    if (fontSize !== null) {
      console.log(`✓ Found in parent elements: fontSize=${fontSize}px`);
      return fontSize;
    }
    
    // If we still don't have a font size, use computed style as fallback
    const style = window.getComputedStyle(element);
    const computedSize = extractFontSize(style.fontSize);
    
    if (computedSize) {
      // Check if this is likely a set font size rather than the default
      // We do this by comparing to parents and siblings to detect differences
      
      // Get parent computed style to compare
      if (element.parentElement) {
        const parentStyle = window.getComputedStyle(element.parentElement);
        const parentSize = extractFontSize(parentStyle.fontSize);
        
        // If sizes differ, it's likely this element has a specific size set
        if (parentSize && computedSize !== parentSize) {
          console.log(`✓ Computed style (differs from parent): fontSize=${computedSize}px`);
          return computedSize;
        }
      }
      
      // Look at sibling elements to compare
      const siblings = Array.from(element.parentElement?.children || []);
      for (const sibling of siblings) {
        if (sibling !== element) {
          const siblingStyle = window.getComputedStyle(sibling);
          const siblingSize = extractFontSize(siblingStyle.fontSize);
          
          // If any sibling has a different size, our element's size is likely intentional
          if (siblingSize && computedSize !== siblingSize) {
            console.log(`✓ Computed style (differs from siblings): fontSize=${computedSize}px`);
            return computedSize;
          }
        }
      }
      
      console.log(`✓ Computed style: fontSize=${computedSize}px`);
      return computedSize;
    }
    
    // Default value
    console.log(`! No font size found, using default: ${DEFAULT_FONT_SIZE}px`);
    return DEFAULT_FONT_SIZE;
  } catch (error) {
    console.error('Error detecting font size:', error);
    return DEFAULT_FONT_SIZE;
  }
};

/**
 * Robust font family detection algorithm that crawls DOM and uses multiple methods
 * Returns reliable font family at cursor position, or empty string for mixed values
 */
export const detectFontFamily = (editor: Editor | null): string => {
  if (!editor) return DEFAULT_FONT_FAMILY;
  
  try {
    console.log('Detecting font family with improved algorithm...');
    
    // METHOD 1: Check TipTap's active nodes and marks directly
    // This is the most reliable method when it works
    
    // Check for textStyle mark with fontFamily attribute
    if (editor.isActive('textStyle', { fontFamily: /.*/ })) {
      const attrs = editor.getAttributes('textStyle');
      console.log('TipTap attributes found:', attrs);
      
      if (attrs.fontFamily) {
        const family = cleanFontFamily(attrs.fontFamily);
        if (family) {
          console.log(`✓ TipTap attributes: fontFamily="${family}"`);
          return family;
        }
      }
    }
    
    // METHOD 2: Check for marks directly at the cursor position
    // This works when method 1 fails due to cursor positioning quirks
    const { from } = editor.state.selection;
    const marks = editor.state.doc.resolve(from).marks();
    
    for (const mark of marks) {
      if (mark.type.name === 'textStyle' && mark.attrs.fontFamily) {
        const family = cleanFontFamily(mark.attrs.fontFamily);
        if (family) {
          console.log(`✓ Mark at cursor: fontFamily="${family}"`);
          return family; 
        }
      }
    }
    
    // METHOD 3: Analyze the actual DOM node at cursor position
    // This is a reliable fallback using browser's computed styles
    const domAtPos = editor.view.domAtPos(from);
    if (!domAtPos || !domAtPos.node) {
      console.log('No DOM node found at cursor position');
      return DEFAULT_FONT_FAMILY;
    }
    
    // Find the actual element (text nodes don't have styling)
    let element: Element | null = null;
    
    if (domAtPos.node.nodeType === Node.TEXT_NODE) {
      element = domAtPos.node.parentElement;
      console.log('Text node found, using parent element:', element);
    } else if (domAtPos.node.nodeType === Node.ELEMENT_NODE) {
      element = domAtPos.node as Element;
      console.log('Element node found directly:', element);
    }
    
    if (!element) {
      console.log('No valid element found at cursor position');
      return DEFAULT_FONT_FAMILY;
    }
    
    // First check inline style (highest priority)
    const styleAttr = element.getAttribute('style');
    if (styleAttr && styleAttr.includes('font-family')) {
      const match = styleAttr.match(/font-family:\s*([^;]+)/);
      if (match && match[1]) {
        const family = cleanFontFamily(match[1]);
        if (family) {
          console.log(`✓ Inline style: fontFamily="${family}"`);
          return family;
        }
      }
    }
    
    // Check data attributes some editors use
    const dataFamily = element.getAttribute('data-font-family');
    if (dataFamily) {
      const family = cleanFontFamily(dataFamily);
      if (family) {
        console.log(`✓ Data attribute: fontFamily="${family}"`);
        return family;
      }
    }
    
    // If we don't find an explicit style on the current element,
    // search up through parent elements to find styling
    const { fontFamily } = findStyleInParents(element);
    if (fontFamily) {
      console.log(`✓ Found in parent elements: fontFamily="${fontFamily}"`);
      return fontFamily;
    }
    
    // If we still don't have a font family, use computed style as fallback
    const style = window.getComputedStyle(element);
    const computedFamily = cleanFontFamily(style.fontFamily);
    
    if (computedFamily) {
      console.log(`✓ Computed style: fontFamily="${computedFamily}"`);
      return computedFamily;
    }
    
    // Default value
    console.log(`! No font family found, using default: "${DEFAULT_FONT_FAMILY}"`);
    return DEFAULT_FONT_FAMILY;
  } catch (error) {
    console.error('Error detecting font family:', error);
    return DEFAULT_FONT_FAMILY;
  }
};

/**
 * Detect the text color at the current cursor position
 * Uses multiple methods for reliable detection
 */
export const detectTextColor = (editor: Editor | null): string => {
  if (!editor) return '#000000'; // Default black
  
  try {
    console.log('Detecting text color...');
    
    // METHOD 1: Check TipTap's active nodes and marks directly
    // This is the most reliable method when it works
    if (editor.isActive('textStyle', { color: /.*/ })) {
      const attrs = editor.getAttributes('textStyle');
      console.log('Text color TipTap attributes found:', attrs);
      
      if (attrs.color) {
        const color = normalizeColor(attrs.color);
        if (color) {
          console.log(`✓ TipTap attributes: textColor="${color}"`);
          return color;
        }
      }
    }
    
    // METHOD 2: Check for marks directly at the cursor position
    const { from } = editor.state.selection;
    const marks = editor.state.doc.resolve(from).marks();
    
    for (const mark of marks) {
      if (mark.type.name === 'textStyle' && mark.attrs.color) {
        const color = normalizeColor(mark.attrs.color);
        if (color) {
          console.log(`✓ Mark at cursor: textColor="${color}"`);
          return color; 
        }
      }
    }
    
    // METHOD 3: Analyze the actual DOM node at cursor position
    const domAtPos = editor.view.domAtPos(from);
    if (!domAtPos || !domAtPos.node) {
      console.log('No DOM node found at cursor position');
      return '#000000';
    }
    
    // Find the actual element (text nodes don't have styling)
    let element: Element | null = null;
    
    if (domAtPos.node.nodeType === Node.TEXT_NODE) {
      element = domAtPos.node.parentElement;
    } else if (domAtPos.node.nodeType === Node.ELEMENT_NODE) {
      element = domAtPos.node as Element;
    }
    
    if (!element) {
      console.log('No valid element found at cursor position');
      return '#000000';
    }
    
    // First check inline style (highest priority)
    const styleAttr = element.getAttribute('style');
    if (styleAttr && styleAttr.includes('color:')) {
      const match = styleAttr.match(/color:\s*([^;]+)/);
      if (match && match[1]) {
        const color = normalizeColor(match[1]);
        if (color) {
          console.log(`✓ Inline style: textColor="${color}"`);
          return color;
        }
      }
    }
    
    // If we don't find an explicit style on the current element,
    // search up through parent elements to find styling
    const { textColor } = findStyleInParents(element);
    if (textColor) {
      console.log(`✓ Found in parent elements: textColor="${textColor}"`);
      return textColor;
    }
    
    // If we still don't have a text color, use computed style as fallback
    const style = window.getComputedStyle(element);
    const computedColor = normalizeColor(style.color);
    
    if (computedColor) {
      console.log(`✓ Computed style: textColor="${computedColor}"`);
      return computedColor;
    }
    
    // Default value
    console.log(`! No text color found, using default: "#000000"`);
    return '#000000';
  } catch (error) {
    console.error('Error detecting text color:', error);
    return '#000000';
  }
};

/**
 * Detect the background color at the current cursor position
 * Uses multiple methods for reliable detection
 */
export const detectBackgroundColor = (editor: Editor | null): string => {
  if (!editor) return ''; // Default empty (no highlight)
  
  try {
    console.log('Detecting background color...');
    
    // METHOD 1: Check TipTap's active nodes for highlight
    if (editor.isActive('highlight')) {
      const attrs = editor.getAttributes('highlight');
      console.log('Background color TipTap attributes found:', attrs);
      
      if (attrs.color) {
        const color = normalizeColor(attrs.color);
        if (color) {
          console.log(`✓ TipTap attributes: backgroundColor="${color}"`);
          return color;
        }
      }
    }
    
    // METHOD 2: Check for marks directly at the cursor position
    const { from } = editor.state.selection;
    const marks = editor.state.doc.resolve(from).marks();
    
    for (const mark of marks) {
      if (mark.type.name === 'highlight' && mark.attrs.color) {
        const color = normalizeColor(mark.attrs.color);
        if (color) {
          console.log(`✓ Mark at cursor: backgroundColor="${color}"`);
          return color; 
        }
      }
    }
    
    // METHOD 3: Analyze the actual DOM node at cursor position
    const domAtPos = editor.view.domAtPos(from);
    if (!domAtPos || !domAtPos.node) {
      console.log('No DOM node found at cursor position');
      return '';
    }
    
    // Find the actual element (text nodes don't have styling)
    let element: Element | null = null;
    
    if (domAtPos.node.nodeType === Node.TEXT_NODE) {
      element = domAtPos.node.parentElement;
    } else if (domAtPos.node.nodeType === Node.ELEMENT_NODE) {
      element = domAtPos.node as Element;
    }
    
    if (!element) {
      console.log('No valid element found at cursor position');
      return '';
    }
    
    // First check inline style (highest priority)
    const styleAttr = element.getAttribute('style');
    if (styleAttr && (styleAttr.includes('background-color:') || styleAttr.includes('background:'))) {
      let match = styleAttr.match(/background-color:\s*([^;]+)/);
      if (!match) {
        match = styleAttr.match(/background:\s*([^;]+)/);
      }
      if (match && match[1]) {
        const color = normalizeColor(match[1]);
        if (color) {
          console.log(`✓ Inline style: backgroundColor="${color}"`);
          return color;
        }
      }
    }
    
    // Check data attributes 
    const dataBgColor = element.getAttribute('data-background-color');
    if (dataBgColor) {
      const color = normalizeColor(dataBgColor);
      if (color) {
        console.log(`✓ Data attribute: backgroundColor="${color}"`);
        return color;
      }
    }
    
    // If we don't find an explicit style on the current element,
    // search up through parent elements to find styling
    const { backgroundColor } = findStyleInParents(element);
    if (backgroundColor) {
      console.log(`✓ Found in parent elements: backgroundColor="${backgroundColor}"`);
      return backgroundColor;
    }
    
    // If we still don't have a background color, use computed style as fallback
    const style = window.getComputedStyle(element);
    const computedColor = normalizeColor(style.backgroundColor);
    
    // Only return computed background if it's not transparent or the default
    if (computedColor && 
        computedColor !== 'transparent' && 
        computedColor !== 'rgba(0, 0, 0, 0)' &&
        computedColor !== 'rgb(255, 255, 255)') {
      console.log(`✓ Computed style: backgroundColor="${computedColor}"`);
      return computedColor;
    }
    
    // Default value (no background color)
    console.log(`! No background color found, using default (none)`);
    return '';
  } catch (error) {
    console.error('Error detecting background color:', error);
    return '';
  }
};

/**
 * Detect if cursor is in a bullet list and get its nesting level
 * Returns an object with active state and nesting level
 */
export const detectBulletList = (editor: Editor | null): { active: boolean, level: number } => {
  if (!editor) return { active: false, level: 1 };
  
  try {
    console.log('Detecting bullet list state...');
    
    // Check if bullet list is active using TipTap's API
    const isBulletListActive = editor.isActive('bulletList');
    
    // If not in a bullet list, return inactive state
    if (!isBulletListActive) {
      return { active: false, level: 1 };
    }
    
    // Try to determine bullet list nesting level
    let nestingLevel = 1;
    
    // METHOD 1: Check for data-level attribute on the list element
    const { from } = editor.state.selection;
    const domAtPos = editor.view.domAtPos(from);
    
    if (domAtPos && domAtPos.node) {
      // Find the list element by traversing up from the current node
      let currentNode: Node | null = domAtPos.node;
      let element: Element | null = null;
      
      // Navigate up to find the list element
      while (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentNode;
      }
      
      // Starting from the current element, search for the bullet list
      if (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
        element = currentNode as Element;
        
        // Look for either the list item or the list itself
        while (element && 
              !element.classList.contains('custom-bullet-list') && 
              element.tagName !== 'UL') {
          element = element.parentElement;
        }
        
        // If we found a list element, check its data-level attribute
        if (element) {
          const levelAttr = element.getAttribute('data-level');
          if (levelAttr) {
            nestingLevel = parseInt(levelAttr, 10) || 1;
            console.log(`✓ Found bullet list with nesting level ${nestingLevel} from data-level attribute`);
          }
          
          // If no data-level, try to count parent lists to determine nesting
          else {
            let tempElement = element;
            let tempLevel = 1;
            
            while (tempElement.parentElement) {
              tempElement = tempElement.parentElement;
              
              if (tempElement.tagName === 'UL' || tempElement.classList.contains('custom-bullet-list')) {
                tempLevel++;
              }
            }
            
            if (tempLevel > 1) {
              nestingLevel = ((tempLevel - 1) % 5) + 1; // Cycle between 1-5
              console.log(`✓ Calculated bullet list nesting level ${nestingLevel} by counting parent lists`);
            }
          }
        }
      }
    }
    
    return { active: true, level: nestingLevel };
  } catch (error) {
    console.error('Error detecting bullet list state:', error);
    return { active: false, level: 1 };
  }
};

/**
 * Detect if cursor is in an ordered list and get its nesting level
 * Returns an object with active state and nesting level
 */
export const detectOrderedList = (editor: Editor | null): { active: boolean, level: number } => {
  if (!editor) return { active: false, level: 1 };
  
  try {
    // Check directly if ordered list node is active at cursor position
    const isOrderedListActive = editor.isActive('orderedList');
    
    // If not active, no need to calculate level
    if (!isOrderedListActive) {
      return { active: false, level: 1 };
    }
    
    // Now calculate nesting level
    const { from } = editor.state.selection;
    let level = 0;
    let node = editor.state.doc.resolve(from);
    
    // Traverse up the node hierarchy to count ordered list ancestors
    for (let depth = node.depth; depth > 0; depth--) {
      if (node.node(depth).type.name === 'orderedList') {
        level++;
      }
    }
    
    // Ensure a minimum level of 1 if active
    level = Math.max(1, level);
    
    return { active: true, level };
  } catch (error) {
    console.error('Error detecting ordered list:', error);
    return { active: false, level: 1 };
  }
};