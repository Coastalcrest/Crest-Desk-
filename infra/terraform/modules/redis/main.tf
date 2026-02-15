# CrestDesk ElastiCache Redis Module
#
# Creates an ElastiCache Redis cluster with private subnet placement
# and restricted security group access.

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70.0"
    }
  }
}

# ---------------------------------------------------------------------------
# Subnet Group
# ---------------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "main" {
  name       = "${lower(var.project)}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis-subnet-group"
  })
}

# ---------------------------------------------------------------------------
# Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.environment}-redis"
  description = "Security group for ${var.project} ${var.environment} ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_vpc" {
  security_group_id = aws_security_group.redis.id
  description       = "Allow Redis access from within the VPC"
  cidr_ipv4         = var.vpc_cidr
  from_port         = 6379
  to_port           = 6379
  ip_protocol       = "tcp"

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis-ingress"
  })
}

resource "aws_vpc_security_group_egress_rule" "redis_all" {
  security_group_id = aws_security_group.redis.id
  description       = "Allow all outbound traffic"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis-egress"
  })
}

# ---------------------------------------------------------------------------
# Parameter Group
# ---------------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "main" {
  name   = "${lower(var.project)}-${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis7-params"
  })
}

# ---------------------------------------------------------------------------
# ElastiCache Replication Group
# ---------------------------------------------------------------------------

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${lower(var.project)}-${var.environment}"
  description          = "${var.project} ${var.environment} Redis cluster"

  # Engine
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Topology
  num_cache_clusters   = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false
  multi_az_enabled           = var.num_cache_clusters > 1 ? true : false

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  port               = 6379

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = var.transit_encryption_enabled

  # Maintenance
  maintenance_window       = var.maintenance_window
  snapshot_retention_limit  = var.snapshot_retention_limit
  snapshot_window           = var.snapshot_window
  auto_minor_version_upgrade = true
  apply_immediately         = var.environment == "dev" ? true : false

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-redis"
  })
}
