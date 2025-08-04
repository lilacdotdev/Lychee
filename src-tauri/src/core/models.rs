// src-tauri/src/core/models.rs

use serde::{Serialize, Deserialize};
use sqlx::FromRow; // Import the FromRow trait

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)] // Add FromRow here
pub struct Note {
    pub id: i64,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)] // And also here for later
pub struct Tag {
    pub id: i64,
    pub name: String,
}