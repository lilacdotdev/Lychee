// src/components/NoteList.tsx

import { For, createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { NoteWithTags } from "../types";

interface NoteListProps {
  setSelectedNoteId: (id: number | null) => void;
  notes: NoteWithTags[];
  onNotesChange: () => void;
}

export function NoteList(props: NoteListProps) {
  const [isCreating, setIsCreating] = createSignal(false);

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const createRequest = {
        content: "# New Note\n\nStart writing your note here...",
        tags: []
      };
      
      const newNoteId = await invoke<number>("create_note", { request: createRequest });
      props.onNotesChange();
      // Select the newly created note
      props.setSelectedNoteId(newNoteId);
    } catch (e) {
      console.error("Failed to create note:", e);
      alert(`Failed to create note: ${e}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (id: number, e: MouseEvent) => {
    e.stopPropagation(); // Prevent the click from also selecting the note
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await invoke("delete_note", { id });
        props.onNotesChange();
      } catch (e) {
        console.error("Failed to delete note:", e);
      }
    }
  };

  const getNotePreview = (content: string) => {
    // Remove markdown headers and get first meaningful line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
      }
    }
    return "Empty note";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div class="note-list">
      <div class="list-header">
        <h2>Notes</h2>
        <button 
          onClick={handleCreateNote} 
          disabled={isCreating()}
          class="new-note-btn"
        >
          {isCreating() ? "Creating..." : "New Note"}
        </button>
      </div>

      <Show when={props.notes.length > 0} fallback={<p class="no-notes">No notes found.</p>}>
        <ul class="notes-list">
          <For each={props.notes}>
            {(note) => (
              <li 
                class="note-item" 
                onClick={() => props.setSelectedNoteId(note.id)}
              >
                <div class="note-content">
                  <h3 class="note-title">{getNotePreview(note.content)}</h3>
                  <div class="note-meta">
                    <span class="note-date">{formatDate(note.updated_at || note.created_at)}</span>
                    <Show when={note.tags.length > 0}>
                      <div class="note-tags">
                        <For each={note.tags}>
                          {(tag) => <span class="tag-chip">{tag}</span>}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
                <button 
                  class="delete-btn" 
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  title="Delete note"
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}