# CrestDesk - Production Environment
#
# Production environment with production-grade sizing, high availability,
# enhanced monitoring, and deletion protection enabled.
#
# Usage:
#   terraform init
#   terraform plan -var-file="terraform.tfvars"
#   terraform apply -var-file="terraform.tfvars"

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CrestDesk"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# Local Values
# ---------------------------------------------------------------------------

locals {
  common_tags = {
    Project     = "CrestDesk"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
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

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  project              = "CrestDesk"
  environment          = var.environment
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  nat_gateway_count    = 2 # HA: one NAT per AZ in production

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# ECS Fargate Cluster
# ---------------------------------------------------------------------------

module "ecs" {
  source = "../../modules/ecs"

  project                    = "CrestDesk"
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  service_names              = var.ecs_service_names
  log_retention_days         = 90
  container_insights_enabled = true
  use_fargate_spot           = false # Standard Fargate for production reliability

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL
# ---------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  project            = "CrestDesk"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids

  instance_class               = "db.r6g.large"
  engine_version               = "16"
  allocated_storage            = 100
  max_allocated_storage        = 500
  db_name                      = var.db_name
  db_username                  = var.db_username
  multi_az                     = true # HA: Multi-AZ for production
  backup_retention_period      = 35   # Maximum retention
  performance_insights_enabled = true
  deletion_protection          = true

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# ElastiCache Redis
# ---------------------------------------------------------------------------

module "redis" {
  source = "../../modules/redis"

  project            = "CrestDesk"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids

  node_type                  = "cache.r6g.large"
  engine_version             = "7.1"
  num_cache_clusters         = 2 # Primary + replica for HA
  transit_encryption_enabled = true
  snapshot_retention_limit   = 7

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# S3 Buckets
# ---------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  project               = "crestdesk"
  environment           = var.environment
  backup_retention_days = 730 # 2 years for production compliance

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "rds_endpoint" {
  description = "RDS connection endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_secret_arn" {
  description = "ARN of the secret containing RDS master password"
  value       = module.rds.db_master_user_secret_arn
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.redis.primary_endpoint
}

output "documents_bucket" {
  description = "Documents S3 bucket name"
  value       = module.s3.documents_bucket_name
}

output "media_bucket" {
  description = "Media S3 bucket name"
  value       = module.s3.media_bucket_name
}

output "backups_bucket" {
  description = "Backups S3 bucket name"
  value       = module.s3.backups_bucket_name
}
