//! CrestDesk E-Signature Service
//!
//! Handles digital signature creation, verification, and tamper detection.
//! ESIGN Act and UETA compliant.

use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use tracing::info;

mod config;
mod crypto;
mod routes;
mod error;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);

    info!("Starting CrestDesk E-Sign service on {}", addr);

    HttpServer::new(|| {
        App::new()
            .route("/health", web::get().to(health_check))
            .service(
                web::scope("/api/v1/esign")
                    .route("/sign", web::post().to(routes::create_signature))
                    .route("/verify", web::post().to(routes::verify_signature))
                    .route("/tamper-check", web::post().to(routes::check_tamper))
            )
    })
    .bind(&addr)?
    .run()
    .await
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "crestdesk-esign"
    }))
}
