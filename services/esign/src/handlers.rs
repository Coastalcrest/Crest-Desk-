use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::crypto;

pub struct AppState {
    pub seal_secret: String,
}

// ─── Health Check ──────────────────────────────────────────────────

pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "crestdesk-esign"
    }))
}

// ─── Signature Hash ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SignatureHashRequest {
    pub signature_image_base64: String,
}

#[derive(Serialize)]
pub struct SignatureHashResponse {
    pub signature_hash: String,
}

pub async fn generate_signature_hash(
    body: web::Json<SignatureHashRequest>,
) -> HttpResponse {
    let image_bytes = body.signature_image_base64.as_bytes();
    let hash = crypto::sha256_hash(image_bytes);
    HttpResponse::Ok().json(SignatureHashResponse {
        signature_hash: hash,
    })
}

// ─── Document Hash ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct DocumentHashRequest {
    pub document_bytes_base64: String,
}

#[derive(Serialize)]
pub struct DocumentHashResponse {
    pub document_hash: String,
}

pub async fn generate_document_hash(
    body: web::Json<DocumentHashRequest>,
) -> HttpResponse {
    let doc_bytes = body.document_bytes_base64.as_bytes();
    let hash = crypto::sha256_hash(doc_bytes);
    HttpResponse::Ok().json(DocumentHashResponse {
        document_hash: hash,
    })
}

// ─── Tamper Seal Generation ────────────────────────────────────────

#[derive(Deserialize)]
pub struct TamperSealRequest {
    pub document_hash: String,
    pub signature_hash: String,
}

#[derive(Serialize)]
pub struct TamperSealResponse {
    pub tamper_seal: String,
}

pub async fn generate_tamper_seal(
    state: web::Data<AppState>,
    body: web::Json<TamperSealRequest>,
) -> HttpResponse {
    let seal = crypto::generate_seal(
        &body.document_hash,
        &body.signature_hash,
        &state.seal_secret,
    );
    HttpResponse::Ok().json(TamperSealResponse { tamper_seal: seal })
}

// ─── Tamper Seal Verification ──────────────────────────────────────

#[derive(Deserialize)]
pub struct VerifySealRequest {
    pub document_hash: String,
    pub signature_hash: String,
    pub tamper_seal: String,
}

#[derive(Serialize)]
pub struct VerifySealResponse {
    pub valid: bool,
    pub tampering_detected: bool,
}

pub async fn verify_tamper_seal(
    state: web::Data<AppState>,
    body: web::Json<VerifySealRequest>,
) -> HttpResponse {
    let valid = crypto::verify_seal(
        &body.document_hash,
        &body.signature_hash,
        &body.tamper_seal,
        &state.seal_secret,
    );
    HttpResponse::Ok().json(VerifySealResponse {
        valid,
        tampering_detected: !valid,
    })
}

// ─── Certificate Hash ──────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CertificateHashRequest {
    pub certificate_data: String,
}

#[derive(Serialize)]
pub struct CertificateHashResponse {
    pub certificate_hash: String,
}

pub async fn generate_certificate_hash(
    body: web::Json<CertificateHashRequest>,
) -> HttpResponse {
    let hash = crypto::sha256_hash(body.certificate_data.as_bytes());
    HttpResponse::Ok().json(CertificateHashResponse {
        certificate_hash: hash,
    })
}
