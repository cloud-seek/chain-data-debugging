# Chain Data Debugging

This AWS CDK project deploys a solution for moving records to more cost-efficient environments based on storage time. The main components include DynamoDB tables, Lambda functions, and IAM roles necessary to perform the operations.

## Project Structure

```
project-root/
├── bin/
├── lib/
├── lambda/
│   ├── handlerST.js
│   └── handler.js
├── node_modules/
├── test/
├── cdk.json
├── package.json
└── tsconfig.json
```

## Components

### DynamoDB Tables

Two DynamoDB tables are created:

1. **StandardTable**
    - TableName: `StandardTable`
    - Partition Key: `ID` (String)
    - Billing Mode: `PAY_PER_REQUEST`
    - Stream: `NEW_IMAGE`
    - TTL Attribute: `TTLDate`

2. **IATable**
    - TableName: `IATable`
    - Partition Key: `ID` (String)
    - Billing Mode: `PAY_PER_REQUEST`
    - Stream: `NEW_IMAGE`
    - TTL Attribute: `TTLDate`

### Lambda Functions

Two Lambda functions are defined to handle events from the DynamoDB streams:

1. **TTLStandardTrigger**
    - Runtime: Node.js 18.x
    - Handler: `handlerST.ttlStandardTrigger`
    - Code Path: `lambda` directory
    - Environment Variable: `BUCKET_NAME` set to `bucket-logs`
    - Trigger: DynamoDB stream from `StandardTable` with `TRIM_HORIZON` starting position and batch size of 1

2. **TTLIATrigger**
    - Runtime: Node.js 18.x
    - Handler: `handler.ttlIATrigger`
    - Code Path: `lambda` directory
    - Environment Variable: `BUCKET_NAME` set to `bucket-logs`
    - Trigger: DynamoDB stream from `IATable` with `TRIM_HORIZON` starting position and batch size of 1

### IAM Roles

Two IAM roles are created to manage the permissions for the Lambda functions:

1. **LambdaTTLTriggerRole**
    - RoleName: `LambdaTTLTriggerRole`
    - Permissions:
        - DynamoDB stream operations: `DescribeStream`, `GetRecords`, `GetShardIterator`, `ListStreams`
        - Lambda invoke operations: `InvokeFunction`
        - DynamoDB put operation: `PutItem`
    - Resources:
        - `StandardTable` and `IATable` ARNs and their stream ARNs

2. **LambdaTTLIARole**
    - RoleName: `LambdaTTLIARole`
    - Permissions:
        - DynamoDB stream operations: `DescribeStream`, `GetRecords`, `GetShardIterator`, `ListStreams`
        - S3 put operation: `PutObject`
    - Resources:
        - `IATable` ARNs and their stream ARNs
        - S3 bucket: `arn:aws:s3:::bucket-logs/*`

### Environment Configuration

The environment is configured with the following settings:

- Account ID: From environment variable `CDK_DEFAULT_ACCOUNT` or specified manually
- Region: From environment variable `CDK_DEFAULT_REGION` or specified as `us-east-1`
- Environment variables for Lambda: `BUCKET_NAME` set to `bucket-logs`

### CDK Deployment Commands

To synthesize and deploy the stack, use the following commands:

```bash
cdk bootstrap aws://<account-id>/<region> --profile XXXX
cdk synth --profile XXXX
cdk deploy --profile XXXX
```

Replace `<account-id>` with your AWS account ID and `<region>` with your preferred AWS region (e.g., `us-east-1`).

---

This documentation provides an overview of the deployed components and their configurations for the Chain Data Debugging CDK project.