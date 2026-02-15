variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-west-2"
}

variable "db_name" {
  description = "Name of the default database"
  type        = string
  default     = "crestdesk"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "crestdesk_admin"
}

variable "ecs_service_names" {
  description = "List of ECS service names for log group creation"
  type        = list(string)
  default     = [
    "api-gateway",
    "auth-service",
    "ticket-service",
    "notification-service",
    "analytics-service"
  ]
}
