use actix_web::{web, App, HttpServer, middleware::Logger};

mod crypto;
mod handlers;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let port = std::env::var("ESIGN_PORT")
        .unwrap_or_else(|_| "8020".to_string())
        .parse::<u16>()
        .expect("ESIGN_PORT must be a number");

    let seal_secret = std::env::var("ESIGN_SEAL_SECRET")
        .unwrap_or_else(|_| "crestdesk-dev-seal-secret".to_string());

    let app_state = web::Data::new(handlers::AppState {
        seal_secret,
    });

    log::info!("CrestDesk E-Sign service listening on port {}", port);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(app_state.clone())
            .route("/health", web::get().to(handlers::health))
            .route("/api/signature/hash", web::post().to(handlers::generate_signature_hash))
            .route("/api/tamper-seal/generate", web::post().to(handlers::generate_tamper_seal))
            .route("/api/tamper-seal/verify", web::post().to(handlers::verify_tamper_seal))
            .route("/api/document/hash", web::post().to(handlers::generate_document_hash))
            .route("/api/certificate/hash", web::post().to(handlers::generate_certificate_hash))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
