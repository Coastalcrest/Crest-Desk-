use std::path::Path;
use std::process::Command;

use crate::config::AppConfig;
use crate::error::MediaError;
use crate::models::{TrimConfig, VideoFormat, VideoResolution, WatermarkConfig};

/// Build and execute an FFmpeg command for video encoding.
pub fn encode_video(
    config: &AppConfig,
    input_path: &Path,
    output_path: &Path,
    target_format: &VideoFormat,
    resolution: Option<&VideoResolution>,
    bitrate: Option<&str>,
    watermark: Option<&WatermarkConfig>,
    trim: Option<&TrimConfig>,
) -> Result<u64, MediaError> {
    let mut cmd = Command::new(&config.ffmpeg_path);

    // Input
    cmd.arg("-i").arg(input_path);

    // Trim
    if let Some(trim) = trim {
        cmd.arg("-ss").arg(format!("{}", trim.start_seconds));
        if let Some(end) = trim.end_seconds {
            cmd.arg("-to").arg(format!("{}", end));
        }
    }

    // Resolution
    if let Some(res) = resolution {
        cmd.arg("-vf")
            .arg(format!("scale={}:{}", res.width, res.height));
    }

    // Bitrate
    if let Some(br) = bitrate {
        cmd.arg("-b:v").arg(br);
    }

    // Format-specific encoding
    match target_format {
        VideoFormat::Mp4 => {
            cmd.arg("-c:v").arg("libx264")
                .arg("-c:a").arg("aac")
                .arg("-movflags").arg("+faststart");
        }
        VideoFormat::Webm => {
            cmd.arg("-c:v").arg("libvpx-vp9")
                .arg("-c:a").arg("libopus");
        }
        VideoFormat::Hls => {
            cmd.arg("-c:v").arg("libx264")
                .arg("-c:a").arg("aac")
                .arg("-f").arg("hls")
                .arg("-hls_time").arg("10")
                .arg("-hls_list_size").arg("0");
        }
        VideoFormat::Mov => {
            cmd.arg("-c:v").arg("libx264")
                .arg("-c:a").arg("aac");
        }
    }

    // Watermark text overlay
    if let Some(wm) = watermark {
        if let Some(text) = &wm.text {
            let opacity = wm.opacity.unwrap_or(0.5);
            let position = match &wm.position {
                Some(crate::models::WatermarkPosition::TopLeft) => "x=10:y=10",
                Some(crate::models::WatermarkPosition::TopRight) => "x=w-tw-10:y=10",
                Some(crate::models::WatermarkPosition::BottomLeft) => "x=10:y=h-th-10",
                Some(crate::models::WatermarkPosition::Center) => "x=(w-tw)/2:y=(h-th)/2",
                _ => "x=w-tw-10:y=h-th-10", // BottomRight default
            };
            let drawtext = format!(
                "drawtext=text='{}':fontsize=24:fontcolor=white@{}:{}",
                text.replace('\'', "\\'"),
                opacity,
                position,
            );
            // Append to existing -vf or add new
            cmd.arg("-vf").arg(&drawtext);
        }
    }

    // Overwrite output
    cmd.arg("-y").arg(output_path);

    let output = cmd.output().map_err(|e| {
        MediaError::EncodingError(format!("Failed to run ffmpeg: {}", e))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(MediaError::EncodingError(format!(
            "FFmpeg exited with code {}: {}",
            output.status.code().unwrap_or(-1),
            stderr.chars().take(500).collect::<String>(),
        )));
    }

    // Return output file size
    let metadata = std::fs::metadata(output_path).map_err(|e| {
        MediaError::EncodingError(format!("Failed to read output file: {}", e))
    })?;

    Ok(metadata.len())
}

/// Probe media file for basic information.
pub fn probe_media(
    config: &AppConfig,
    input_path: &Path,
) -> Result<MediaProbeResult, MediaError> {
    let ffprobe_path = config.ffmpeg_path.replace("ffmpeg", "ffprobe");

    let output = Command::new(&ffprobe_path)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
        ])
        .arg(input_path)
        .output()
        .map_err(|e| {
            MediaError::EncodingError(format!("Failed to run ffprobe: {}", e))
        })?;

    if !output.status.success() {
        return Err(MediaError::EncodingError("ffprobe failed".into()));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let probe: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| {
        MediaError::EncodingError(format!("Failed to parse ffprobe output: {}", e))
    })?;

    let format = probe.get("format").cloned().unwrap_or_default();
    let streams = probe
        .get("streams")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();

    let video_stream = streams.iter().find(|s| {
        s.get("codec_type")
            .and_then(|v| v.as_str())
            .map(|t| t == "video")
            .unwrap_or(false)
    });

    let has_audio = streams.iter().any(|s| {
        s.get("codec_type")
            .and_then(|v| v.as_str())
            .map(|t| t == "audio")
            .unwrap_or(false)
    });

    Ok(MediaProbeResult {
        format_name: format
            .get("format_name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        duration_seconds: format
            .get("duration")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<f64>().ok()),
        file_size_bytes: format
            .get("size")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0),
        width: video_stream
            .and_then(|s| s.get("width"))
            .and_then(|v| v.as_u64())
            .map(|v| v as u32),
        height: video_stream
            .and_then(|s| s.get("height"))
            .and_then(|v| v.as_u64())
            .map(|v| v as u32),
        codec: video_stream
            .and_then(|s| s.get("codec_name"))
            .and_then(|v| v.as_str())
            .map(String::from),
        bitrate: format
            .get("bit_rate")
            .and_then(|v| v.as_str())
            .map(String::from),
        has_audio,
    })
}

pub struct MediaProbeResult {
    pub format_name: String,
    pub duration_seconds: Option<f64>,
    pub file_size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub codec: Option<String>,
    pub bitrate: Option<String>,
    pub has_audio: bool,
}
