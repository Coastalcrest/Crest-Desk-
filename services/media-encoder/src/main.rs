//! CrestDesk Media Encoder Service
//!
//! Handles video encoding and image processing for the CrestDesk platform.
//! Wraps FFmpeg for video transcoding and the `image` crate for image operations.

use actix_web::{web, App, HttpServer, HttpResponse};
use tracing_subscriber::EnvFilter;

mod config;
mod encoding;
mod error;
mod jobs;
mod models;
mod processing;
mod routes;

use config::AppConfig;
use jobs::JobStore;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = AppConfig::from_env();
    let port = config.port;

    // Create temp directory
    std::fs::create_dir_all(&config.temp_dir).ok();

    let job_store = web::Data::new(JobStore::new());
    let config_data = web::Data::new(config);

    tracing::info!("Starting CrestDesk Media Encoder on port {}", port);

    HttpServer::new(move || {
        App::new()
            .app_data(job_store.clone())
            .app_data(config_data.clone())
            .route("/health", web::get().to(health))
            .route("/health/live", web::get().to(health_live))
            .route("/health/ready", web::get().to(health_ready))
            .configure(routes::configure)
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "crestdesk-media-encoder",
        "version": "1.0.0"
    }))
}

async fn health_live() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({ "status": "alive" }))
}

async fn health_ready() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({ "status": "ready" }))
}
