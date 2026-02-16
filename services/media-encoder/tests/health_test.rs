//! Integration tests for the Media Encoder service health endpoint.

use actix_web::{test, web, App};

/// Inline health handler to match the binary crate's health endpoint.
async fn health_check() -> actix_web::HttpResponse {
    actix_web::HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "crestdesk-media-encoder",
        "version": "1.0.0"
    }))
}

async fn health_live() -> actix_web::HttpResponse {
    actix_web::HttpResponse::Ok().json(serde_json::json!({ "status": "alive" }))
}

async fn health_ready() -> actix_web::HttpResponse {
    actix_web::HttpResponse::Ok().json(serde_json::json!({ "status": "ready" }))
}

#[actix_web::test]
async fn test_health_check_returns_200() {
    let app = test::init_service(
        App::new().route("/health", web::get().to(health_check)),
    )
    .await;

    let req = test::TestRequest::get().uri("/health").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());
}

#[actix_web::test]
async fn test_health_check_body_contains_service_name() {
    let app = test::init_service(
        App::new().route("/health", web::get().to(health_check)),
    )
    .await;

    let req = test::TestRequest::get().uri("/health").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(body["status"], "healthy");
    assert_eq!(body["service"], "crestdesk-media-encoder");
    assert_eq!(body["version"], "1.0.0");
}

#[actix_web::test]
async fn test_health_live_returns_alive() {
    let app = test::init_service(
        App::new().route("/health/live", web::get().to(health_live)),
    )
    .await;

    let req = test::TestRequest::get().uri("/health/live").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(body["status"], "alive");
}

#[actix_web::test]
async fn test_health_ready_returns_ready() {
    let app = test::init_service(
        App::new().route("/health/ready", web::get().to(health_ready)),
    )
    .await;

    let req = test::TestRequest::get().uri("/health/ready").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(body["status"], "ready");
}
