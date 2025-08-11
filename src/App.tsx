// src/App.tsx

import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ViewPane } from "./components/ViewPane";
import { SpotlightSearch } from "./components/SpotlightSearch";
import { SettingsModal } from "./components/SettingsModal";
import { PluginModal } from "./components/PluginModal";
import { ExportModal } from "./components/ExportModal";
import { themeManager } from "./lib/theme";
import { keyBindingManager } from "./lib/keybindings";
import { invoke } from "@tauri-apps/api/core";
import type { NoteWithTags } from "./types";
import "./styles/style.css";

function App() {
  const [notes, setNotes] = createSignal<NoteWithTags[]>([]);
  const [selectedNoteId, setSelectedNoteId] = createSignal<number | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [viewMode, setViewMode] = createSignal<'search' | 'note' | 'edit'>('search');
  
  // Modal states
  const [isSpotlightOpen, setIsSpotlightOpen] = createSignal(false);
  const [spotlightMode, setSpotlightMode] = createSignal<'text' | 'tag'>('text');
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isPluginOpen, setIsPluginOpen] = createSignal(false);
  const [isExportOpen, setIsExportOpen] = createSignal(false);

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

  const handleSpotlightSearch = (query: string) => {
    setSearchQuery(query);
    setViewMode('search');
  };

  const handleTagAdd = (tag: string) => {
    const current = selectedTags();
    if (!current.includes(tag)) {
      setSelectedTags([...current, tag]);
    }
    setViewMode('search');
  };

  // Initialize theme manager and load notes
  createEffect(() => {
    // Ensure theme manager is initialized
    themeManager.applyTheme(themeManager.getCurrentTheme());
    
    // Load notes
    refreshNotes();
  });

  // Set up keybinding handlers
  onMount(() => {
    // Create note
    keyBindingManager.on('CREATE_NOTE', async () => {
      try {
        const request = {
          content: "# Note Title\n\nStart writing your note here...",
          tags: []
        };
        
        const newNoteId = await invoke<number>("create_note", { request });
        await refreshNotes();
        handleNewNoteEdit(newNoteId);
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    });

    // Return to view mode
    keyBindingManager.on('RETURN_TO_VIEW', () => {
      if (viewMode() === 'edit') {
        setViewMode('note');
      }
    });

    // Return to notes list
    keyBindingManager.on('RETURN_TO_NOTES', () => {
      setViewMode('search');
      setSelectedNoteId(null);
    });

    // Open settings
    keyBindingManager.on('OPEN_SETTINGS', () => {
      setIsSettingsOpen(true);
    });

    // Open export
    keyBindingManager.on('OPEN_EXPORT', () => {
      setIsExportOpen(true);
    });

    // Open theme dropdown
    keyBindingManager.on('OPEN_THEME_DROPDOWN', () => {
      // Trigger theme selector dropdown
      const themeButton = document.querySelector('.theme-selector-button') as HTMLElement;
      if (themeButton) {
        themeButton.click();
      }
    });

    // Open spotlight search
    keyBindingManager.on('OPEN_SPOTLIGHT_SEARCH', () => {
      setSpotlightMode('text');
      setIsSpotlightOpen(true);
    });

    // Open tag search
    keyBindingManager.on('OPEN_TAG_SEARCH', () => {
      setSpotlightMode('tag');
      setIsSpotlightOpen(true);
    });
  });

  onCleanup(() => {
    // Clean up keybinding listeners would go here if needed
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />
      
      <div class="app-main">
        <Sidebar
          selectedTags={selectedTags()}
          onSelectedTagsChange={setSelectedTags}
          notes={notes()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPlugins={() => setIsPluginOpen(true)}
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

      {/* Spotlight Search */}
      <Show when={isSpotlightOpen()}>
        <SpotlightSearch
          isOpen={true}
          onClose={() => setIsSpotlightOpen(false)}
          onSearch={handleSpotlightSearch}
          onTagAdd={handleTagAdd}
          searchMode={spotlightMode()}
        />
      </Show>

      {/* Modal Dialogs */}
      <Show when={isSettingsOpen()}>
        <SettingsModal
          isOpen={true}
          onClose={() => setIsSettingsOpen(false)}
        />
      </Show>

      <Show when={isPluginOpen()}>
        <PluginModal
          isOpen={true}
          onClose={() => setIsPluginOpen(false)}
        />
      </Show>

      <Show when={isExportOpen()}>
        <ExportModal
          isOpen={true}
          onClose={() => setIsExportOpen(false)}
        />
      </Show>
    </div>
  );
}

export default App;