import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';

export class SiwbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, 'siwb-ecr', 'siwb');

    const imageTag = new cdk.CfnParameter(this, 'imageTag', {
      type: 'String',
      description: 'Target tag',
    });

    const appRunner = new apprunner.Service(this, 'siwb-apprunner', {
      source: apprunner.Source.fromEcr({
        repository: repo,
        imageConfiguration: {
          port: 8888,
        },
        tagOrDigest: imageTag.valueAsString,
      }),
    });

    new cdk.CfnOutput(this, 'output-siwb-apprunner-url', {
      value: appRunner.serviceUrl,
    });
  }
}
