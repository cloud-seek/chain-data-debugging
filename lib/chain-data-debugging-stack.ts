import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Tags } from 'aws-cdk-lib';

export class ChainDataDebuggingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define environment variables
    const environment = {
      BUCKET_NAME: 'bucket-logs',
      IATABLE_NAME: 'IATable'
    };

    // Create the DynamoDB tables
    const standardTable = new dynamodb.Table(this, 'StandardTable', {
      tableName: 'StandardTable',
      partitionKey: { name: 'ID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.OLD_IMAGE,
      timeToLiveAttribute: 'TTLDate',
    });

    const iaTable = new dynamodb.Table(this, 'IATable', {
      tableName: 'IATable',
      partitionKey: { name: 'ID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.OLD_IMAGE,
      timeToLiveAttribute: 'TTLDate',
    });

    // IAM Role for Lambda functions
    const lambdaTTLTriggerRole = new iam.Role(this, 'LambdaTTLTriggerRole', {
      roleName: 'LambdaTTLTriggerRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaTTLTriggerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:DescribeStream',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:ListStreams',
        'lambda:InvokeFunction',
        'dynamodb:PutItem',
      ],
      resources: [
        standardTable.tableArn,
        iaTable.tableArn,
        `${standardTable.tableArn}/stream/*`,
        `${iaTable.tableArn}/stream/*`,
      ],
    }));

    lambdaTTLTriggerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: ['*'],
    }));

    lambdaTTLTriggerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/TTLStandardTrigger:*`
      ],
    }));

    // Lambda function TTLStandardTrigger
    const ttlStandardTrigger = new lambda.Function(this, 'TTLStandardTrigger', {
      functionName: 'TTLStandardTrigger',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlerST.ttlStandardTrigger',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaTTLTriggerRole,
      environment,
    });

    ttlStandardTrigger.addEventSource(new event_sources.DynamoEventSource(standardTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 1,
    }));

    Tags.of(ttlStandardTrigger).add('FOCODAMB', 'POC');
    Tags.of(ttlStandardTrigger).add('FOCODAPP', 'POC');

    const ttlStandardLogGroup = new logs.LogGroup(this, 'TTLStandardTriggerLogGroup', {
      logGroupName: `/aws/lambda/${ttlStandardTrigger.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for Lambda functions interacting with S3
    const lambdaTTLIARole = new iam.Role(this, 'LambdaTTLIARole', {
      roleName: 'LambdaTTLIARole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaTTLIARole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:DescribeStream',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:ListStreams',
        's3:PutObject',
      ],
      resources: [
        iaTable.tableArn,
        `${iaTable.tableArn}/stream/*`,
        `arn:aws:s3:::bucket-logs/*`,
      ],
    }));

    lambdaTTLIARole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/TTLIATrigger:*`
      ],
    }));

    // Lambda function TTLIATrigger
    const ttlIATrigger = new lambda.Function(this, 'TTLIATrigger', {
      functionName: 'TTLIATrigger',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlerIA.ttlIATrigger',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaTTLIARole,
      environment,
    });

    ttlIATrigger.addEventSource(new event_sources.DynamoEventSource(iaTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 1,
    }));

    Tags.of(ttlIATrigger).add('FOCODAMB', 'POC');
    Tags.of(ttlIATrigger).add('FOCODAPP', 'POC');

    const ttlIALogGroup = new logs.LogGroup(this, 'TTLIATriggerLogGroup', {
      logGroupName: `/aws/lambda/${ttlIATrigger.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });


    // Output the bucket name
    new cdk.CfnOutput(this, 'BucketName', { value: environment.BUCKET_NAME });
  }
}

const app = new cdk.App();
new ChainDataDebuggingStack(app, 'ChainDataDebuggingStack', {
  env: { region: 'us-east-1', account: '149778226133' },
});
app.synth();
