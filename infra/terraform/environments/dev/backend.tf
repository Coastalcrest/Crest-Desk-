# CrestDesk Dev Environment - Remote State Backend
#
# Uncomment the backend configuration below after creating the S3 bucket
# and DynamoDB table for state management.
#
# To create the state bucket and lock table, run these AWS CLI commands:
#
#   aws s3api create-bucket \
#     --bucket crestdesk-terraform-state-dev \
#     --region us-west-2 \
#     --create-bucket-configuration LocationConstraint=us-west-2
#
#   aws s3api put-bucket-versioning \
#     --bucket crestdesk-terraform-state-dev \
#     --versioning-configuration Status=Enabled
#
#   aws s3api put-bucket-encryption \
#     --bucket crestdesk-terraform-state-dev \
#     --server-side-encryption-configuration \
#       '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"},"BucketKeyEnabled":true}]}'
#
#   aws s3api put-public-access-block \
#     --bucket crestdesk-terraform-state-dev \
#     --public-access-block-configuration \
#       BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
#
#   aws dynamodb create-table \
#     --table-name crestdesk-terraform-lock-dev \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-west-2

# terraform {
#   backend "s3" {
#     bucket         = "crestdesk-terraform-state-dev"
#     key            = "dev/terraform.tfstate"
#     region         = "us-west-2"
#     encrypt        = true
#     dynamodb_table = "crestdesk-terraform-lock-dev"
#   }
# }
