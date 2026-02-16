use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};

type HmacSha256 = Hmac<Sha256>;

/// Generate SHA-256 hash of arbitrary bytes
pub fn sha256_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Generate HMAC-SHA256 tamper seal
pub fn generate_seal(document_hash: &str, signature_hash: &str, secret: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(document_hash.as_bytes());
    mac.update(signature_hash.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Verify HMAC-SHA256 tamper seal
pub fn verify_seal(
    document_hash: &str,
    signature_hash: &str,
    seal: &str,
    secret: &str,
) -> bool {
    let expected = generate_seal(document_hash, signature_hash, secret);
    // Constant-time comparison
    constant_time_eq(expected.as_bytes(), seal.as_bytes())
}

/// Constant-time byte comparison to prevent timing attacks
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_hash() {
        let hash = sha256_hash(b"hello world");
        assert_eq!(hash.len(), 64);
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn test_generate_and_verify_seal() {
        let doc_hash = "abc123";
        let sig_hash = "def456";
        let secret = "test-secret";

        let seal = generate_seal(doc_hash, sig_hash, secret);
        assert!(!seal.is_empty());
        assert!(verify_seal(doc_hash, sig_hash, &seal, secret));
    }

    #[test]
    fn test_tamper_detection() {
        let doc_hash = "abc123";
        let sig_hash = "def456";
        let secret = "test-secret";

        let seal = generate_seal(doc_hash, sig_hash, secret);

        // Tampered document hash should fail
        assert!(!verify_seal("tampered_hash", sig_hash, &seal, secret));
        // Tampered signature hash should fail
        assert!(!verify_seal(doc_hash, "tampered_sig", &seal, secret));
        // Wrong secret should fail
        assert!(!verify_seal(doc_hash, sig_hash, &seal, "wrong-secret"));
    }

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq(b"hello", b"hello"));
        assert!(!constant_time_eq(b"hello", b"world"));
        assert!(!constant_time_eq(b"hello", b"hell"));
    }
}
