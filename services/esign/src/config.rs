//! Configuration module for CrestDesk E-Sign service.
//!
//! Loads configuration from environment variables with sensible defaults.

use serde::Deserialize;

/// Service configuration loaded from environment variables.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Server listen port (default: 8080)
    pub port: u16,

    /// PostgreSQL connection string
    pub database_url: String,

    /// Base64-encoded Ed25519 signing key
    pub signing_key: String,

    /// AES-GCM encryption key (base64-encoded, 256-bit)
    pub encryption_key: String,

    /// Log level (default: "info")
    pub log_level: String,

    /// Datadog agent host for OpenTelemetry export
    pub dd_agent_host: Option<String>,
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// # Panics
    /// Panics if required environment variables (DATABASE_URL, SIGNING_KEY,
    /// ENCRYPTION_KEY) are not set.
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            signing_key: std::env::var("SIGNING_KEY")
                .expect("SIGNING_KEY must be set"),
            encryption_key: std::env::var("ENCRYPTION_KEY")
                .expect("ENCRYPTION_KEY must be set"),
            log_level: std::env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".to_string()),
            dd_agent_host: std::env::var("DD_AGENT_HOST").ok(),
        }
    }
}
