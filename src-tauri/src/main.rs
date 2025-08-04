// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};

mod core;
mod api;

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(
                    "sqlite:notes.db",
                    vec![Migration {
                        version: 1,
                        description: "create_initial_tables",
                        sql: include_str!("../migrations/1_create_tables.sql"),
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            api::notes::create_note,
            api::notes::get_all_notes,
            api::notes::delete_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}