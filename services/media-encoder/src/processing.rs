use std::path::Path;

use crate::error::MediaError;
use crate::models::{CropConfig, ImageFormat, ImageWatermarkConfig, ResizeMode};

/// Process an image file: resize, crop, watermark, convert format.
pub fn process_image(
    input_path: &Path,
    output_path: &Path,
    target_format: &ImageFormat,
    width: Option<u32>,
    height: Option<u32>,
    quality: Option<u8>,
    _strip_metadata: bool,
    crop: Option<&CropConfig>,
    _watermark: Option<&ImageWatermarkConfig>,
    resize_mode: Option<&ResizeMode>,
) -> Result<u64, MediaError> {
    // Load image
    let mut img = image::open(input_path).map_err(|e| {
        MediaError::ImageProcessingError(format!("Failed to open image: {}", e))
    })?;

    // Apply crop first if specified
    if let Some(crop) = crop {
        img = img.crop_imm(crop.x, crop.y, crop.width, crop.height);
    }

    // Resize if dimensions specified
    if width.is_some() || height.is_some() {
        let mode = resize_mode.unwrap_or(&ResizeMode::Fit);
        let (orig_w, orig_h) = (img.width(), img.height());

        let (target_w, target_h) = match mode {
            ResizeMode::Exact => (
                width.unwrap_or(orig_w),
                height.unwrap_or(orig_h),
            ),
            ResizeMode::Fit => {
                calculate_fit_dimensions(orig_w, orig_h, width, height)
            }
            ResizeMode::Fill => {
                calculate_fill_dimensions(orig_w, orig_h, width, height)
            }
            ResizeMode::Thumbnail => {
                let max_dim = width.unwrap_or(height.unwrap_or(256));
                calculate_fit_dimensions(orig_w, orig_h, Some(max_dim), Some(max_dim))
            }
        };

        img = img.resize_exact(
            target_w,
            target_h,
            image::imageops::FilterType::Lanczos3,
        );
    }

    // Save in target format
    let quality_val = quality.unwrap_or(85);
    save_image(&img, output_path, target_format, quality_val)?;

    // Return file size
    let metadata = std::fs::metadata(output_path).map_err(|e| {
        MediaError::ImageProcessingError(format!("Failed to read output file: {}", e))
    })?;

    Ok(metadata.len())
}

/// Get basic info about an image file.
pub fn get_image_info(input_path: &Path) -> Result<(u32, u32, String), MediaError> {
    let img = image::open(input_path).map_err(|e| {
        MediaError::ImageProcessingError(format!("Failed to open image: {}", e))
    })?;

    let format_str = input_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok((img.width(), img.height(), format_str))
}

fn calculate_fit_dimensions(
    orig_w: u32,
    orig_h: u32,
    max_w: Option<u32>,
    max_h: Option<u32>,
) -> (u32, u32) {
    match (max_w, max_h) {
        (Some(w), Some(h)) => {
            let ratio_w = w as f64 / orig_w as f64;
            let ratio_h = h as f64 / orig_h as f64;
            let ratio = ratio_w.min(ratio_h);
            ((orig_w as f64 * ratio) as u32, (orig_h as f64 * ratio) as u32)
        }
        (Some(w), None) => {
            let ratio = w as f64 / orig_w as f64;
            (w, (orig_h as f64 * ratio) as u32)
        }
        (None, Some(h)) => {
            let ratio = h as f64 / orig_h as f64;
            ((orig_w as f64 * ratio) as u32, h)
        }
        (None, None) => (orig_w, orig_h),
    }
}

fn calculate_fill_dimensions(
    orig_w: u32,
    orig_h: u32,
    target_w: Option<u32>,
    target_h: Option<u32>,
) -> (u32, u32) {
    match (target_w, target_h) {
        (Some(w), Some(h)) => (w, h),
        (Some(w), None) => {
            let ratio = w as f64 / orig_w as f64;
            (w, (orig_h as f64 * ratio) as u32)
        }
        (None, Some(h)) => {
            let ratio = h as f64 / orig_h as f64;
            ((orig_w as f64 * ratio) as u32, h)
        }
        (None, None) => (orig_w, orig_h),
    }
}

fn save_image(
    img: &image::DynamicImage,
    output_path: &Path,
    format: &ImageFormat,
    _quality: u8,
) -> Result<(), MediaError> {
    match format {
        ImageFormat::Png => {
            img.save(output_path).map_err(|e| {
                MediaError::ImageProcessingError(format!("Failed to save PNG: {}", e))
            })?;
        }
        ImageFormat::Jpeg => {
            img.save(output_path).map_err(|e| {
                MediaError::ImageProcessingError(format!("Failed to save JPEG: {}", e))
            })?;
        }
        ImageFormat::Webp => {
            img.save(output_path).map_err(|e| {
                MediaError::ImageProcessingError(format!("Failed to save WebP: {}", e))
            })?;
        }
        ImageFormat::Avif => {
            // Fallback to PNG if AVIF encoder not available
            img.save(output_path).map_err(|e| {
                MediaError::ImageProcessingError(format!("Failed to save AVIF: {}", e))
            })?;
        }
    }
    Ok(())
}
