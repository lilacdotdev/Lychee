// src-tauri/src/api/plugins.rs

use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{command, AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub path: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct PluginStateFile {
    enabled: std::collections::HashMap<String, bool>,
}

fn get_plugins_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let plugins_dir = app_data_dir.join("plugins");
    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }
    Ok(plugins_dir)
}

fn get_state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join("plugins_state.json"))
}

fn read_state(app: &AppHandle) -> PluginStateFile {
    let path = match get_state_file_path(app) {
        Ok(p) => p,
        Err(_) => return PluginStateFile::default(),
    };
    if !path.exists() {
        return PluginStateFile::default();
    }
    let data = fs::read_to_string(path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

fn write_state(app: &AppHandle, state: &PluginStateFile) -> Result<(), String> {
    let path = get_state_file_path(app)?;
    let data = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| format!("Failed to write plugin state: {}", e))
}

#[command]
pub async fn get_plugins_directory(app: AppHandle) -> Result<String, String> {
    let dir = get_plugins_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[command]
pub async fn open_plugins_directory(app: AppHandle) -> Result<(), String> {
    let plugins_dir = get_plugins_dir(&app)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&plugins_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&plugins_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&plugins_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    Ok(())
}

#[command]
pub async fn list_plugins(app: AppHandle) -> Result<Vec<PluginInfo>, String> {
    let plugins_dir = get_plugins_dir(&app)?;
    let state = read_state(&app);

    let mut plugins = Vec::new();
    let entries = fs::read_dir(&plugins_dir)
        .map_err(|e| format!("Failed to read plugins directory: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let id = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            let manifest_path = path.join("plugin.json");
            if manifest_path.exists() {
                let content = fs::read_to_string(&manifest_path)
                    .map_err(|e| format!("Failed to read {}: {}", manifest_path.display(), e))?;
                let manifest: PluginManifest = serde_json::from_str(&content)
                    .map_err(|e| format!("Invalid plugin.json in {}: {}", id, e))?;

                let enabled = state.enabled.get(&id).copied().unwrap_or(false);
                plugins.push(PluginInfo {
                    id,
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    path: path.to_string_lossy().to_string(),
                    enabled,
                });
            }
        }
    }

    // sort by name
    plugins.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(plugins)
}

#[command]
pub async fn set_plugin_enabled(app: AppHandle, plugin_id: String, enabled: bool) -> Result<(), String> {
    let mut state = read_state(&app);
    state.enabled.insert(plugin_id, enabled);
    write_state(&app, &state)
}


