//! Cryptographic operations for the E-Sign service.
//!
//! Provides Ed25519 digital signatures, AES-GCM encryption, and SHA-256 hashing
//! for document signing and tamper detection.

use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;
use sha2::{Sha256, Digest};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

use crate::error::EsignError;

/// Generate a new Ed25519 keypair.
///
/// Returns (signing_key_bytes, verifying_key_bytes) both base64-encoded.
pub fn generate_keypair() -> Result<(String, String), EsignError> {
    let mut csprng = rand::rngs::OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    Ok((
        BASE64.encode(signing_key.to_bytes()),
        BASE64.encode(verifying_key.to_bytes()),
    ))
}

/// Sign a document hash using Ed25519.
///
/// # Arguments
/// * `document_bytes` - Raw document bytes to sign
/// * `signing_key_b64` - Base64-encoded Ed25519 signing key
///
/// # Returns
/// Base64-encoded signature
pub fn sign_document(
    document_bytes: &[u8],
    signing_key_b64: &str,
) -> Result<String, EsignError> {
    let key_bytes = BASE64.decode(signing_key_b64)
        .map_err(|_| EsignError::InvalidKey("Invalid base64 signing key".into()))?;

    let key_array: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| EsignError::InvalidKey("Signing key must be 32 bytes".into()))?;

    let signing_key = SigningKey::from_bytes(&key_array);
    let signature = signing_key.sign(document_bytes);

    Ok(BASE64.encode(signature.to_bytes()))
}

/// Verify an Ed25519 signature against a document.
///
/// # Arguments
/// * `document_bytes` - Raw document bytes that were signed
/// * `signature_b64` - Base64-encoded signature to verify
/// * `verifying_key_b64` - Base64-encoded Ed25519 verifying (public) key
///
/// # Returns
/// `true` if the signature is valid, `false` otherwise
pub fn verify_signature(
    document_bytes: &[u8],
    signature_b64: &str,
    verifying_key_b64: &str,
) -> Result<bool, EsignError> {
    let sig_bytes = BASE64.decode(signature_b64)
        .map_err(|_| EsignError::InvalidSignature("Invalid base64 signature".into()))?;

    let key_bytes = BASE64.decode(verifying_key_b64)
        .map_err(|_| EsignError::InvalidKey("Invalid base64 verifying key".into()))?;

    let sig_array: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| EsignError::InvalidSignature("Signature must be 64 bytes".into()))?;

    let key_array: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| EsignError::InvalidKey("Verifying key must be 32 bytes".into()))?;

    let verifying_key = VerifyingKey::from_bytes(&key_array)
        .map_err(|e| EsignError::InvalidKey(format!("Invalid verifying key: {}", e)))?;

    let signature = Signature::from_bytes(&sig_array);

    Ok(verifying_key.verify(document_bytes, &signature).is_ok())
}

/// Compute SHA-256 hash of document bytes.
///
/// Returns hex-encoded hash string.
pub fn hash_document(document_bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(document_bytes);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Encrypt data using AES-256-GCM.
///
/// # Arguments
/// * `plaintext` - Data to encrypt
/// * `key_b64` - Base64-encoded 256-bit AES key
/// * `nonce_bytes` - 12-byte nonce (must be unique per encryption)
///
/// # Returns
/// Base64-encoded ciphertext
pub fn encrypt_aes_gcm(
    plaintext: &[u8],
    key_b64: &str,
    nonce_bytes: &[u8; 12],
) -> Result<String, EsignError> {
    let key_bytes = BASE64.decode(key_b64)
        .map_err(|_| EsignError::EncryptionError("Invalid base64 key".into()))?;

    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| EsignError::EncryptionError(format!("Invalid AES key: {}", e)))?;

    let nonce = Nonce::from_slice(nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext)
        .map_err(|e| EsignError::EncryptionError(format!("Encryption failed: {}", e)))?;

    Ok(BASE64.encode(ciphertext))
}

/// Decrypt data using AES-256-GCM.
///
/// # Arguments
/// * `ciphertext_b64` - Base64-encoded ciphertext
/// * `key_b64` - Base64-encoded 256-bit AES key
/// * `nonce_bytes` - 12-byte nonce used during encryption
///
/// # Returns
/// Decrypted plaintext bytes
pub fn decrypt_aes_gcm(
    ciphertext_b64: &str,
    key_b64: &str,
    nonce_bytes: &[u8; 12],
) -> Result<Vec<u8>, EsignError> {
    let ciphertext = BASE64.decode(ciphertext_b64)
        .map_err(|_| EsignError::EncryptionError("Invalid base64 ciphertext".into()))?;

    let key_bytes = BASE64.decode(key_b64)
        .map_err(|_| EsignError::EncryptionError("Invalid base64 key".into()))?;

    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| EsignError::EncryptionError(format!("Invalid AES key: {}", e)))?;

    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| EsignError::EncryptionError(format!("Decryption failed: {}", e)))?;

    Ok(plaintext)
}

// TODO: Add hex crate to Cargo.toml or use a local hex encoder
mod hex {
    pub fn encode(bytes: impl AsRef<[u8]>) -> String {
        bytes.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
    }
}
