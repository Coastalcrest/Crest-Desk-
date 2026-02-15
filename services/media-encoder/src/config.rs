//! Configuration module for CrestDesk Media Encoder service.
//!
//! Loads configuration from environment variables with sensible defaults.

use serde::Deserialize;

/// Service configuration loaded from environment variables.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Server listen port (default: 8081)
    pub port: u16,

    /// PostgreSQL connection string
    pub database_url: String,

    /// Path to FFmpeg binary (default: "ffmpeg")
    pub ffmpeg_path: String,

    /// Temporary directory for encoding jobs (default: "/tmp/media-encoder")
    pub temp_dir: String,

    /// Maximum upload size in bytes (default: 500 MB)
    pub max_upload_bytes: u64,

    /// Log level (default: "info")
    pub log_level: String,

    /// Datadog agent host for OpenTelemetry export
    pub dd_agent_host: Option<String>,
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// # Panics
    /// Panics if the required `DATABASE_URL` environment variable is not set.
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8081),
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            ffmpeg_path: std::env::var("FFMPEG_PATH")
                .unwrap_or_else(|_| "ffmpeg".to_string()),
            temp_dir: std::env::var("TEMP_DIR")
                .unwrap_or_else(|_| "/tmp/media-encoder".to_string()),
            max_upload_bytes: std::env::var("MAX_UPLOAD_BYTES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(500 * 1024 * 1024), // 500 MB
            log_level: std::env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".to_string()),
            dd_agent_host: std::env::var("DD_AGENT_HOST").ok(),
        }
    }
}
