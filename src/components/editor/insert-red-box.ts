import { Editor } from '@tiptap/react';

// Function to insert a red box at the current cursor position
export const insertRedBox = (editor: Editor | null): boolean => {
  if (!editor) return false;
  
  console.log("Attempting to insert red box...");
  
  try {
    // Primary strategy: Use the UltimateRedBox node
    editor.chain()
      .focus()
      .insertContent({ type: 'ultimateRedBox' })
      .run();
    
    console.log("Red box inserted successfully using UltimateRedBox node!");
    
    // Record history step if we have a history manager
    if (window.historyManager) {
      window.historyManager.addHistoryStep('insert-red-box');
    }
    
    return true;
  } catch (error) {
    console.error("Failed to insert UltimateRedBox node:", error);
    
    // Second attempt: Try SimpleRedBox node
    try {
      editor.chain()
        .focus()
        .insertContent({ type: 'simpleRedBox' })
        .run();
      
      console.log("Red box inserted successfully using SimpleRedBox!");
      
      // Record history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('insert-red-box');
      }
      
      return true;
    } catch (err) {
      console.error("Failed to insert SimpleRedBox:", err);
      
      // Direct HTML method as last resort
      try {
        // Use TipTap's insertContent API with raw HTML
        editor.commands.insertContent(`
          <div 
            style="width: 100px; height: 100px; background-color: red; margin: 10px 0; border: 2px solid darkred; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" 
            contenteditable="false"
            class="red-box-element"
          ></div>
        `);
        
        console.log("Red box inserted using direct HTML method!");
        
        // Focus editor after insertion
        setTimeout(() => {
          editor.commands.focus('end');
        }, 50);
        
        // Record history step
        if (window.historyManager) {
          window.historyManager.addHistoryStep('insert-red-box');
        }
        
        return true;
      } catch (finalError) {
        console.error("All red box insertion methods failed:", finalError);
        
        // Absolute last resort - red square emoji
        try {
          const transaction = editor.state.tr.insertText("🟥"); // Red square emoji as fallback
          editor.view.dispatch(transaction);
          return true;
        } catch (e) {
          console.error("Even emoji fallback failed:", e);
          return false;
        }
      }
    }
  }
};

export default insertRedBox;