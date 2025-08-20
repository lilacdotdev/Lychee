/**
 * Application header component
 * Contains logo menu, search functionality, and tag management
 */

import { createSignal, createResource, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { parseAndFormatTags } from "../lib/tagFormatter";
import { Icon } from "./Icon";
import type { NoteWithTags } from "../types";

interface HeaderProps {
  onNotesChange: (notes: NoteWithTags[]) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onNewNoteEdit: (noteId: number) => void;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
}

export function Header(props: HeaderProps) {
  const [showLogoMenu, setShowLogoMenu] = createSignal(true);
  
  const handleTagAdd = (tag: string) => {
    const currentTags = props.selectedTags;
    if (!currentTags.includes(tag)) {
      props.onSelectedTagsChange([...currentTags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    props.onSelectedTagsChange(props.selectedTags.filter(t => t !== tag));
  };

  const handleSearchInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    props.onSearchQueryChange(target.value);
  };

  const clearSearch = () => {
    props.onSearchQueryChange("");
    props.onSelectedTagsChange([]);
  };

  const handleCreateNote = async () => {
    try {
      const request = {
        content: "# Note Title\n\nStart writing your note here...",
        tags: []
      };
      
      const newNoteId = await invoke<number>("create_note", { request });
      
      // Fetch updated notes
      const notes = await invoke<NoteWithTags[]>("get_all_notes");
      props.onNotesChange(notes);
      
      // Open the new note in edit mode
      props.onNewNoteEdit(newNoteId);
      
      setShowLogoMenu(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleExport = () => {
    if (props.onOpenExport) props.onOpenExport();
    setShowLogoMenu(false);
  };

  return (
    <header class="app-header">
      <div class="header-left">
        <div class="logo-container">
          <button 
            class="logo-button"
            onClick={() => setShowLogoMenu(!showLogoMenu())}
          >
                         <svg 
               width="32" 
               height="32" 
               viewBox="0 0 2000 2000" 
               version="1.1" 
               xmlns="http://www.w3.org/2000/svg" 
               xmlns:xlink="http://www.w3.org/1999/xlink" 
               xml:space="preserve" 
               xmlns:serif="http://www.serif.com/" 
               style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"
               class="logo"
             >
              <rect id="Iteration-1---Minimalist" serif:id="Iteration 1 - Minimalist" x="0" y="0" width="2000" height="2000" style="fill:none;"/>
              <g id="Iteration-1---Minimalist1" serif:id="Iteration 1 - Minimalist">
                <g id="Layer2">
                  <g transform="matrix(1.04569,0,0,1.04569,-90.7157,-56.1025)">
                    <circle cx="1043.06" cy="1009.96" r="932.397" style="fill:var(--color-primary);"/>
                  </g>
                  <g transform="matrix(1.03284,0,0,1.04957,-59.5841,72.5698)">
                    <g transform="matrix(0.947125,0,0,0.947125,-18.4039,-44.2113)">
                      <path d="M910.927,1660.11C545.584,1649.86 252.135,1350.05 252.135,982.252C252.135,768.567 351.185,577.833 505.836,453.499L1061.88,1615.32L1538.38,274.229C1784.2,397.584 1953.07,652.001 1953.07,945.55C1953.07,1359.83 1616.73,1696.17 1202.45,1696.17C1201.64,1696.17 1200.83,1696.16 1200.02,1696.16C1190.7,1767.59 1129.55,1822.83 1055.59,1822.83C975.204,1822.83 909.937,1757.56 909.937,1677.17C909.937,1671.4 910.273,1665.71 910.927,1660.11Z" style="fill:none;stroke:white;stroke-width:77.38px;"/>
                    </g>
                    <g transform="matrix(1,0,0,1,-106.704,101.658)">
                      <path d="M667.211,492.22C779.135,303.591 984.863,177.037 1219.92,177.037C1320.33,177.037 1415.38,200.13 1500.06,241.291L1094.04,1384.04L667.211,492.22Z" style="fill:none;stroke:white;stroke-width:73.29px;"/>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </button>
          
          <div class={`logo-drawer ${showLogoMenu() ? 'open' : ''}`}>
            <button onClick={handleCreateNote} class="drawer-button">
              Add Note
            </button>
            <button onClick={handleExport} class="drawer-button">
              Export
            </button>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="search-container">
          <input
            type="text"
            placeholder="Search notes..."
            value={props.searchQuery}
            onInput={handleSearchInput}
            class="search-input"
          />
          {(props.searchQuery || props.selectedTags.length > 0) && (
            <button onClick={clearSearch} class="clear-search-btn" title="Clear search">
              <Icon name="x" size={16} class="clickable" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}