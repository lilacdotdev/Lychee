// src/components/ThemeSelector.tsx

import { createSignal, createEffect, For, Show } from "solid-js";
import { themeManager, availableThemes, type Theme } from "../lib/theme";

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = createSignal(themeManager.getCurrentTheme());
  const [isOpen, setIsOpen] = createSignal(false);

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

  const handleThemeSelect = (theme: Theme) => {
    themeManager.applyTheme(theme.name);
    setIsOpen(false);
  };

  const currentThemeDisplayName = () => {
    const theme = availableThemes.find(t => t.name === currentTheme());
    return theme?.displayName || 'Unknown';
  };

  return (
    <div class="theme-selector">
      <button 
        onClick={() => setIsOpen(!isOpen())}
        class="theme-selector-button"
        title={`Change theme (Current: ${currentThemeDisplayName()})`}
      >
        <span class="theme-icon">🎨</span>
      </button>

      <Show when={isOpen()}>
        <div class="theme-dropdown">
          <div class="theme-dropdown-header">
            <h4>Themes</h4>
          </div>
          <div class="theme-options">
            <For each={availableThemes}>
              {(theme) => (
                <button
                  onClick={() => handleThemeSelect(theme)}
                  class={`theme-option ${theme.name === currentTheme() ? 'active' : ''}`}
                >
                  <div class="theme-preview" data-theme={theme.name}></div>
                  <span class="theme-label">{theme.displayName}</span>
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