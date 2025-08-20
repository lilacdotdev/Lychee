/**
 * Main application component for Lychee note-taking app
 * Handles global state management, keybinding setup, and component orchestration
 */

import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ViewPane } from "./components/ViewPane";
import { SpotlightSearch } from "./components/SpotlightSearch";
import { SettingsModal } from "./components/SettingsModal";
import { PluginModal } from "./components/PluginModal";
import { ExportModal } from "./components/ExportModal";
import { ThemeModal } from "./components/ThemeModal";
import { themeManager } from "./lib/theme";
import { keyBindingManager } from "./lib/keybindings";
import { invoke } from "@tauri-apps/api/core";
import type { NoteWithTags } from "./types";
import "./styles/style.css";

function App() {
  // Core application state
  const [notes, setNotes] = createSignal<NoteWithTags[]>([]);
  const [selectedNoteId, setSelectedNoteId] = createSignal<number | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [viewMode, setViewMode] = createSignal<'search' | 'note' | 'edit'>('search');
  
  // Modal state management
  const [isSpotlightOpen, setIsSpotlightOpen] = createSignal(false);
  const [spotlightMode, setSpotlightMode] = createSignal<'text' | 'tag'>('text');
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isPluginOpen, setIsPluginOpen] = createSignal(false);
  const [isExportOpen, setIsExportOpen] = createSignal(false);
  const [isThemeOpen, setIsThemeOpen] = createSignal(false);

  /**
   * Refreshes the notes list from the backend
   */
  const refreshNotes = async () => {
    try {
      const allNotes = await invoke<NoteWithTags[]>("get_all_notes");
      setNotes(allNotes);
    } catch (error) {
      console.error("Failed to refresh notes:", error);
    }
  };

  /**
   * Updates the notes state with new notes data
   */
  const handleNotesChange = (newNotes: NoteWithTags[]) => {
    setNotes(newNotes);
  };

  /**
   * Sets a note for editing and switches to edit mode
   */
  const handleNewNoteEdit = (noteId: number) => {
    setSelectedNoteId(noteId);
    setViewMode('edit');
  };

  /**
   * Handles search input from spotlight and switches to search view
   */
  const handleSpotlightSearch = (query: string) => {
    setSearchQuery(query);
    setViewMode('search');
  };

  /**
   * Adds a tag to the current selection and switches to search view
   */
  const handleTagAdd = (tag: string) => {
    const current = selectedTags();
    if (!current.includes(tag)) {
      setSelectedTags([...current, tag]);
    }
    setViewMode('search');
  };

  /**
   * Initialize theme manager and load notes on app startup
   */
  createEffect(() => {
    themeManager.applyTheme(themeManager.getCurrentTheme());
    refreshNotes();
  });

  /**
   * Set up global keybinding handlers
   */
  onMount(() => {
    // Note creation keybinding
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

    // Navigation keybindings
    keyBindingManager.on('RETURN_TO_VIEW', () => {
      if (viewMode() === 'edit') {
        setViewMode('note');
      }
    });

    keyBindingManager.on('RETURN_TO_NOTES', () => {
      setViewMode('search');
      setSelectedNoteId(null);
    });

    // Modal opening keybindings
    keyBindingManager.on('OPEN_SETTINGS', () => {
      setIsSettingsOpen(true);
    });

    keyBindingManager.on('OPEN_EXPORT', () => {
      setIsExportOpen(true);
    });

    keyBindingManager.on('OPEN_THEME_DROPDOWN', () => {
      setIsThemeOpen(true);
    });

    // Search keybindings
    keyBindingManager.on('OPEN_SPOTLIGHT_SEARCH', () => {
      setSpotlightMode('text');
      setIsSpotlightOpen(true);
    });

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
          onOpenThemes={() => setIsThemeOpen(true)}
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

      <Show when={isThemeOpen()}>
        <ThemeModal
          isOpen={true}
          onClose={() => setIsThemeOpen(false)}
        />
      </Show>
    </div>
  );
}

export default App;