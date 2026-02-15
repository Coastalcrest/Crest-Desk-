# ADR 0006: Rust for Cryptographic Services
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk's e-signature service handles legally binding document signing for real estate transactions — purchase agreements, disclosures, addenda, and closing documents. This service performs intensive cryptographic operations:

- PDF document hashing (SHA-256/SHA-512)
- Digital signature creation and verification (RSA-2048, ECDSA P-256)
- Certificate chain validation
- Tamper-evident audit trail generation
- Document encryption at rest (AES-256-GCM)

Additionally, a media encoding service processes listing photos and videos (watermarking, resizing, format conversion) with high throughput requirements.

These workloads are CPU-intensive and security-critical. The primary platform language (TypeScript/Node.js) has limitations:

1. **Single-threaded**: Node.js cannot fully utilize multi-core CPUs for CPU-bound cryptographic work without worker threads, which add complexity.
2. **Memory safety**: While Node.js itself is memory-safe, native C/C++ addons (often used for crypto performance) introduce memory safety risks.
3. **Performance**: Even with native addons, Node.js has overhead from the V8 runtime and garbage collection pauses.

Options evaluated:
1. **Go** — good performance, easy concurrency, but garbage collection pauses are undesirable for latency-sensitive crypto operations.
2. **C++** — maximum performance but memory safety issues are unacceptable for security-critical code.
3. **Rust** — zero-cost abstractions, memory safety without garbage collection, excellent cryptographic library ecosystem (ring, rustls).

## Decision
Use Rust with the Actix-web framework for the e-signature service (`esign-service`) and media encoder service (`media-encoder`). These services communicate with the rest of the platform via gRPC (using tonic).

- Cryptographic operations use the `ring` crate (audited, FIPS-capable) for core primitives and `rustls` for TLS.
- Document processing uses `lopdf` for PDF manipulation and `image` crate for media processing.
- Services expose gRPC endpoints defined in shared protobuf definitions (`packages/proto`).
- TypeScript services call Rust services via generated gRPC clients.
- Rust services are compiled to static binaries and deployed as minimal Docker containers (distroless base image).

## Consequences

**Positive:**
- Memory safety guaranteed by the Rust compiler — eliminates buffer overflows, use-after-free, and other memory vulnerabilities in security-critical code.
- No garbage collection pauses — predictable latency for cryptographic operations.
- Multi-threaded performance with Actix-web's actor model — fully utilizes multi-core CPUs.
- Small binary size and minimal runtime overhead — efficient container images (~20MB).
- The `ring` crate is well-audited and used in production by major projects (rustls, Cloudflare).
- Compile-time checks catch concurrency bugs that would be runtime errors in other languages.

**Negative:**
- Rust has a steep learning curve. Hiring Rust developers is harder and more expensive than TypeScript or Python developers.
- Compilation times are longer than TypeScript or Go, slowing down the development feedback loop. Mitigated with incremental compilation and `cargo-watch`.
- gRPC adds serialization overhead compared to in-process function calls. Acceptable given the network boundary between services.
- Two additional languages in the stack (Rust joins TypeScript and Python) increase cognitive overhead for the team.
- Debugging Rust services requires different tooling (lldb/gdb vs. Chrome DevTools for Node.js).
- Rust's async ecosystem (tokio) has different patterns than Node.js async/await, requiring developers to understand both models.
