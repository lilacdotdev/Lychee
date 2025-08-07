// src/lib/theme.ts
import { invoke } from '@tauri-apps/api/core';

export interface Theme {
  name: string;
  displayName: string;
  cssFile: string;
  isUserTheme?: boolean;
  content?: string;
}

export interface UserTheme {
  name: string;
  display_name: string;
  content: string;
  file_path: string;
}

// Define theme CSS content directly in JavaScript
const themeDefinitions = {
  light: `
    :root {
      --color-primary: #007bff !important;
      --color-background-primary: #ffffff !important;
      --color-background-secondary: #f8f9fa !important;
      --color-text-primary: #212529 !important;
      --color-border: #dee2e6 !important;
      --color-success: #28a745 !important;
      --color-danger: #dc3545 !important;
      --color-text-secondary: #6c757d !important;
    }
  `,
  dark: `
    :root {
      --color-primary: #0d6efd !important;
      --color-background-primary: #212529 !important;
      --color-background-secondary: #343a40 !important;
      --color-text-primary: #f8f9fa !important;
      --color-border: #495057 !important;
      --color-success: #198754 !important;
      --color-danger: #dc3545 !important;
      --color-text-secondary: #adb5bd !important;
    }
  `,
  rainbow: `
    :root {
      --color-primary: #ff6b6b !important;
      --color-background-primary: #2d3436 !important;
      --color-background-secondary: #636e72 !important;
      --color-text-primary: #ddd !important;
      --color-border: #74b9ff !important;
      --color-success: #00b894 !important;
      --color-danger: #e84393 !important;
      --color-text-secondary: #b2bec3 !important;
    }
    button {
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1) !important;
      background-size: 200% 200% !important;
      animation: rainbow-gradient 3s ease infinite !important;
    }
    @keyframes rainbow-gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .tag-btn.selected, .tag-chip, .tag-badge, .tag-item {
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      animation: rainbow-gradient 3s ease infinite !important;
    }
  `,
  solarized: `
    :root {
      --color-primary: #268bd2 !important;
      --color-background-primary: #002b36 !important;
      --color-background-secondary: #073642 !important;
      --color-text-primary: #839496 !important;
      --color-border: #586e75 !important;
      --color-success: #859900 !important;
      --color-danger: #dc322f !important;
      --color-text-secondary: #586e75 !important;
    }
    .markdown-preview h1, .markdown-content h1 { color: #b58900 !important; }
    .markdown-preview h2, .markdown-content h2 { color: #cb4b16 !important; }
    .markdown-preview h3, .markdown-content h3 { color: #dc322f !important; }
    .markdown-preview code, .markdown-content code {
      background-color: #073642 !important;
      color: #2aa198 !important;
    }
    .markdown-preview blockquote, .markdown-content blockquote {
      border-left-color: #859900 !important;
      color: #586e75 !important;
    }
  `,
  monokai: `
    :root {
      --color-primary: #a6e22e !important;
      --color-background-primary: #272822 !important;
      --color-background-secondary: #3e3d32 !important;
      --color-text-primary: #f8f8f2 !important;
      --color-border: #49483e !important;
      --color-success: #a6e22e !important;
      --color-danger: #f92672 !important;
      --color-text-secondary: #75715e !important;
    }
    .markdown-preview h1, .markdown-content h1 { color: #f92672 !important; }
    .markdown-preview h2, .markdown-content h2 { color: #fd971f !important; }
    .markdown-preview h3, .markdown-content h3 { color: #e6db74 !important; }
    .markdown-preview code, .markdown-content code {
      background-color: #3e3d32 !important;
      color: #66d9ef !important;
    }
    .markdown-preview pre, .markdown-content pre {
      background-color: #3e3d32 !important;
      border: 1px solid #49483e !important;
    }
    .markdown-preview blockquote, .markdown-content blockquote {
      border-left-color: #a6e22e !important;
      color: #75715e !important;
    }
  `
};

export const availableThemes: Theme[] = [
  {
    name: 'light',
    displayName: 'Light',
    cssFile: ''
  },
  {
    name: 'dark',
    displayName: 'Dark',
    cssFile: ''
  },
  {
    name: 'rainbow',
    displayName: 'Rainbow',
    cssFile: ''
  },
  {
    name: 'solarized',
    displayName: 'Solarized',
    cssFile: ''
  },
  {
    name: 'monokai',
    displayName: 'Monokai',
    cssFile: ''
  }
];

class ThemeManager {
  private currentTheme: string = 'light';
  private themeElement: HTMLStyleElement | null = null;
  private userThemes: UserTheme[] = [];
  private allThemes: Theme[] = [...availableThemes];

  constructor() {
    this.loadSavedTheme();
    this.createThemeElement();
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('lychee-theme');
    if (saved && availableThemes.find(t => t.name === saved)) {
      this.currentTheme = saved;
    }
  }

  private createThemeElement() {
    // Remove existing theme element if it exists
    const existing = document.getElementById('theme-stylesheet');
    if (existing) {
      existing.remove();
    }

    this.themeElement = document.createElement('style');
    this.themeElement.id = 'theme-stylesheet';
    document.head.appendChild(this.themeElement);
    this.applyTheme(this.currentTheme);
  }

  async loadAllThemes(): Promise<Theme[]> {
    try {
      this.userThemes = await invoke<UserTheme[]>('get_user_themes');
      
      // Convert user themes to Theme interface
      const convertedUserThemes: Theme[] = this.userThemes.map(userTheme => ({
        name: userTheme.name,
        displayName: userTheme.display_name,
        cssFile: '',
        isUserTheme: true,
        content: userTheme.content
      }));

      this.allThemes = [...availableThemes, ...convertedUserThemes];
      return this.allThemes;
    } catch (error) {
      console.error('Failed to load user themes:', error);
      this.allThemes = [...availableThemes];
      return this.allThemes;
    }
  }

  async applyTheme(themeName: string) {
    // Check if it's a user theme
    const userTheme = this.allThemes.find(t => t.name === themeName && t.isUserTheme);
    if (userTheme && userTheme.content) {
      // Apply user theme content
      if (this.themeElement) {
        this.themeElement.textContent = userTheme.content;
        this.currentTheme = themeName;
        localStorage.setItem('lychee-theme', themeName);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('theme-changed', { 
          detail: { theme: themeName } 
        }));
        
        console.log(`User theme ${themeName} applied successfully`);
        return;
      }
    }

    // Fall back to built-in theme logic
    const theme = availableThemes.find(t => t.name === themeName);
    if (!theme || !this.themeElement) {
      console.error(`Theme not found or element missing: ${themeName}`);
      return;
    }

    // Get theme CSS from definitions
    const css = themeDefinitions[themeName as keyof typeof themeDefinitions];
    if (!css) {
      console.warn(`Theme "${themeName}" not found in definitions`);
      return;
    }

    console.log(`Applying theme: ${themeName}`);
    console.log(`CSS to apply:`, css.substring(0, 200) + '...');

    // Apply the CSS
    this.themeElement.textContent = css;
    
    // Force a reflow to ensure CSS is applied immediately
    document.documentElement.offsetHeight;
    
    this.currentTheme = themeName;
    localStorage.setItem('lychee-theme', themeName);
    
    // Verify the CSS variables are actually set
    setTimeout(() => {
      const computedStyles = getComputedStyle(document.documentElement);
      const primary = computedStyles.getPropertyValue('--color-primary').trim();
      const background = computedStyles.getPropertyValue('--color-background-primary').trim();
      console.log(`Theme applied - Primary: ${primary}, Background: ${background}`);
    }, 100);
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('theme-changed', { 
      detail: { theme: themeName } 
    }));

    console.log(`Theme ${themeName} applied successfully`);
  }

  async refreshUserThemes() {
    await this.loadAllThemes();
    // Re-populate theme selector
    window.dispatchEvent(new CustomEvent('themes-refreshed'));
  }

  async openThemesDirectory(): Promise<string> {
    try {
      await invoke('open_themes_directory');
      const themesPath = await invoke<string>('get_themes_directory');
      console.log(`Themes folder: ${themesPath}`);
      return themesPath;
    } catch (error) {
      console.error('Failed to open themes folder:', error);
      throw error;
    }
  }

  async saveUserTheme(name: string, content: string): Promise<void> {
    try {
      await invoke('save_user_theme', { name, content });
      await this.refreshUserThemes();
    } catch (error) {
      console.error('Failed to save user theme:', error);
      throw error;
    }
  }

  async deleteUserTheme(themeName: string): Promise<void> {
    try {
      await invoke('delete_user_theme', { themeName });
      await this.refreshUserThemes();
    } catch (error) {
      console.error('Failed to delete user theme:', error);
      throw error;
    }
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  getAvailableThemes(): Theme[] {
    return this.allThemes;
  }
}

export const themeManager = new ThemeManager();
