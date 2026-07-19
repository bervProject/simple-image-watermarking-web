# Implementation Plan: Migrasi App Runner ke ECS ExpressGatewayService (Strategi Stack Baru)

## Overview

Strategi migrasi yang aman: membuat `SiwbEcsStack` sebagai stack baru terpisah di `infra/lib/siwb-ecs-stack.ts`, mendaftarkannya di `infra/bin/infra.ts` di samping `SiwbStack` yang sudah ada, dan menulis CDK assertion tests di `infra/test/siwb-ecs-stack.test.ts`. File `infra/lib/infra-stack.ts` (App Runner) **tidak diubah**.

## Tasks

- [x] 1. Buat `infra/lib/siwb-ecs-stack.ts` berisi class `SiwbEcsStack`
  - [x] 1.1 Buat file baru dengan class `SiwbEcsStack extends cdk.Stack`
    - Import `aws-cdk-lib`, `constructs`, `aws-cdk-lib/aws-ecr`, `aws-cdk-lib/aws-iam`
    - Tambah `CfnParameter imageTag` (type: String, description: 'Target tag')
    - Buat `executionRole` (ecs-tasks.amazonaws.com + AmazonECSTaskExecutionRolePolicy + grantPull)
    - Buat `infrastructureRole` (ecs.amazonaws.com)
    - Buat `taskRole` (ecs-tasks.amazonaws.com)
    - Buat `CfnResource` bertipe `AWS::ECS::ExpressGatewayService` dengan PascalCase properties
    - Buat `CfnOutput` menggunakan `cfnResource.getAtt('ServiceUrl').toString()`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1–3.5, 4.1, 4.2, 5.1, 5.2_

- [x] 2. Update `infra/bin/infra.ts` untuk mendaftarkan `SiwbEcsStack`
  - [x] 2.1 Tambah import `SiwbEcsStack` dari `'../lib/siwb-ecs-stack'`
    - Pertahankan semua instantiasi existing (`SiwbRepoStack`, `SiwbStack`) tanpa perubahan
    - Tambah `new SiwbEcsStack(app, 'SiwbEcsStack', {})` dengan komentar env yang sama
    - _Requirements: 6.1, 6.2_

- [x] 3. Update `infra/test/infra.test.ts`
  - [x] 3.1 Ganti test dummy SQS dengan placeholder yang valid
    - Hapus `test('SQS Queue Created', ...)` yang tidak relevan
    - Tambah `test('placeholder', ...)` dengan komentar yang menjelaskan intent
    - _Requirements: 7.1_

- [x] 4. Buat `infra/test/siwb-ecs-stack.test.ts` dengan CDK assertion tests
  - [x] 4.1 Setup test harness dan assert Property 1: Tidak ada App Runner resource
    - Inisialisasi `cdk.App` dan `SiwbEcsStack`, ambil `Template` dari stack
    - Assert `template.resourceCountIs('AWS::AppRunner::Service', 0)`
    - _Requirements: 7.2_

  - [x]* 4.2 Assert Property 2: Tiga IAM Role dengan principal yang benar
    - Assert `executionRole`: trust `ecs-tasks.amazonaws.com` + managed policy `AmazonECSTaskExecutionRolePolicy`
    - Assert `infrastructureRole`: trust `ecs.amazonaws.com`
    - Assert tepat 3 `AWS::IAM::Role` (`template.resourceCountIs`)
    - _Requirements: 7.4_

  - [x]* 4.3 Assert Property 3: ExecutionRole memiliki izin ECR pull
    - Assert `AWS::IAM::Policy` mengandung aksi ECR pull
    - _Requirements: 7.4_

  - [x]* 4.4 Assert Property 4: ExpressGatewayService dikonfigurasi dengan benar
    - Assert `resourceCountIs('AWS::ECS::ExpressGatewayService', 1)`
    - Assert `PrimaryContainer.Port === 8888`
    - Assert `PrimaryContainer.Image` mengandung referensi imageTag
    - Assert `ExecutionRoleArn`, `InfrastructureRoleArn`, `TaskRoleArn` menggunakan `Fn::GetAtt`
    - _Requirements: 7.3_

  - [x]* 4.5 Assert Property 5: imageTag parameter ada dengan tipe String
    - Assert `template.hasParameter('imageTag', { Type: 'String', Description: 'Target tag' })`
    - _Requirements: 7.5_

  - [x]* 4.6 Assert Property 6: Output menggunakan Fn::GetAtt ke ServiceUrl
    - Assert output mengandung `Fn::GetAtt` dengan atribut `ServiceUrl`
    - _Requirements: 7.6_

- [x] 5. Verifikasi TypeScript compile dan semua tests pass
  - `npm run build` di folder `infra/` — tidak ada TypeScript error
  - `npm test` di folder `infra/` — semua 12 tests pass (2 test suites)

## Notes

- Strategi stack baru menghindari risiko downtime yang ada jika `infra-stack.ts` dimodifikasi in-place
- `infra/lib/infra-stack.ts` tidak dimodifikasi (App Runner stack tetap aktif selama migrasi)
- CloudFormation properties pada `CfnResource` raw menggunakan PascalCase (berbeda dengan CDK L2 camelCase)
- `repo.grantPull()` otomatis menambah `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`
- Semua tasks sudah diimplementasikan dan verified

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 4, "tasks": ["5"] }
  ]
}
```
