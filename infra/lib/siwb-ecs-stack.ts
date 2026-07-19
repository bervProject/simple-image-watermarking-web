import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SiwbEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, 'siwb-ecr', 'siwb');

    const imageTag = new cdk.CfnParameter(this, 'imageTag', {
      type: 'String',
      description: 'Target tag',
    });

    const executionRole = new iam.Role(this, 'executionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });
    repo.grantPull(executionRole);

    const infrastructureRole = new iam.Role(this, 'infrastructureRole', {
      assumedBy: new iam.ServicePrincipal('ecs.amazonaws.com'),
    });

    const taskRole = new iam.Role(this, 'taskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const cfnResource = new cdk.CfnResource(this, 'siwb-express-gateway', {
      type: 'AWS::ECS::ExpressGatewayService',
      properties: {
        ExecutionRoleArn: executionRole.roleArn,
        InfrastructureRoleArn: infrastructureRole.roleArn,
        TaskRoleArn: taskRole.roleArn,
        PrimaryContainer: {
          Image: `${repo.repositoryUri}:${imageTag.valueAsString}`,
          Port: 8888,
        },
      },
    });

    new cdk.CfnOutput(this, 'output-siwb-ecs-url', {
      value: cfnResource.getAtt('ServiceUrl').toString(),
    });
  }
}
