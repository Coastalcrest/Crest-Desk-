//! Custom error types for the E-Sign service.
//!
//! Uses `thiserror` for ergonomic error definitions and conversions.

use actix_web::{HttpResponse, ResponseError};
use std::fmt;

/// Top-level error type for the E-Sign service.
#[derive(Debug, thiserror::Error)]
pub enum EsignError {
    /// The provided cryptographic key is invalid or malformed.
    #[error("Invalid key: {0}")]
    InvalidKey(String),

    /// The provided signature is invalid or malformed.
    #[error("Invalid signature: {0}")]
    InvalidSignature(String),

    /// An encryption or decryption operation failed.
    #[error("Encryption error: {0}")]
    EncryptionError(String),

    /// The document content could not be decoded.
    #[error("Invalid document: {0}")]
    InvalidDocument(String),

    /// A database operation failed.
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// An unexpected internal error occurred.
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl ResponseError for EsignError {
    fn error_response(&self) -> HttpResponse {
        match self {
            EsignError::InvalidKey(_)
            | EsignError::InvalidSignature(_)
            | EsignError::InvalidDocument(_) => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": self.to_string(),
                    "code": "VALIDATION_ERROR"
                }))
            }
            EsignError::EncryptionError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Cryptographic operation failed",
                    "code": "CRYPTO_ERROR"
                }))
            }
            EsignError::DatabaseError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Database operation failed",
                    "code": "DB_ERROR"
                }))
            }
            EsignError::InternalError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Internal server error",
                    "code": "INTERNAL_ERROR"
                }))
            }
        }
    }
}

impl From<sqlx::Error> for EsignError {
    fn from(err: sqlx::Error) -> Self {
        EsignError::DatabaseError(err.to_string())
    }
}
