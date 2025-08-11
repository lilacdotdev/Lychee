// src-tauri/src/api/export.rs

use tauri::{command, AppHandle, Manager};
use base64::Engine;

#[command]
pub async fn save_export_pdf(
    app: AppHandle,
    base64_data: String,
    file_name: Option<String>,
) -> Result<String, String> {
    // Determine exports directory under app data
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let exports_dir = app_data_dir.join("exports");
    if !exports_dir.exists() {
        std::fs::create_dir_all(&exports_dir)
            .map_err(|e| format!("Failed to create exports directory: {}", e))?;
    }

    // Decode base64 to bytes (support data URI prefix)
    let comma_idx = base64_data.find(',');
    let b64 = if let Some(i) = comma_idx {
        &base64_data[i + 1..]
    } else {
        base64_data.as_str()
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| format!("Failed to decode base64 PDF data: {}", e))?;

    // Build filename
    let name = file_name.unwrap_or_else(|| {
        let ts = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
        format!("export_{}.pdf", ts)
    });

    let file_path = exports_dir.join(name);
    std::fs::write(&file_path, bytes)
        .map_err(|e| format!("Failed to write PDF file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}


