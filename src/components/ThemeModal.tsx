// src/components/ThemeModal.tsx

import { Show, onMount, onCleanup, createSignal, For, createEffect } from "solid-js";
import { Icon } from "./Icon";
import { invoke } from "@tauri-apps/api/core";
import { themeManager, type Theme } from "../lib/theme";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeModal(props: ThemeModalProps) {
  const [allThemes, setAllThemes] = createSignal<Theme[]>([]);
  const [currentTheme, setCurrentTheme] = createSignal<string>('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const loadThemes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Wait for theme manager to be ready
      await themeManager.waitForReady();
      const themes = await themeManager.loadAllThemes();
      setAllThemes(themes);
      setCurrentTheme(themeManager.getCurrentTheme());
    } catch (e: any) {
      console.error("Failed to load themes:", e);
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeSelect = async (theme: Theme) => {
    try {
      await themeManager.applyTheme(theme.name);
      setCurrentTheme(theme.name);
    } catch (e) {
      console.error("Failed to apply theme:", e);
      alert("Failed to apply theme: " + e);
    }
  };

  const openThemesFolder = async () => {
    try {
      await invoke("open_themes_directory");
    } catch (e) {
      console.error("Failed to open themes folder:", e);
      alert("Failed to open themes folder: " + e);
    }
  };

  const refreshThemes = async () => {
    await loadThemes();
    // Dispatch theme refresh event
    window.dispatchEvent(new CustomEvent('themes-refreshed'));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isOpen) {
      props.onClose();
    }
  };

  // Listen for theme changes
  createEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setCurrentTheme(event.detail.theme);
    };

    window.addEventListener('theme-changed', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener);
    };
  });

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  if (!props.isOpen) return null;

  // Load themes whenever modal opens
  createEffect(() => {
    if (props.isOpen) {
      loadThemes();
    }
  });

  // Separate custom themes from default themes
  // Custom themes are shown first, followed by default themes (from initialize_default_themes)
  const customThemes = () => allThemes().filter(theme => theme.isUserTheme);
  const defaultThemes = () => allThemes().filter(theme => !theme.isUserTheme);

  return (
    <div class="modal-overlay">
      <div class="modal-container theme-modal">
        <div class="modal-header">
          <h2>Themes</h2>
          <button class="modal-close" onClick={props.onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="theme-actions" style="display:flex; gap:.5rem; margin-bottom:1rem;">
            <button class="btn btn-secondary" onClick={openThemesFolder}>
              <Icon name="folder" size={16} /> Open Themes Folder
            </button>
            <button class="btn btn-secondary" onClick={refreshThemes} disabled={isLoading()}>
              <Icon name="refresh-cw" size={16} /> {isLoading() ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <Show when={!error()} fallback={<div class="error">{error()}</div>}>
            <div class="themes-container">
              
              {/* Custom Themes Section */}
              <Show when={customThemes().length > 0}>
                <div class="themes-section">
                  <h3 class="themes-section-title">Custom Themes</h3>
                  <div class="themes-grid">
                    <For each={customThemes()}>
                      {(theme) => (
                        <button
                          onClick={() => handleThemeSelect(theme)}
                          class={`theme-card ${theme.name === currentTheme() ? 'active' : ''}`}
                          title={theme.displayName}
                        >
                          <div class="theme-preview" data-theme={theme.name}></div>
                          <div class="theme-info">
                            <span class="theme-name">{theme.displayName}</span>
                            <span class="theme-badge user-badge">Custom</span>
                          </div>
                          <Show when={theme.name === currentTheme()}>
                            <div class="theme-active-indicator">
                              <Icon name="check" size={16} />
                            </div>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Default Themes Section */}
              <Show when={defaultThemes().length > 0}>
                <div class="themes-section">
                  <h3 class="themes-section-title">Default Themes</h3>
                  <div class="themes-grid">
                    <For each={defaultThemes()}>
                      {(theme) => (
                        <button
                          onClick={() => handleThemeSelect(theme)}
                          class={`theme-card ${theme.name === currentTheme() ? 'active' : ''}`}
                          title={theme.displayName}
                        >
                          <div class="theme-preview" data-theme={theme.name}></div>
                          <div class="theme-info">
                            <span class="theme-name">{theme.displayName}</span>
                          </div>
                          <Show when={theme.name === currentTheme()}>
                            <div class="theme-active-indicator">
                              <Icon name="check" size={16} />
                            </div>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* No themes found fallback */}
              <Show when={allThemes().length === 0 && !isLoading()}>
                <div class="no-themes-message">
                  <p>No themes found.</p>
                  <p>Place .css theme files in the themes directory to see them here.</p>
                </div>
              </Show>

            </div>
          </Show>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
