// src/components/ExportModal.tsx

import { Show, onMount, onCleanup, createSignal, For, createEffect } from "solid-js";
import { Icon } from "./Icon";
import { invoke } from "@tauri-apps/api/core";
import jsPDF from "jspdf";
import type { NoteWithTags, Tag } from "../types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal(props: ExportModalProps) {
  const [queryText, setQueryText] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [availableTags, setAvailableTags] = createSignal<Tag[]>([]);
  const [notes, setNotes] = createSignal<NoteWithTags[]>([]);
  const [filteredNotes, setFilteredNotes] = createSignal<NoteWithTags[]>([]);
  const [excludedIds, setExcludedIds] = createSignal<Set<number>>(new Set());
  const [isExporting, setIsExporting] = createSignal(false);

  // Load tags and notes when modal opens
  createEffect(async () => {
    if (!props.isOpen) return;
    try {
      const tags = await invoke<Tag[]>("get_all_tags");
      setAvailableTags(tags);
      const allNotes = await invoke<NoteWithTags[]>("get_all_notes");
      setNotes(allNotes);
      // Reset filters
      setSelectedTags([]);
      setQueryText("");
      setExcludedIds(new Set());
      setFilteredNotes(allNotes);
    } catch (error) {
      console.error("Failed to load export data:", error);
    }
  });

  // Recompute filtered list when filters change
  createEffect(() => {
    const q = queryText().toLowerCase().trim();
    const tags = selectedTags();
    let result = notes();
    if (tags.length > 0) {
      result = result.filter(n => tags.every(t => n.tags.includes(t)));
    }
    if (q) {
      result = result.filter(n =>
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    setFilteredNotes(result);
  });

  const toggleTag = (name: string) => {
    const current = selectedTags();
    setSelectedTags(
      current.includes(name)
        ? current.filter(t => t !== name)
        : [...current, name]
    );
  };

  const toggleExclude = (id: number) => {
    const s = new Set(excludedIds());
    if (s.has(id)) s.delete(id); else s.add(id);
    setExcludedIds(s);
  };

  const extractTitle = (content: string): string => {
    const first = content.split("\n")[0] || "";
    return first.replace(/^#+\s*/, "").trim() || "Untitled";
  };

  const exportPdf = async () => {
    try {
      setIsExporting(true);
      const toExport = filteredNotes().filter(n => !excludedIds().has(n.id));
      if (toExport.length === 0) {
        alert("No notes to export.");
        return;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let cursorY = margin;

      const addPageIfNeeded = (heightNeeded: number) => {
        if (cursorY + heightNeeded > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
      };

      toExport.forEach((note, idx) => {
        const title = extractTitle(note.content);
        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        addPageIfNeeded(24);
        doc.text(title, margin, cursorY);
        cursorY += 18;

        // Tags line
        if (note.tags.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const tagsLine = `Tags: ${note.tags.join(", ")}`;
          addPageIfNeeded(16);
          doc.text(tagsLine, margin, cursorY);
          cursorY += 14;
        }

        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const body = note.content;
        const lines = doc.splitTextToSize(body, pageWidth - margin * 2);
        lines.forEach(line => {
          addPageIfNeeded(14);
          doc.text(line, margin, cursorY);
          cursorY += 14;
        });

        // Separator between notes
        if (idx < toExport.length - 1) {
          addPageIfNeeded(20);
          cursorY += 10;
          doc.setDrawColor(200);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 10;
        }
      });

      const base64 = doc.output("datauristring");
      const fileName = `notes_export_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
      const savedPath = await invoke<string>("save_export_pdf", {
        base64Data: base64,
        fileName
      });
      alert(`Export saved to: ${savedPath}`);
      props.onClose();
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isOpen) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  if (!props.isOpen) return null;

  return (
    <div class="modal-overlay">
      <div class="modal-container export-modal">
        <div class="modal-header">
          <h2>Export</h2>
          <button class="modal-close" onClick={props.onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="export-ui">
            <div class="filters">
              <div class="filter-row">
                <label>Text filter</label>
                <input
                  class="export-input"
                  type="text"
                  placeholder="Filter notes by text..."
                  value={queryText()}
                  onInput={(e) => setQueryText(e.currentTarget.value)}
                />
              </div>
              <div class="filter-row">
                <label>Tags</label>
                <div class="tag-pills">
                  <For each={availableTags()}>
                    {(tag) => (
                      <button
                        class={`tag-pill ${selectedTags().includes(tag.name) ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag.name)}
                      >{tag.name}</button>
                    )}
                  </For>
                </div>
              </div>
            </div>

            <div class="notes-list">
              <h4>Notes to export ({filteredNotes().length})</h4>
              <div class="notes-scroll">
                <For each={filteredNotes()}>
                  {(note) => (
                    <div class={`export-note ${excludedIds().has(note.id) ? 'excluded' : ''}`}>
                      <div class="export-note-main" onClick={() => toggleExclude(note.id)}>
                        <input type="checkbox" checked={!excludedIds().has(note.id)} />
                        <div class="export-note-texts">
                          <div class="export-note-title">{extractTitle(note.content)}</div>
                          <div class="export-note-tags">{note.tags.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-primary" onClick={exportPdf} disabled={isExporting()}>
            {isExporting() ? 'Exporting…' : 'Export Selected as PDF'}
          </button>
          <button class="btn btn-secondary" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
