// src/components/ExportModal.tsx

import { Show, onMount, onCleanup } from "solid-js";
import { Icon } from "./Icon";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal(props: ExportModalProps) {
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
          <div class="export-placeholder">
            <Icon name="download" size={48} />
            <h3>Export Data</h3>
            <p>Export functionality will be implemented here.</p>
            <p>This will include options to export notes, themes, and other data in various formats.</p>
            
            <div class="export-options">
              <div class="export-option">
                <Icon name="file-text" size={24} />
                <div>
                  <h4>Export Notes</h4>
                  <p>Export all notes as Markdown files</p>
                </div>
              </div>
              
              <div class="export-option">
                <Icon name="palette" size={24} />
                <div>
                  <h4>Export Themes</h4>
                  <p>Export custom themes as CSS files</p>
                </div>
              </div>
              
              <div class="export-option">
                <Icon name="database" size={24} />
                <div>
                  <h4>Export Database</h4>
                  <p>Export complete database backup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-primary" disabled>
            Export Selected
          </button>
          <button class="btn btn-secondary" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
