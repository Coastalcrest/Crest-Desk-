use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---- Video Encoding ---- //

#[derive(Debug, Deserialize)]
pub struct EncodeVideoRequest {
    pub source_url: String,
    pub target_format: VideoFormat,
    pub resolution: Option<VideoResolution>,
    pub bitrate: Option<String>,
    pub callback_url: Option<String>,
    pub watermark: Option<WatermarkConfig>,
    pub trim: Option<TrimConfig>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum VideoFormat {
    Mp4,
    Webm,
    Hls,
    Mov,
}

impl std::fmt::Display for VideoFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VideoFormat::Mp4 => write!(f, "mp4"),
            VideoFormat::Webm => write!(f, "webm"),
            VideoFormat::Hls => write!(f, "hls"),
            VideoFormat::Mov => write!(f, "mov"),
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VideoResolution {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct WatermarkConfig {
    pub image_url: Option<String>,
    pub text: Option<String>,
    pub position: Option<WatermarkPosition>,
    pub opacity: Option<f32>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum WatermarkPosition {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Center,
}

impl Default for WatermarkPosition {
    fn default() -> Self {
        WatermarkPosition::BottomRight
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct TrimConfig {
    pub start_seconds: f64,
    pub end_seconds: Option<f64>,
}

// ---- Image Processing ---- //

#[derive(Debug, Deserialize)]
pub struct ProcessImageRequest {
    pub source_url: String,
    pub target_format: ImageFormat,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub quality: Option<u8>,
    pub strip_metadata: Option<bool>,
    pub crop: Option<CropConfig>,
    pub watermark: Option<ImageWatermarkConfig>,
    pub resize_mode: Option<ResizeMode>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormat {
    Webp,
    Png,
    Jpeg,
    Avif,
}

impl std::fmt::Display for ImageFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImageFormat::Webp => write!(f, "webp"),
            ImageFormat::Png => write!(f, "png"),
            ImageFormat::Jpeg => write!(f, "jpeg"),
            ImageFormat::Avif => write!(f, "avif"),
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct CropConfig {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ImageWatermarkConfig {
    pub text: String,
    pub position: Option<WatermarkPosition>,
    pub font_size: Option<f32>,
    pub opacity: Option<f32>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum ResizeMode {
    Fit,
    Fill,
    Exact,
    Thumbnail,
}

impl Default for ResizeMode {
    fn default() -> Self {
        ResizeMode::Fit
    }
}

// ---- Batch Processing ---- //

#[derive(Debug, Deserialize)]
pub struct BatchProcessRequest {
    pub jobs: Vec<BatchJob>,
    pub callback_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum BatchJob {
    EncodeVideo(EncodeVideoRequest),
    ProcessImage(ProcessImageRequest),
}

// ---- Job Status ---- //

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Queued,
    Processing,
    Completed,
    Failed,
}

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JobStatus::Queued => write!(f, "queued"),
            JobStatus::Processing => write!(f, "processing"),
            JobStatus::Completed => write!(f, "completed"),
            JobStatus::Failed => write!(f, "failed"),
        }
    }
}

// ---- Responses ---- //

#[derive(Debug, Serialize)]
pub struct JobResponse {
    pub job_id: String,
    pub status: JobStatus,
    pub created_at: String,
    pub estimated_duration_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct JobStatusResponse {
    pub job_id: String,
    pub status: JobStatus,
    pub progress: Option<f32>,
    pub output_url: Option<String>,
    pub output_size_bytes: Option<u64>,
    pub error: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchJobResponse {
    pub batch_id: String,
    pub jobs: Vec<JobResponse>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct MediaInfoResponse {
    pub format: String,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub file_size_bytes: u64,
    pub codec: Option<String>,
    pub bitrate: Option<String>,
    pub has_audio: Option<bool>,
}

impl JobResponse {
    pub fn new_queued(estimated_ms: Option<u64>) -> Self {
        Self {
            job_id: Uuid::new_v4().to_string(),
            status: JobStatus::Queued,
            created_at: chrono::Utc::now().to_rfc3339(),
            estimated_duration_ms: estimated_ms,
        }
    }
}
