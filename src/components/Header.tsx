// src/components/Header.tsx

import { createSignal, createResource, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { parseAndFormatTags } from "../lib/tagFormatter";
import type { NoteWithTags } from "../types";

interface HeaderProps {
  onNotesChange: (notes: NoteWithTags[]) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onNewNoteEdit: (noteId: number) => void;
}

export function Header(props: HeaderProps) {
  const [showLogoMenu, setShowLogoMenu] = createSignal(false);
  
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
    console.log("Export functionality will be implemented later");
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
            <img src="/lychee.svg" alt="Lychee" class="logo" />
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
            <button onClick={clearSearch} class="clear-search-btn">
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
}