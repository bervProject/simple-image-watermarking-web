import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SiwbEcsStack } from '../lib/siwb-ecs-stack';

describe('SiwbEcsStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App({
      context: {
        imageTag: 'test-tag',
      },
    });
    const stack = new SiwbEcsStack(app, 'TestSiwbEcsStack', {});
    template = Template.fromStack(stack);
  });

  test('Property 1: Tidak ada AWS::AppRunner::Service dalam template', () => {
    // SiwbEcsStack is the new separate stack; it must not contain any App Runner resources
    template.resourceCountIs('AWS::AppRunner::Service', 0);
  });

  test('Property 2a: executionRole trust ecs-tasks.amazonaws.com dengan managed policy AmazonECSTaskExecutionRolePolicy', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'ecs-tasks.amazonaws.com' },
          }),
        ]),
      },
      ManagedPolicyArns: Match.arrayWith([
        Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([
              Match.stringLikeRegexp('AmazonECSTaskExecutionRolePolicy'),
            ]),
          ]),
        }),
      ]),
    });
  });

  test('Property 2b: infrastructureRole trust ecs.amazonaws.com', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'ecs.amazonaws.com' },
          }),
        ]),
      },
    });
  });

  test('Property 2c: Terdapat tepat tiga AWS::IAM::Role', () => {
    template.resourceCountIs('AWS::IAM::Role', 3);
  });

  test('Property 3: executionRole memiliki izin ECR pull (via inline policy dari grantPull)', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'ecr:BatchCheckLayerAvailability',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchGetImage',
            ]),
          }),
        ]),
      },
    });
  });

  test('Property 4a: Tepat satu AWS::ECS::ExpressGatewayService', () => {
    template.resourceCountIs('AWS::ECS::ExpressGatewayService', 1);
  });

  test('Property 4b: ExpressGatewayService Port bernilai 8888', () => {
    template.hasResourceProperties('AWS::ECS::ExpressGatewayService', {
      PrimaryContainer: Match.objectLike({
        Port: 8888,
      }),
    });
  });

  test('Property 4c: ExpressGatewayService Image mengandung referensi ke imageTag parameter', () => {
    template.hasResourceProperties('AWS::ECS::ExpressGatewayService', {
      PrimaryContainer: Match.objectLike({
        Image: Match.objectLike({
          'Fn::Join': Match.anyValue(),
        }),
      }),
    });
  });

  test('Property 4d: ExecutionRoleArn, InfrastructureRoleArn, TaskRoleArn terdapat dalam ExpressGatewayService', () => {
    template.hasResourceProperties('AWS::ECS::ExpressGatewayService', {
      ExecutionRoleArn: Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
      InfrastructureRoleArn: Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
      TaskRoleArn: Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
    });
  });

  test('Property 5: imageTag parameter ada dengan tipe String dan deskripsi "Target tag"', () => {
    template.hasParameter('imageTag', {
      Type: 'String',
      Description: 'Target tag',
    });
  });

  test('Property 6: Output menggunakan Fn::GetAtt ke ServiceUrl pada ExpressGatewayService', () => {
    const outputs = template.findOutputs('*');
    const outputValues = Object.values(outputs);
    const hasServiceUrlOutput = outputValues.some((output) => {
      const value = (output as { Value: unknown }).Value;
      if (typeof value === 'object' && value !== null && 'Fn::GetAtt' in value) {
        const getAtt = (value as { 'Fn::GetAtt': string[] })['Fn::GetAtt'];
        return Array.isArray(getAtt) && getAtt[1] === 'ServiceUrl';
      }
      return false;
    });
    expect(hasServiceUrlOutput).toBe(true);
  });
});
