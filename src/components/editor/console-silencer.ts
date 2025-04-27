/**
 * Global configuration for scanner behaviors
 * Used to control noisy console logs and heavy processing
 */
export const GLOBAL_SCANNER_CONFIG = {
  disableLinkScanners: true, // Set to true to disable link scanner console spam
};

/**
 * Capture original console.log
 */
const originalLog = console.log;

/**
 * Replace console.log with filtered version
 * This helps reduce console spam by filtering out noisy messages
 */
console.log = function(...args: any[]) {
  // Skip link scanner messages
  if (GLOBAL_SCANNER_CONFIG.disableLinkScanners) {
    const firstArg = args[0]?.toString() || '';
    if (
      firstArg.includes('link scanner') || 
      firstArg.includes('Link scanner') ||
      firstArg.includes('Scanning links') ||
      firstArg.includes('scanning links')
    ) {
      return; // Don't log these messages
    }
  }
  
  // Pass through all other logs to the original console.log
  originalLog(...args);
};