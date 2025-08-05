// src/App.tsx

import { createSignal, createEffect } from "solid-js";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ViewPane } from "./components/ViewPane";
import { themeManager } from "./lib/theme";
import { invoke } from "@tauri-apps/api/core";
import type { NoteWithTags } from "./types";
import "./styles/style.css";

function App() {
  const [notes, setNotes] = createSignal<NoteWithTags[]>([]);
  const [selectedNoteId, setSelectedNoteId] = createSignal<number | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [viewMode, setViewMode] = createSignal<'search' | 'note' | 'edit'>('search');

  const refreshNotes = async () => {
    try {
      const allNotes = await invoke<NoteWithTags[]>("get_all_notes");
      setNotes(allNotes);
    } catch (error) {
      console.error("Failed to refresh notes:", error);
    }
  };

  const handleNotesChange = (newNotes: NoteWithTags[]) => {
    setNotes(newNotes);
  };

  const handleNewNoteEdit = (noteId: number) => {
    setSelectedNoteId(noteId);
    setViewMode('edit');
  };

  // Initialize theme manager and load notes
  createEffect(() => {
    // Ensure theme manager is initialized
    console.log("Initializing theme manager...");
    themeManager.applyTheme(themeManager.getCurrentTheme());
    
    // Load notes
    refreshNotes();
  });

  return (
    <div class="app-container">
      <Header
        onNotesChange={handleNotesChange}
        searchQuery={searchQuery()}
        onSearchQueryChange={setSearchQuery}
        selectedTags={selectedTags()}
        onSelectedTagsChange={setSelectedTags}
        onNewNoteEdit={handleNewNoteEdit}
      />
      
      <div class="app-main">
        <Sidebar
          selectedTags={selectedTags()}
          onSelectedTagsChange={setSelectedTags}
          notes={notes()}
        />
        
        <ViewPane
          notes={notes()}
          selectedNoteId={selectedNoteId()}
          onSelectedNoteIdChange={setSelectedNoteId}
          searchQuery={searchQuery()}
          selectedTags={selectedTags()}
          onNotesChange={refreshNotes}
          viewMode={viewMode()}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  );
}

export default App;