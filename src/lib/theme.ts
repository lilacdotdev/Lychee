/**
 * Theme management system for Lychee application
 * Handles loading, applying, and persisting user themes
 */

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

// Built-in theme definitions (currently empty - all themes are user-defined)
const themeDefinitions = {};

export const availableThemes: Theme[] = [];

class ThemeManager {
  private currentTheme: string = 'dark';
  private themeElement: HTMLStyleElement | null = null;
  private userThemes: UserTheme[] = [];
  private allThemes: Theme[] = [...availableThemes];
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      await this.initializeDefaultThemes();
      await this.loadAllThemes();
      this.loadSavedTheme();
      this.createThemeElement();
      this.isInitialized = true;
      
      // Notify that themes are ready
      window.dispatchEvent(new CustomEvent('themes-ready'));
    } catch (error) {
      console.error('Failed to initialize theme manager:', error);
      // Fall back to basic initialization
      this.createThemeElement();
      this.isInitialized = true;
    }
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('lychee-theme');
    if (saved) {
      // Check if theme exists in either built-in or user themes
      const theme = this.allThemes.find(t => t.name === saved);
      if (theme) {
        this.currentTheme = saved;
        return;
      }
      // If saved theme not found, fall through to choose a sensible default
    }

    // No saved theme, or saved theme not found: choose a sensible default
    // Prefer a built-in light theme if available, else prefer a default user dark theme, else first available
    const preferredNamesInOrder = ['light', 'user-dark', 'dark'];
    const preferred = preferredNamesInOrder
      .map(name => this.allThemes.find(t => t.name === name))
      .find(Boolean) as Theme | undefined;

    if (preferred) {
      this.currentTheme = preferred.name;
      return;
    }

    // Fallback to the first available theme if any
    if (this.allThemes.length > 0) {
      this.currentTheme = this.allThemes[0].name;
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
    
    // Apply the current theme
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
    // Ensure style element exists
    if (!this.themeElement) {
      this.createThemeElement();
    }

    // Check if it's a user theme (user themes names are saved as-is, e.g., "user-dark")
    const userTheme = this.allThemes.find(t => t.name === themeName && t.isUserTheme);
    if (userTheme && userTheme.content && this.themeElement) {
      // Apply user theme content
      this.themeElement.textContent = userTheme.content;
      this.currentTheme = themeName;
      localStorage.setItem('lychee-theme', themeName);

      // Dispatch theme change event
      window.dispatchEvent(new CustomEvent('theme-changed', { 
        detail: { theme: themeName } 
      }));
      return;
    }

    // Fall back to built-in theme logic
    const theme = availableThemes.find(t => t.name === themeName);
    if (!theme) {
      console.warn(`Theme not found: ${themeName}. Falling back to first available or noop.`);
      return;
    }

    // Get theme CSS from definitions
    const css = themeDefinitions[themeName as keyof typeof themeDefinitions];
    if (!css) {
      console.warn(`Theme "${themeName}" not found in definitions`);
      return;
    }



    // Apply the CSS
    if (!this.themeElement) {
      this.createThemeElement();
    }
    if (this.themeElement) {
      this.themeElement.textContent = css;
    }
    
    // Force a reflow to ensure CSS is applied immediately
    document.documentElement.offsetHeight;
    
    this.currentTheme = themeName;
    localStorage.setItem('lychee-theme', themeName);
    

    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('theme-changed', { 
      detail: { theme: themeName } 
    }));


  }

  async refreshUserThemes() {
    await this.loadAllThemes();
    // Re-populate theme selector
    window.dispatchEvent(new CustomEvent('themes-refreshed'));
  }

  private async initializeDefaultThemes() {
    try {
      await invoke('initialize_default_themes');
    } catch (error) {
      console.error('Failed to initialize default themes:', error);
    }
  }

  async ensureDefaultThemes(): Promise<void> {
    try {
      await invoke('initialize_default_themes');
      await this.refreshUserThemes();
    } catch (error) {
      console.error('Failed to ensure default themes:', error);
      throw error;
    }
  }

  async openThemesDirectory(): Promise<string> {
    try {
      await invoke('open_themes_directory');
      const themesPath = await invoke<string>('get_themes_directory');
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

  isReady(): boolean {
    return this.isInitialized;
  }

  async waitForReady(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const handler = () => {
        window.removeEventListener('themes-ready', handler);
        resolve();
      };
      window.addEventListener('themes-ready', handler);
    });
  }
}

export const themeManager = new ThemeManager();
