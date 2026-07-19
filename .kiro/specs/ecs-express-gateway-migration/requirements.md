# Requirements Document

## Introduction

Migrasi infrastruktur AWS CDK dari `apprunner.Service` (menggunakan `@aws-cdk/aws-apprunner-alpha`) ke `cdk.CfnResource` dengan tipe `AWS::ECS::ExpressGatewayService` dilakukan melalui **strategi stack baru yang aman**: membuat file `infra/lib/siwb-ecs-stack.ts` baru berisi class `SiwbEcsStack`, mendaftarkannya di `infra/bin/infra.ts` di samping `SiwbStack` yang lama, dan menulis test di `infra/test/siwb-ecs-stack.test.ts`. File `infra/lib/infra-stack.ts` (App Runner stack) **tidak dimodifikasi** selama periode migrasi untuk menghindari downtime.

## Glossary

- **SiwbEcsStack**: AWS CDK Stack baru di `infra/lib/siwb-ecs-stack.ts` yang mendefinisikan infrastruktur ECS ExpressGatewayService.
- **SiwbStack**: AWS CDK Stack lama di `infra/lib/infra-stack.ts` yang menggunakan App Runner — dipertahankan tanpa perubahan selama periode migrasi.
- **CfnResource**: Construct CDK level-rendah (`cdk.CfnResource`) yang merepresentasikan resource CloudFormation secara langsung.
- **ExpressGatewayService**: Resource CloudFormation bertipe `AWS::ECS::ExpressGatewayService` di dalam `SiwbEcsStack`.
- **executionRole**: IAM Role yang digunakan oleh ECS untuk menarik image dari ECR (`ecs-tasks.amazonaws.com`).
- **infrastructureRole**: IAM Role yang digunakan oleh ExpressGateway untuk mengelola infrastruktur pendukung service (`ecs.amazonaws.com`).
- **taskRole**: IAM Role yang diberikan kepada container aplikasi untuk akses resource AWS saat runtime (`ecs-tasks.amazonaws.com`).
- **imageTag**: `CfnParameter` bertipe String pada `SiwbEcsStack` yang menerima tag ECR image yang akan di-deploy.
- **ECR Repository**: Amazon Elastic Container Registry repository bernama `siwb` yang menyimpan image Docker aplikasi.
- **primaryContainer**: Properti wajib pada `AWS::ECS::ExpressGatewayService` yang mendefinisikan konfigurasi container utama.

## Requirements

### Requirement 1: Pembuatan Stack Baru SiwbEcsStack

**User Story:** As a developer, I want a new separate CDK stack (`SiwbEcsStack`) for ECS, so that migration can happen safely alongside the existing App Runner stack without causing downtime.

#### Acceptance Criteria

1. THE `infra/lib/siwb-ecs-stack.ts` SHALL dibuat sebagai file baru berisi class `SiwbEcsStack extends cdk.Stack`.
2. THE `SiwbEcsStack` SHALL NOT mengimpor atau menggunakan modul `@aws-cdk/aws-apprunner-alpha`.
3. THE `infra/lib/infra-stack.ts` (App Runner stack) SHALL NOT dimodifikasi selama periode migrasi.

---

### Requirement 2: Pembuatan IAM Roles di SiwbEcsStack

**User Story:** As a developer, I want three IAM roles created inside `SiwbEcsStack`, so that the ExpressGatewayService has the necessary permissions.

#### Acceptance Criteria

1. THE `SiwbEcsStack` SHALL membuat `executionRole` sebagai `iam.Role` dengan `assumedBy` principal `ecs-tasks.amazonaws.com` dan managed policy `AmazonECSTaskExecutionRolePolicy`.
2. THE `SiwbEcsStack` SHALL membuat `infrastructureRole` sebagai `iam.Role` dengan `assumedBy` principal `ecs.amazonaws.com`.
3. THE `SiwbEcsStack` SHALL membuat `taskRole` sebagai `iam.Role` dengan `assumedBy` principal `ecs-tasks.amazonaws.com`.
4. WHEN `executionRole` dibuat, THE `SiwbEcsStack` SHALL memberikan izin ECR pull pada `executionRole` agar dapat menarik image dari ECR repository `siwb`.

---

### Requirement 3: Pembuatan ExpressGatewayService via CfnResource

**User Story:** As a developer, I want `SiwbEcsStack` to deploy an `AWS::ECS::ExpressGatewayService` resource, so that the new ECS-based service type is provisioned via CloudFormation.

#### Acceptance Criteria

1. THE `SiwbEcsStack` SHALL membuat satu `cdk.CfnResource` dengan `type` bernilai `AWS::ECS::ExpressGatewayService`.
2. THE `SiwbEcsStack` SHALL menetapkan properti `ExecutionRoleArn` pada CfnResource menggunakan ARN dari `executionRole`.
3. THE `SiwbEcsStack` SHALL menetapkan properti `InfrastructureRoleArn` pada CfnResource menggunakan ARN dari `infrastructureRole`.
4. THE `SiwbEcsStack` SHALL menetapkan properti `PrimaryContainer` dengan `Image` dari ECR repository `siwb` menggunakan `imageTag.valueAsString` sebagai tag, dan `Port` bernilai `8888`.
5. THE `SiwbEcsStack` SHALL menetapkan properti `TaskRoleArn` pada CfnResource menggunakan ARN dari `taskRole`.

---

### Requirement 4: Konfigurasi imageTag Parameter

**User Story:** As a developer, I want `SiwbEcsStack` to accept an `imageTag` CloudFormation parameter, so that the deployment pipeline can specify which image tag to deploy.

#### Acceptance Criteria

1. THE `SiwbEcsStack` SHALL memiliki `CfnParameter` bernama `imageTag` dengan tipe `String` dan deskripsi `Target tag`.
2. WHEN CfnResource ExpressGatewayService dibuat, THE `SiwbEcsStack` SHALL menggunakan `imageTag.valueAsString` sebagai nilai tag image container.

---

### Requirement 5: Output URL Service

**User Story:** As a developer, I want `SiwbEcsStack` to output the service URL, so that the deployment pipeline can retrieve the endpoint of the deployed service.

#### Acceptance Criteria

1. THE `SiwbEcsStack` SHALL membuat `CfnOutput` yang mengambil nilai URL service dari attribute `GetAtt` pada CfnResource ExpressGatewayService.
2. THE `SiwbEcsStack` SHALL menggunakan `cfnResource.getAtt('ServiceUrl').toString()` untuk mendapatkan URL service.

---

### Requirement 6: Pendaftaran SiwbEcsStack di bin/infra.ts

**User Story:** As a developer, I want `SiwbEcsStack` registered in `bin/infra.ts` alongside the existing stacks, so that CDK can synthesize and deploy both stacks independently.

#### Acceptance Criteria

1. THE `infra/bin/infra.ts` SHALL mengimpor dan menginstansiasi `SiwbEcsStack` dengan ID `'SiwbEcsStack'`.
2. THE `infra/bin/infra.ts` SHALL mempertahankan instantiasi `SiwbStack` dan `SiwbRepoStack` yang sudah ada tanpa perubahan.

---

### Requirement 7: Test Coverage untuk SiwbEcsStack

**User Story:** As a developer, I want CDK assertion tests for `SiwbEcsStack`, so that all structural properties of the new stack are verified automatically.

#### Acceptance Criteria

1. THE `infra/test/siwb-ecs-stack.test.ts` SHALL dibuat dengan test menggunakan `aws-cdk-lib/assertions`.
2. THE test SHALL memverifikasi tidak ada `AWS::AppRunner::Service` dalam template `SiwbEcsStack`.
3. THE test SHALL memverifikasi tepat satu `AWS::ECS::ExpressGatewayService` ada dalam template.
4. THE test SHALL memverifikasi terdapat tepat tiga `AWS::IAM::Role` dengan principal yang benar.
5. THE test SHALL memverifikasi parameter `imageTag` ada dengan tipe `String`.
6. THE test SHALL memverifikasi output menggunakan `Fn::GetAtt` ke `ServiceUrl`.
