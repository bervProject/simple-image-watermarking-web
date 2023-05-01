import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class SiwbRepoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = new ecr.Repository(this, 'siwb-ecr', {
      repositoryName: 'siwb',
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      encryption: ecr.RepositoryEncryption.KMS,
      lifecycleRules: [
        {
          maxImageAge: cdk.Duration.days(7),
          rulePriority: 1,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    new cdk.CfnOutput(this, 'output-siwb-ecr', {
      value: repo.repositoryArn,
    });
  }
}
