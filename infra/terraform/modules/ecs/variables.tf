variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "CrestDesk"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ECS cluster and service discovery will be created"
  type        = string
}

variable "service_names" {
  description = "List of service names to create CloudWatch log groups for"
  type        = list(string)
  default     = ["api-gateway", "auth-service", "ticket-service", "notification-service", "analytics-service"]
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "container_insights_enabled" {
  description = "Enable Container Insights for the ECS cluster"
  type        = bool
  default     = false
}

variable "use_fargate_spot" {
  description = "Use Fargate Spot as the default capacity provider"
  type        = bool
  default     = false
}

variable "project_domain" {
  description = "Internal domain name for service discovery"
  type        = string
  default     = "crestdesk.local"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
