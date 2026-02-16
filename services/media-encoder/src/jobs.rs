use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

use crate::models::{JobStatus, JobStatusResponse};

/// In-memory job store for tracking encoding/processing jobs.
pub struct JobStore {
    jobs: Mutex<HashMap<String, JobRecord>>,
}

struct JobRecord {
    id: String,
    status: JobStatus,
    progress: Option<f32>,
    output_url: Option<String>,
    output_size_bytes: Option<u64>,
    error: Option<String>,
    created_at: String,
    completed_at: Option<String>,
}

impl JobStore {
    pub fn new() -> Self {
        Self {
            jobs: Mutex::new(HashMap::new()),
        }
    }

    pub fn create_job(&self) -> String {
        let id = Uuid::new_v4().to_string();
        let record = JobRecord {
            id: id.clone(),
            status: JobStatus::Queued,
            progress: Some(0.0),
            output_url: None,
            output_size_bytes: None,
            error: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
        };
        self.jobs.lock().expect("JobStore lock poisoned").insert(id.clone(), record);
        id
    }

    pub fn update_status(&self, job_id: &str, status: JobStatus, progress: Option<f32>) {
        if let Some(job) = self.jobs.lock().expect("JobStore lock poisoned").get_mut(job_id) {
            job.status = status;
            if let Some(p) = progress {
                job.progress = Some(p);
            }
        }
    }

    pub fn complete_job(&self, job_id: &str, output_url: String, size_bytes: u64) {
        if let Some(job) = self.jobs.lock().expect("JobStore lock poisoned").get_mut(job_id) {
            job.status = JobStatus::Completed;
            job.progress = Some(100.0);
            job.output_url = Some(output_url);
            job.output_size_bytes = Some(size_bytes);
            job.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }

    pub fn fail_job(&self, job_id: &str, error: String) {
        if let Some(job) = self.jobs.lock().expect("JobStore lock poisoned").get_mut(job_id) {
            job.status = JobStatus::Failed;
            job.error = Some(error);
            job.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }

    pub fn get_status(&self, job_id: &str) -> Option<JobStatusResponse> {
        self.jobs.lock().expect("JobStore lock poisoned").get(job_id).map(|job| JobStatusResponse {
            job_id: job.id.clone(),
            status: job.status.clone(),
            progress: job.progress,
            output_url: job.output_url.clone(),
            output_size_bytes: job.output_size_bytes,
            error: job.error.clone(),
            created_at: job.created_at.clone(),
            completed_at: job.completed_at.clone(),
        })
    }

    pub fn list_jobs(&self, limit: usize) -> Vec<JobStatusResponse> {
        self.jobs
            .lock()
            .expect("JobStore lock poisoned")
            .values()
            .take(limit)
            .map(|job| JobStatusResponse {
                job_id: job.id.clone(),
                status: job.status.clone(),
                progress: job.progress,
                output_url: job.output_url.clone(),
                output_size_bytes: job.output_size_bytes,
                error: job.error.clone(),
                created_at: job.created_at.clone(),
                completed_at: job.completed_at.clone(),
            })
            .collect()
    }
}

impl Default for JobStore {
    fn default() -> Self {
        Self::new()
    }
}
