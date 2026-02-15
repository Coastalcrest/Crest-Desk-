variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "CrestDesk"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
}

variable "backup_retention_days" {
  description = "Number of days to retain noncurrent backup versions before expiration"
  type        = number
  default     = 365
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
