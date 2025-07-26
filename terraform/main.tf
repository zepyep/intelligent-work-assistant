# Terraform 基础设施配置
# Infrastructure as Code for Intelligent Work Assistant

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket = "iwa-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# ================================
# Provider 配置
# ================================
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "intelligent-work-assistant"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "docker" {
  host = var.docker_host
}

# ================================
# 变量定义
# ================================
variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "docker_host" {
  description = "Docker host"
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "intelligent-assistant.com"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

# ================================
# 网络配置
# ================================
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "iwa-vpc-${var.environment}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "iwa-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "iwa-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "iwa-private-subnet-${count.index + 1}-${var.environment}"
    Type = "Private"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "iwa-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_nat_gateway" "main" {
  count = length(aws_subnet.public)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "iwa-nat-${count.index + 1}-${var.environment}"
  }
}

resource "aws_eip" "nat" {
  count = length(aws_subnet.public)

  domain = "vpc"

  tags = {
    Name = "iwa-eip-nat-${count.index + 1}-${var.environment}"
  }
}

resource "aws_route_table" "private" {
  count = length(aws_subnet.private)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "iwa-private-rt-${count.index + 1}-${var.environment}"
  }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ================================
# 安全组
# ================================
resource "aws_security_group" "web" {
  name_prefix = "iwa-web-${var.environment}-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "iwa-web-sg-${var.environment}"
  }
}

resource "aws_security_group" "database" {
  name_prefix = "iwa-database-${var.environment}-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MongoDB"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  ingress {
    description     = "Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  tags = {
    Name = "iwa-database-sg-${var.environment}"
  }
}

# ================================
# 应用负载均衡器
# ================================
resource "aws_lb" "main" {
  name               = "iwa-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  access_logs {
    bucket  = aws_s3_bucket.logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name = "iwa-alb-${var.environment}"
  }
}

resource "aws_lb_target_group" "app" {
  name     = "iwa-app-tg-${var.environment}"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "iwa-app-tg-${var.environment}"
  }
}

resource "aws_lb_listener" "app_http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "app_https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ================================
# SSL 证书
# ================================
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "iwa-cert-${var.environment}"
  }
}

# ================================
# Auto Scaling Group
# ================================
resource "aws_launch_template" "app" {
  name_prefix   = "iwa-app-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.main.key_name

  vpc_security_group_ids = [aws_security_group.web.id]

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    environment = var.environment
  }))

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_type           = "gp3"
      volume_size           = 50
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "iwa-app-${var.environment}"
    }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "iwa-asg-${var.environment}"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.environment == "production" ? 2 : 1
  max_size         = var.environment == "production" ? 6 : 2
  desired_capacity = var.environment == "production" ? 2 : 1

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "iwa-app-instance-${var.environment}"
    propagate_at_launch = true
  }
}

# ================================
# 数据库 (DocumentDB for MongoDB compatibility)
# ================================
resource "aws_docdb_subnet_group" "main" {
  name       = "iwa-docdb-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "iwa-docdb-subnet-group-${var.environment}"
  }
}

resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb4.0"
  name   = "iwa-docdb-params-${var.environment}"

  parameter {
    name  = "tls"
    value = "enabled"
  }
}

resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "iwa-docdb-cluster-${var.environment}"
  engine                  = "docdb"
  master_username         = "iwadmin"
  master_password         = random_password.docdb_password.result
  backup_retention_period = var.environment == "production" ? 7 : 1
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = var.environment != "production"
  
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.database.id]
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.main.arn

  tags = {
    Name = "iwa-docdb-cluster-${var.environment}"
  }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = var.environment == "production" ? 2 : 1
  identifier         = "iwa-docdb-instance-${count.index}-${var.environment}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.db_instance_class

  tags = {
    Name = "iwa-docdb-instance-${count.index}-${var.environment}"
  }
}

# ================================
# Redis (ElastiCache)
# ================================
resource "aws_elasticache_subnet_group" "main" {
  name       = "iwa-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "iwa-redis-subnet-group-${var.environment}"
  }
}

resource "aws_elasticache_replication_group" "main" {
  description          = "Redis cluster for IWA ${var.environment}"
  replication_group_id = "iwa-redis-${var.environment}"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
  
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.database.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token.result

  tags = {
    Name = "iwa-redis-${var.environment}"
  }
}

# ================================
# S3 存储
# ================================
resource "aws_s3_bucket" "app_storage" {
  bucket = "iwa-app-storage-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "iwa-app-storage-${var.environment}"
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "iwa-logs-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "iwa-logs-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.main.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ================================
# IAM 角色和策略
# ================================
resource "aws_iam_role" "app_role" {
  name = "iwa-app-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "iwa-app-profile-${var.environment}"
  role = aws_iam_role.app_role.name
}

resource "aws_iam_role_policy" "app_policy" {
  name = "iwa-app-policy-${var.environment}"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.app_storage.arn,
          "${aws_s3_bucket.app_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.app_secrets.arn
        ]
      }
    ]
  })
}

# ================================
# Secrets Manager
# ================================
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "iwa-app-secrets-${var.environment}"
  
  tags = {
    Name = "iwa-app-secrets-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    JWT_SECRET              = random_password.jwt_secret.result
    ENCRYPTION_SECRET       = random_password.encryption_secret.result
    MONGODB_URI            = "mongodb://${aws_docdb_cluster.main.master_username}:${aws_docdb_cluster.main.master_password}@${aws_docdb_cluster.main.endpoint}:27017/intelligent_work_assistant?tls=true&replicaSet=rs0&readPreference=secondaryPreferred"
    REDIS_URL              = "redis://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    OPENAI_API_KEY         = var.openai_api_key
    WECHAT_APP_ID          = var.wechat_app_id
    WECHAT_APP_SECRET      = var.wechat_app_secret
  })
}

# ================================
# KMS 密钥
# ================================
resource "aws_kms_key" "main" {
  description             = "KMS key for IWA ${var.environment}"
  deletion_window_in_days = 7

  tags = {
    Name = "iwa-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/iwa-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

# ================================
# 随机密码生成
# ================================
resource "random_password" "docdb_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_secret" {
  length  = 32
  special = false
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# ================================
# SSH 密钥对
# ================================
resource "tls_private_key" "main" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_key_pair" "main" {
  key_name   = "iwa-key-${var.environment}"
  public_key = tls_private_key.main.public_key_openssh

  tags = {
    Name = "iwa-key-${var.environment}"
  }
}

# ================================
# 数据源
# ================================
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ================================
# CloudWatch 警报
# ================================
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "iwa-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }
}

resource "aws_sns_topic" "alerts" {
  name = "iwa-alerts-${var.environment}"

  tags = {
    Name = "iwa-alerts-${var.environment}"
  }
}

# ================================
# 输出值
# ================================
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "database_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket for application storage"
  value       = aws_s3_bucket.app_storage.bucket
}

output "private_key" {
  description = "Private key for SSH access"
  value       = tls_private_key.main.private_key_pem
  sensitive   = true
}