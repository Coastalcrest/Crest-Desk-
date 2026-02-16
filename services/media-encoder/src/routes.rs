//! Route handlers for the Media Encoder service API.
//!
//! Provides endpoints for video encoding, image processing, batch operations,
//! job status tracking, and media info probing.

use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::config::AppConfig;
use crate::error::MediaError;
use crate::jobs::JobStore;
use crate::models::*;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/media")
            .route("/encode-video", web::post().to(encode_video))
            .route("/process-image", web::post().to(process_image))
            .route("/batch", web::post().to(batch_process))
            .route("/jobs/{job_id}", web::get().to(get_job_status))
            .route("/jobs", web::get().to(list_jobs))
            .route("/info", web::post().to(get_media_info)),
    );
}

/// POST /api/v1/media/encode-video
async fn encode_video(
    body: web::Json<EncodeVideoRequest>,
    job_store: web::Data<JobStore>,
    _config: web::Data<AppConfig>,
) -> Result<HttpResponse, MediaError> {
    // Validate source URL
    if body.source_url.is_empty() {
        return Err(MediaError::SourceNotFound("Source URL is required".into()));
    }

    // Create job
    let job_id = job_store.create_job();

    tracing::info!(
        job_id = %job_id,
        source = %body.source_url,
        format = %body.target_format,
        "Video encoding job submitted"
    );

    // In production, this would spawn an async task to:
    // 1. Download source from URL
    // 2. Run FFmpeg encoding via crate::encoding::encode_video
    // 3. Upload result to object storage
    // 4. Update job status
    // 5. Call callback_url if provided
    //
    // For now, we queue the job and return immediately.

    // Estimate duration based on format
    let estimated_ms = match body.target_format {
        VideoFormat::Mp4 => Some(30_000),
        VideoFormat::Webm => Some(60_000),
        VideoFormat::Hls => Some(45_000),
        VideoFormat::Mov => Some(25_000),
    };

    let response = JobResponse {
        job_id,
        status: JobStatus::Queued,
        created_at: chrono::Utc::now().to_rfc3339(),
        estimated_duration_ms: estimated_ms,
    };

    Ok(HttpResponse::Accepted().json(response))
}

/// POST /api/v1/media/process-image
async fn process_image(
    body: web::Json<ProcessImageRequest>,
    job_store: web::Data<JobStore>,
    _config: web::Data<AppConfig>,
) -> Result<HttpResponse, MediaError> {
    if body.source_url.is_empty() {
        return Err(MediaError::SourceNotFound("Source URL is required".into()));
    }

    // Validate quality range
    if let Some(q) = body.quality {
        if q > 100 {
            return Err(MediaError::UnsupportedFormat(
                "Quality must be between 0 and 100".into(),
            ));
        }
    }

    let job_id = job_store.create_job();

    tracing::info!(
        job_id = %job_id,
        source = %body.source_url,
        format = %body.target_format,
        "Image processing job submitted"
    );

    let response = JobResponse {
        job_id,
        status: JobStatus::Queued,
        created_at: chrono::Utc::now().to_rfc3339(),
        estimated_duration_ms: Some(5_000),
    };

    Ok(HttpResponse::Accepted().json(response))
}

/// POST /api/v1/media/batch
async fn batch_process(
    body: web::Json<BatchProcessRequest>,
    job_store: web::Data<JobStore>,
) -> Result<HttpResponse, MediaError> {
    if body.jobs.is_empty() {
        return Err(MediaError::UnsupportedFormat(
            "At least one job is required".into(),
        ));
    }

    if body.jobs.len() > 20 {
        return Err(MediaError::UnsupportedFormat(
            "Maximum 20 jobs per batch".into(),
        ));
    }

    let batch_id = Uuid::new_v4().to_string();
    let mut job_responses = Vec::new();

    for _job in &body.jobs {
        let job_id = job_store.create_job();
        job_responses.push(JobResponse {
            job_id,
            status: JobStatus::Queued,
            created_at: chrono::Utc::now().to_rfc3339(),
            estimated_duration_ms: Some(10_000),
        });
    }

    let total = job_responses.len();
    let response = BatchJobResponse {
        batch_id,
        jobs: job_responses,
        total,
    };

    Ok(HttpResponse::Accepted().json(response))
}

/// GET /api/v1/media/jobs/{job_id}
async fn get_job_status(
    path: web::Path<String>,
    job_store: web::Data<JobStore>,
) -> Result<HttpResponse, MediaError> {
    let job_id = path.into_inner();

    match job_store.get_status(&job_id) {
        Some(status) => Ok(HttpResponse::Ok().json(status)),
        None => Err(MediaError::SourceNotFound(format!(
            "Job {} not found",
            job_id
        ))),
    }
}

/// GET /api/v1/media/jobs
async fn list_jobs(
    job_store: web::Data<JobStore>,
    req: HttpRequest,
) -> Result<HttpResponse, MediaError> {
    let query_map: std::collections::HashMap<String, String> =
        web::Query::<std::collections::HashMap<String, String>>::from_query(req.query_string())
            .map(|q| q.into_inner())
            .unwrap_or_default();

    let limit: usize = query_map
        .get("limit")
        .and_then(|v| v.parse().ok())
        .unwrap_or(50)
        .min(100);

    let jobs = job_store.list_jobs(limit);
    let total = jobs.len();
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "jobs": jobs,
        "total": total,
    })))
}

/// POST /api/v1/media/info
async fn get_media_info(
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, MediaError> {
    let source_url = body
        .get("source_url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| MediaError::SourceNotFound("source_url is required".into()))?;

    if source_url.is_empty() {
        return Err(MediaError::SourceNotFound(
            "source_url cannot be empty".into(),
        ));
    }

    // In production, download file and probe with ffprobe
    // For now, return placeholder info
    let info = MediaInfoResponse {
        format: "unknown".to_string(),
        duration_seconds: None,
        width: None,
        height: None,
        file_size_bytes: 0,
        codec: None,
        bitrate: None,
        has_audio: None,
    };

    Ok(HttpResponse::Ok().json(info))
}
