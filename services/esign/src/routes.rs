//! Route handlers for the E-Sign service API.
//!
//! Provides endpoints for creating digital signatures, verifying them,
//! and performing tamper detection on signed documents.

use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

use crate::crypto;
use crate::error::EsignError;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/// Request body for creating a digital signature.
#[derive(Debug, Deserialize)]
pub struct SignRequest {
    /// Base64-encoded document content
    pub document_b64: String,
    /// Signer identity (email or user ID)
    pub signer_id: String,
    /// Optional document identifier
    pub document_id: Option<Uuid>,
}

/// Response body after creating a signature.
#[derive(Debug, Serialize)]
pub struct SignResponse {
    pub signature_id: Uuid,
    pub document_hash: String,
    pub signature: String,
    pub signed_at: chrono::DateTime<Utc>,
    pub signer_id: String,
}

/// Request body for verifying a signature.
#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    /// Base64-encoded document content
    pub document_b64: String,
    /// Base64-encoded signature
    pub signature: String,
    /// Base64-encoded public (verifying) key
    pub public_key: String,
}

/// Response body after verifying a signature.
#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub verified_at: chrono::DateTime<Utc>,
}

/// Request body for tamper detection.
#[derive(Debug, Deserialize)]
pub struct TamperCheckRequest {
    /// Base64-encoded current document content
    pub document_b64: String,
    /// Previously recorded SHA-256 hash
    pub original_hash: String,
}

/// Response body after tamper detection.
#[derive(Debug, Serialize)]
pub struct TamperCheckResponse {
    pub tampered: bool,
    pub current_hash: String,
    pub original_hash: String,
    pub checked_at: chrono::DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /api/v1/esign/sign
///
/// Create a digital signature for a document.
pub async fn create_signature(
    body: web::Json<SignRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    // TODO: Load signing key from config / HSM
    // TODO: Persist signature record to database
    // TODO: Emit audit event

    let document_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &body.document_b64,
    )
    .map_err(|_| {
        actix_web::error::ErrorBadRequest("Invalid base64 document content")
    })?;

    let document_hash = crypto::hash_document(&document_bytes);

    let response = SignResponse {
        signature_id: Uuid::new_v4(),
        document_hash,
        signature: String::new(), // TODO: actual signature
        signed_at: Utc::now(),
        signer_id: body.signer_id.clone(),
    };

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/v1/esign/verify
///
/// Verify a digital signature against a document.
pub async fn verify_signature(
    body: web::Json<VerifyRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let document_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &body.document_b64,
    )
    .map_err(|_| {
        actix_web::error::ErrorBadRequest("Invalid base64 document content")
    })?;

    let valid = crypto::verify_signature(
        &document_bytes,
        &body.signature,
        &body.public_key,
    )
    .map_err(|e| actix_web::error::ErrorBadRequest(e.to_string()))?;

    let response = VerifyResponse {
        valid,
        verified_at: Utc::now(),
    };

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/v1/esign/tamper-check
///
/// Check whether a document has been modified since it was originally signed
/// by comparing SHA-256 hashes.
pub async fn check_tamper(
    body: web::Json<TamperCheckRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let document_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &body.document_b64,
    )
    .map_err(|_| {
        actix_web::error::ErrorBadRequest("Invalid base64 document content")
    })?;

    let current_hash = crypto::hash_document(&document_bytes);
    let tampered = current_hash != body.original_hash;

    let response = TamperCheckResponse {
        tampered,
        current_hash,
        original_hash: body.original_hash.clone(),
        checked_at: Utc::now(),
    };

    Ok(HttpResponse::Ok().json(response))
}
