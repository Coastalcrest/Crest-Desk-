# CrestDesk Infrastructure - Root Module
#
# This file serves as the root module reference. Actual deployments
# are managed through environment-specific configurations in:
#   environments/dev/main.tf
#   environments/staging/main.tf
#   environments/production/main.tf
#
# Usage:
#   cd environments/dev
#   terraform init
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70.0"
    }
  }
}

locals {
  common_tags = {
    Project     = "CrestDesk"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

variable "environment" {
  description = "The deployment environment (dev, staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-west-2"
}
