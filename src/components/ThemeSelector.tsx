// src/components/ThemeSelector.tsx

import { createSignal, createEffect, For, Show, onMount } from "solid-js";
import { themeManager, type Theme } from "../lib/theme";
import { Icon } from "./Icon";

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = createSignal(themeManager.getCurrentTheme());
  const [isOpen, setIsOpen] = createSignal(false);
  const [allThemes, setAllThemes] = createSignal<Theme[]>([]);

  // Load themes on mount
  onMount(async () => {
    const themes = await themeManager.loadAllThemes();
    setAllThemes(themes);
    setCurrentTheme(themeManager.getCurrentTheme());
  });

  // Listen for theme changes and theme refresh events
  createEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setCurrentTheme(event.detail.theme);
    };

    const handleThemesRefresh = async () => {
      const themes = await themeManager.loadAllThemes();
      setAllThemes(themes);
    };

    window.addEventListener('theme-changed', handleThemeChange as EventListener);
    window.addEventListener('themes-refreshed', handleThemesRefresh as EventListener);
    
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener);
      window.removeEventListener('themes-refreshed', handleThemesRefresh as EventListener);
    };
  });

  const handleThemeSelect = async (theme: Theme) => {
    await themeManager.applyTheme(theme.name);
    setIsOpen(false);
  };

  const handleOpenThemesFolder = async () => {
    try {
      await themeManager.openThemesDirectory();
    } catch (error) {
      console.error('Failed to open themes folder:', error);
    }
  };

  // Auto-refresh themes when dropdown opens
  const handleDropdownToggle = async () => {
    const newIsOpen = !isOpen();
    setIsOpen(newIsOpen);
    
    // Auto-refresh themes when opening dropdown
    if (newIsOpen) {
      await themeManager.refreshUserThemes();
    }
  };

  const currentThemeDisplayName = () => {
    const theme = allThemes().find(t => t.name === currentTheme());
    return theme?.displayName || 'Unknown';
  };

  return (
    <div class="theme-selector">
      <button 
        onClick={handleDropdownToggle}
        class="theme-selector-button"
        title={`Change theme (Current: ${currentThemeDisplayName()})`}
      >
        <Icon name="droplet" size={20} class="clickable" />
      </button>

      <Show when={isOpen()}>
        <div class="theme-dropdown">
          <div class="theme-dropdown-header">
            <h4>Themes</h4>
            <div class="theme-actions">
              <button 
                onClick={handleOpenThemesFolder} 
                class="theme-action-btn"
                title="Open themes folder"
              >
                <Icon name="folder" size={16} class="clickable" />
              </button>
            </div>
          </div>
          <div class="theme-options">
            <For each={allThemes()}>
              {(theme) => (
                <button
                  onClick={() => handleThemeSelect(theme)}
                  class={`theme-option ${theme.name === currentTheme() ? 'active' : ''}`}
                >
                  <div class="theme-preview" data-theme={theme.name}></div>
                  <span class="theme-label">{theme.displayName}</span>
                  <Show when={theme.isUserTheme}>
                    <span class="user-badge">Custom</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={isOpen()}>
        <div 
          class="theme-dropdown-overlay" 
          onClick={() => setIsOpen(false)}
        ></div>
      </Show>
    </div>
  );
}