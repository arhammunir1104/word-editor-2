// /**
//  * NUCLEAR SEARCH BAR COMPONENT
//  *
//  * This is the ultimate search bar implementation that uses the nuclear search
//  * option. It's designed to work reliably in all cases by directly searching the HTML.
//  */
// import React, { useState, useEffect, useRef } from "react";
// import { Editor } from "@tiptap/core";
// import { useSearchReplaceStore } from "../../lib/search-replace-store";
// import { NuclearSearcher, createNuclearSearcher } from "./nuclear-search";
// import {
//   ChevronUp,
//   ChevronDown,
//   X,
//   Search,
//   Check,
//   Keyboard,
// } from "lucide-react";
// import { HistoryManager } from "./history-manager";
// import "./search-styles.css";

// interface NuclearSearchBarProps {
//   editor: Editor | null;
//   historyManager?: HistoryManager | null;
// }

// export default function NuclearSearchBar({
//   editor,
//   historyManager,
// }: NuclearSearchBarProps) {
//   const { isVisible, toggleVisibility } = useSearchReplaceStore();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [replaceTerm, setReplaceTerm] = useState("");
//   const [showReplace, setShowReplace] = useState(false);
//   const [matchCase, setMatchCase] = useState(false);
//   const [matchCount, setMatchCount] = useState(0);
//   const [currentMatch, setCurrentMatch] = useState(0);
//   const searchInputRef = useRef<HTMLInputElement>(null);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const searcherRef = useRef<NuclearSearcher | null>(null);

//   // Initialize the nuclear searcher when the editor is ready
//   useEffect(() => {
//     if (editor) {
//       searcherRef.current = createNuclearSearcher(editor);
//       console.log("🧨 NUCLEAR SEARCH INITIALIZED - This WILL find everything");
//     }

//     return () => {
//       if (searcherRef.current) {
//         searcherRef.current.clearHighlights();
//       }
//     };
//   }, [editor]);

//   // Auto-focus search input when search bar becomes visible
//   useEffect(() => {
//     if (isVisible && searchInputRef.current) {
//       setTimeout(() => {
//         if (searchInputRef.current) {
//           searchInputRef.current.focus();
//           searchInputRef.current.select();
//         }
//       }, 50);
//     }
//   }, [isVisible]);

//   // Perform search when search term changes
//   useEffect(() => {
//     if (!editor || !isVisible) return;

//     const searchDelay = setTimeout(() => {
//       console.log(`🧨 NUCLEAR SEARCH: Searching for "${searchTerm}"`);

//       if (!searcherRef.current) {
//         console.warn("Nuclear search reference not initialized yet");
//         return;
//       }

//       if (searchTerm.trim()) {
//         try {
//           const result = searcherRef.current.search({
//             term: searchTerm,
//             matchCase,
//           });

//           console.log("Nuclear search result:", result);
//           setMatchCount(result.matchCount);
//           setCurrentMatch(
//             result.currentIndex >= 0 ? result.currentIndex + 1 : 0,
//           );
//         } catch (error) {
//           console.error("Error during nuclear search:", error);
//           setMatchCount(0);
//           setCurrentMatch(0);
//         }
//       } else {
//         // Clear search if search term is empty
//         if (searcherRef.current) {
//           searcherRef.current.clearHighlights();
//         }
//         setMatchCount(0);
//         setCurrentMatch(0);
//       }
//     }, 100);

//     return () => clearTimeout(searchDelay);
//   }, [editor, searchTerm, matchCase, isVisible]);

//   // Handle keyboard shortcuts
//   useEffect(() => {
//     if (!isVisible) return;

//     const handleKeyDown = (e: KeyboardEvent) => {
//       // Enter to go to next match
//       if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
//         e.preventDefault();
//         handleNextMatch();
//         return;
//       }

//       // Shift+Enter to go to previous match
//       if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
//         e.preventDefault();
//         handlePreviousMatch();
//         return;
//       }

//       // Ctrl+Enter or Cmd+Enter to replace all
//       if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && showReplace) {
//         e.preventDefault();
//         handleReplaceAll();
//         return;
//       }

//       // Escape to close search
//       if (e.key === "Escape") {
//         e.preventDefault();
//         handleClose();
//         return;
//       }
//     };

//     document.addEventListener("keydown", handleKeyDown);

//     return () => {
//       document.removeEventListener("keydown", handleKeyDown);
//     };
//   }, [isVisible, showReplace]);

//   // Handle next match click
//   const handleNextMatch = () => {
//     if (!searcherRef.current || !searchTerm.trim()) return;

//     try {
//       const result = searcherRef.current.nextMatch();
//       setCurrentMatch(result.currentIndex >= 0 ? result.currentIndex + 1 : 0);
//       setMatchCount(result.matchCount);
//     } catch (error) {
//       console.error("Error navigating to next match:", error);
//     }
//   };

//   // Handle previous match click
//   const handlePreviousMatch = () => {
//     if (!searcherRef.current || !searchTerm.trim()) return;

//     try {
//       const result = searcherRef.current.previousMatch();
//       setCurrentMatch(result.currentIndex >= 0 ? result.currentIndex + 1 : 0);
//       setMatchCount(result.matchCount);
//     } catch (error) {
//       console.error("Error navigating to previous match:", error);
//     }
//   };

//   // Handle replace current match
//   const handleReplace = () => {
//     if (!searcherRef.current || !searchTerm.trim()) return;

//     try {
//       const replaced = searcherRef.current.replaceCurrentMatch(replaceTerm);

//       if (replaced) {
//         const state = searcherRef.current.getSearchState();
//         setMatchCount(state.matchCount);
//         setCurrentMatch(state.currentIndex >= 0 ? state.currentIndex + 1 : 0);

//         // Record history if available
//         if (historyManager) {
//           historyManager.addHistoryStep("replace");
//         }
//       }
//     } catch (error) {
//       console.error("Error replacing match:", error);
//     }
//   };

//   // Handle replace all matches
//   const handleReplaceAll = () => {
//     if (!searcherRef.current || !searchTerm.trim()) return;

//     try {
//       const replacedCount = searcherRef.current.replaceAllMatches(replaceTerm);
//       console.log(`Replaced ${replacedCount} occurrences`);

//       if (replacedCount > 0) {
//         setMatchCount(0);
//         setCurrentMatch(0);

//         // Record history if available
//         if (historyManager) {
//           historyManager.addHistoryStep("replace-all");
//         }
//       }
//     } catch (error) {
//       console.error("Error replacing all matches:", error);
//     }
//   };

//   // Handle close button click
//   const handleClose = () => {
//     if (searcherRef.current) {
//       searcherRef.current.clearHighlights();
//     }
//     toggleVisibility();
//   };

//   if (!isVisible) return null;

//   return (
//     <div
//       ref={containerRef}
//       className="search-replace-container search-animation"
//     >
//       <div className="search-section">
//         <div className="flex items-center">
//           <Search size={16} className="search-icon" />
//           <input
//             ref={searchInputRef}
//             type="text"
//             placeholder="Nuclear Search - Find in document"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="search-input"
//             data-testid="search-input"
//           />

//           {searchTerm.trim() && (
//             <span className="match-counter" title="Current match">
//               {matchCount > 0
//                 ? `${currentMatch} of ${matchCount}`
//                 : "No matches"}
//             </span>
//           )}

//           <div className="flex gap-1">
//             <button
//               onClick={handlePreviousMatch}
//               disabled={matchCount === 0}
//               className="search-nav-button"
//               title="Previous match (Shift+Enter)"
//               aria-label="Previous match"
//             >
//               <ChevronUp size={18} />
//             </button>

//             <button
//               onClick={handleNextMatch}
//               disabled={matchCount === 0}
//               className="search-nav-button"
//               title="Next match (Enter)"
//               aria-label="Next match"
//             >
//               <ChevronDown size={18} />
//             </button>
//           </div>

//           <div className="search-options">
//             <button
//               onClick={() => setMatchCase(!matchCase)}
//               className={`option-button ${matchCase ? "option-active" : ""}`}
//               title="Match case"
//               aria-label="Match case"
//               aria-pressed={matchCase}
//             >
//               Aa
//             </button>

//             <button
//               onClick={() => setShowReplace(!showReplace)}
//               className={`option-button ${showReplace ? "option-active" : ""}`}
//               title="Show replace options"
//               aria-label="Show replace options"
//               aria-pressed={showReplace}
//             >
//               <Check size={16} />
//             </button>
//           </div>

//           <button
//             onClick={handleClose}
//             className="close-button"
//             title="Close (Esc)"
//             aria-label="Close search"
//           >
//             <X size={18} />
//           </button>
//         </div>
//       </div>

//       {showReplace && (
//         <div className="replace-section">
//           <div className="flex items-center">
//             <span className="replace-label">Replace</span>
//             <input
//               type="text"
//               placeholder="Replace with"
//               value={replaceTerm}
//               onChange={(e) => setReplaceTerm(e.target.value)}
//               className="replace-input"
//               data-testid="replace-input"
//             />

//             <div className="flex gap-1">
//               <button
//                 onClick={handleReplace}
//                 disabled={matchCount === 0}
//                 className="replace-button"
//                 title="Replace current match"
//                 aria-label="Replace"
//               >
//                 Replace
//               </button>

//               <button
//                 onClick={handleReplaceAll}
//                 disabled={matchCount === 0}
//                 className="replace-all-button"
//                 title="Replace all matches (Ctrl+Enter)"
//                 aria-label="Replace all"
//               >
//                 Replace all
//               </button>
//             </div>
//           </div>

//           <div className="shortcut-hint">
//             <Keyboard size={14} className="mr-1" />
//             <span>
//               Pro tip: Use Ctrl+F to search, Ctrl+H for replace, Ctrl+Enter to
//               replace all
//             </span>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
