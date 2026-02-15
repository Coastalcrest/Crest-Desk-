# CrestDesk - Dev Environment
#
# Development environment using minimal instance sizes for cost savings.
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
# VPC
# ---------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  project             = "CrestDesk"
  environment         = var.environment
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  nat_gateway_count   = 1 # Single NAT for cost savings in dev

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
  log_retention_days         = 14 # Shorter retention for dev
  container_insights_enabled = false
  use_fargate_spot           = true # Use Spot for dev cost savings

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

  instance_class        = "db.t3.micro"
  engine_version        = "16"
  allocated_storage     = 20
  max_allocated_storage = 50
  db_name               = var.db_name
  db_username           = var.db_username
  multi_az              = false
  backup_retention_period = 7
  performance_insights_enabled = false
  deletion_protection          = false

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

  node_type                  = "cache.t3.micro"
  engine_version             = "7.1"
  num_cache_clusters         = 1
  transit_encryption_enabled = false
  snapshot_retention_limit   = 1

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# S3 Buckets
# ---------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  project               = "crestdesk"
  environment           = var.environment
  backup_retention_days = 90 # Shorter retention for dev

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
