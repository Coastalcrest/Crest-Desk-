//! Custom error types for the Media Encoder service.
//!
//! Uses `thiserror` for ergonomic error definitions and conversions.

use actix_web::{HttpResponse, ResponseError};
use std::fmt;

/// Top-level error type for the Media Encoder service.
#[derive(Debug, thiserror::Error)]
pub enum MediaError {
    /// The source media file could not be found or accessed.
    #[error("Source not found: {0}")]
    SourceNotFound(String),

    /// The requested encoding format is not supported.
    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    /// FFmpeg encoding failed.
    #[error("Encoding error: {0}")]
    EncodingError(String),

    /// Image processing operation failed.
    #[error("Image processing error: {0}")]
    ImageProcessingError(String),

    /// The uploaded file exceeds the maximum allowed size.
    #[error("File too large: {0}")]
    FileTooLarge(String),

    /// A database operation failed.
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// An unexpected internal error occurred.
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl ResponseError for MediaError {
    fn error_response(&self) -> HttpResponse {
        match self {
            MediaError::SourceNotFound(_) => {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": self.to_string(),
                    "code": "SOURCE_NOT_FOUND"
                }))
            }
            MediaError::UnsupportedFormat(_) => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": self.to_string(),
                    "code": "UNSUPPORTED_FORMAT"
                }))
            }
            MediaError::FileTooLarge(_) => {
                HttpResponse::PayloadTooLarge().json(serde_json::json!({
                    "error": self.to_string(),
                    "code": "FILE_TOO_LARGE"
                }))
            }
            MediaError::EncodingError(_) | MediaError::ImageProcessingError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Media processing failed",
                    "code": "PROCESSING_ERROR"
                }))
            }
            MediaError::DatabaseError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Database operation failed",
                    "code": "DB_ERROR"
                }))
            }
            MediaError::InternalError(_) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Internal server error",
                    "code": "INTERNAL_ERROR"
                }))
            }
        }
    }
}

impl From<sqlx::Error> for MediaError {
    fn from(err: sqlx::Error) -> Self {
        MediaError::DatabaseError(err.to_string())
    }
}

impl From<image::ImageError> for MediaError {
    fn from(err: image::ImageError) -> Self {
        MediaError::ImageProcessingError(err.to_string())
    }
}
