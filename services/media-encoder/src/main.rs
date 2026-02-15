//! CrestDesk Media Encoder Service
//!
//! Handles video encoding and image processing for the CrestDesk platform.
//! Wraps FFmpeg for video transcoding and the `image` crate for image operations.

use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use tracing::info;

mod config;
mod routes;
mod error;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let addr = format!("0.0.0.0:{}", port);

    info!("Starting CrestDesk Media Encoder service on {}", addr);

    HttpServer::new(|| {
        App::new()
            .route("/health", web::get().to(health_check))
            .service(
                web::scope("/api/v1/media")
                    .route("/encode-video", web::post().to(routes::encode_video))
                    .route("/process-image", web::post().to(routes::process_image))
            )
    })
    .bind(&addr)?
    .run()
    .await
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "crestdesk-media-encoder"
    }))
}
