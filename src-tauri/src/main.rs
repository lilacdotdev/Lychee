// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sqlx::SqlitePool;
use tauri::Manager;

mod core;
mod api;

fn main() {
    println!("Starting Lychee application...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database in async context
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Get parent directory (project root) and create database path
                let current_dir = std::env::current_dir().expect("Failed to get current directory");
                let project_root = current_dir.parent().unwrap_or(&current_dir);
                let db_path = project_root.join("notes.db");
                let db_url = format!("sqlite:{}", db_path.to_string_lossy());
                
                println!("Database path: {}", db_url);
                
                // Create database connection pool with create if missing
                let pool = SqlitePool::connect_with(
                    sqlx::sqlite::SqliteConnectOptions::new()
                        .filename(&db_path)
                        .create_if_missing(true)
                )
                .await
                .expect("Failed to connect to database");
                
                // Run migrations
                let migration_sql = include_str!("../migrations/1_create_tables.sql");
                sqlx::query(migration_sql)
                    .execute(&pool)
                    .await
                    .expect("Failed to run migrations");
                
                println!("Database initialized successfully");
                
                // Manage the pool
                app_handle.manage(pool);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::notes::create_note,
            api::notes::get_all_notes,
            api::notes::get_note_by_id,
            api::notes::update_note,
            api::notes::delete_note,
            api::notes::get_tags_for_note,
            api::notes::search_notes_by_tags,
            api::tags::get_all_tags,
            api::tags::delete_tag,
            api::tags::rename_tag
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}