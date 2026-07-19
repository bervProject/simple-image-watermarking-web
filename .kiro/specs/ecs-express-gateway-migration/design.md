# Design Document

## Migrasi AWS CDK: App Runner ke ECS ExpressGatewayService (Strategi Stack Baru)

## Overview

Migrasi ini menggunakan strategi **stack baru yang aman**: file `infra/lib/infra-stack.ts` (App Runner stack) **tidak dimodifikasi**, dan `SiwbEcsStack` baru dibuat di `infra/lib/siwb-ecs-stack.ts`. Kedua stack didaftarkan di `infra/bin/infra.ts` dan dapat jalan bersamaan. Ini menghilangkan risiko downtime yang ada jika stack yang sudah live dimodifikasi secara in-place.

---

## Architecture

### Strategi: Dual-Stack (Lama + Baru)

```
infra/bin/infra.ts
  ├── SiwbRepoStack      (tidak berubah)
  ├── SiwbStack          (App Runner — tidak berubah, dibiarkan tetap ada)
  └── SiwbEcsStack       ← BARU
        ├── CfnParameter: imageTag
        ├── ecr.Repository.fromRepositoryName('siwb')
        ├── iam.Role: executionRole
        │     ├── AssumedBy: ecs-tasks.amazonaws.com
        │     ├── ManagedPolicy: AmazonECSTaskExecutionRolePolicy
        │     └── repo.grantPull()
        ├── iam.Role: infrastructureRole
        │     └── AssumedBy: ecs.amazonaws.com
        ├── iam.Role: taskRole
        │     └── AssumedBy: ecs-tasks.amazonaws.com
        ├── cdk.CfnResource: AWS::ECS::ExpressGatewayService
        │     ├── ExecutionRoleArn → executionRole.roleArn
        │     ├── InfrastructureRoleArn → infrastructureRole.roleArn
        │     ├── TaskRoleArn → taskRole.roleArn
        │     └── PrimaryContainer:
        │           ├── Image: <ecr-uri>:<imageTag>
        │           └── Port: 8888
        └── CfnOutput: cfnResource.getAtt('ServiceUrl')
```

---

## Components

### 1. `infra/lib/siwb-ecs-stack.ts` (file baru)

Class `SiwbEcsStack extends cdk.Stack` berisi seluruh definisi resource ECS.

```typescript
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
```

**Catatan penting soal casing properti**: CloudFormation properties untuk `CfnResource` raw menggunakan PascalCase (`ExecutionRoleArn`, `InfrastructureRoleArn`, `TaskRoleArn`, `PrimaryContainer`, `Image`, `Port`), berbeda dengan CDK L2 yang menggunakan camelCase.

---

### 2. `infra/bin/infra.ts` (diupdate)

Menambahkan import dan instantiasi `SiwbEcsStack`. `SiwbStack` lama tidak dihapus.

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SiwbRepoStack } from '../lib/siwb-repo-stack';
import { SiwbStack } from '../lib/infra-stack';
import { SiwbEcsStack } from '../lib/siwb-ecs-stack';

const app = new cdk.App();
new SiwbRepoStack(app, 'SiwbRepoStack', {});
new SiwbStack(app, 'SiwbStack', {});
new SiwbEcsStack(app, 'SiwbEcsStack', {});
```

---

### 3. `infra/lib/infra-stack.ts` (tidak diubah)

File App Runner stack dibiarkan apa adanya selama periode migrasi. Tidak ada modifikasi.

---

### 4. IAM Roles

#### `executionRole`
Digunakan ECS runtime untuk pull image dan write logs.
- AssumedBy: `ecs-tasks.amazonaws.com`
- ManagedPolicy: `service-role/AmazonECSTaskExecutionRolePolicy`
- `repo.grantPull(executionRole)` menambah izin `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`

#### `infrastructureRole`
Digunakan ExpressGateway untuk mengelola infrastruktur pendukung.
- AssumedBy: `ecs.amazonaws.com`

#### `taskRole`
Diberikan ke container aplikasi untuk akses resource AWS saat runtime.
- AssumedBy: `ecs-tasks.amazonaws.com`

---

### 5. CfnResource: AWS::ECS::ExpressGatewayService

Resource utama menggunakan CDK L1 (`cdk.CfnResource`) karena belum ada L2 construct untuk tipe ini.

Properties (PascalCase sesuai CloudFormation raw schema):
- `ExecutionRoleArn` → `executionRole.roleArn`
- `InfrastructureRoleArn` → `infrastructureRole.roleArn`
- `TaskRoleArn` → `taskRole.roleArn`
- `PrimaryContainer.Image` → `${repo.repositoryUri}:${imageTag.valueAsString}`
- `PrimaryContainer.Port` → `8888`

---

### 6. CfnOutput Service URL

```typescript
new cdk.CfnOutput(this, 'output-siwb-ecs-url', {
  value: cfnResource.getAtt('ServiceUrl').toString(),
});
```

`cfnResource.getAtt('ServiceUrl')` menghasilkan `Fn::GetAtt` intrinsic function pada template CloudFormation.

---

## Data Models

Tidak ada data model runtime. Seluruh state adalah CloudFormation resources.

### CloudFormation Template Structure (SiwbEcsStack)

```json
{
  "Parameters": {
    "imageTag": { "Type": "String", "Description": "Target tag" }
  },
  "Resources": {
    "executionRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [{ "Principal": { "Service": "ecs-tasks.amazonaws.com" } }]
        },
        "ManagedPolicyArns": ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
      }
    },
    "infrastructureRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [{ "Principal": { "Service": "ecs.amazonaws.com" } }]
        }
      }
    },
    "taskRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [{ "Principal": { "Service": "ecs-tasks.amazonaws.com" } }]
        }
      }
    },
    "siwbExpressGateway": {
      "Type": "AWS::ECS::ExpressGatewayService",
      "Properties": {
        "ExecutionRoleArn": { "Fn::GetAtt": ["executionRole", "Arn"] },
        "InfrastructureRoleArn": { "Fn::GetAtt": ["infrastructureRole", "Arn"] },
        "TaskRoleArn": { "Fn::GetAtt": ["taskRole", "Arn"] },
        "PrimaryContainer": {
          "Image": { "Fn::Join": ["", ["<ecr-uri>:", { "Ref": "imageTag" }]] },
          "Port": 8888
        }
      }
    }
  },
  "Outputs": {
    "outputsiwbecsurl": {
      "Value": { "Fn::GetAtt": ["siwbExpressGateway", "ServiceUrl"] }
    }
  }
}
```

---

## Error Handling

### Mengapa Strategi Stack Baru Lebih Aman

Memodifikasi `infra-stack.ts` secara in-place akan menggantikan `AWS::AppRunner::Service` yang sudah live dengan `AWS::ECS::ExpressGatewayService`. CloudFormation akan mencoba delete App Runner service dan create ECS service dalam satu update — potensi downtime jika ECS service gagal create. Dengan membuat stack baru terpisah, App Runner stack tetap berjalan hingga ECS stack siap divalidasi.

### `getAtt` pada CfnResource

`cdk.CfnResource.getAtt()` mengembalikan `cdk.Reference` (bukan string literal). Memanggil `.toString()` menghasilkan representasi token CDK yang akan diselesaikan saat synth menjadi `Fn::GetAtt`. Ini perilaku yang benar untuk `CfnOutput`.

### ECR URI Construction

`repo.repositoryUri` pada `ecr.Repository.fromRepositoryName()` menggunakan pseudo-parameter CloudFormation (`AWS::AccountId`, `AWS::Region`) untuk membangun URI. Template bersifat environment-agnostic selama stack tidak di-scope ke akun/region tertentu.

---

## Files Changed

| File | Action |
|------|--------|
| `infra/lib/siwb-ecs-stack.ts` | BARU — berisi `SiwbEcsStack` |
| `infra/bin/infra.ts` | DIUPDATE — tambah `SiwbEcsStack` |
| `infra/test/siwb-ecs-stack.test.ts` | BARU — CDK assertion tests |
| `infra/test/infra.test.ts` | DIUPDATE — ganti SQS dummy test dengan placeholder |
| `infra/lib/infra-stack.ts` | TIDAK DIUBAH |
| `infra/lib/siwb-repo-stack.ts` | TIDAK DIUBAH |
| `infra/package.json` | TIDAK DIUBAH |

---

## Correctness Properties

> Properties diverifikasi menggunakan `aws-cdk-lib/assertions` (CDK Template assertions) di `infra/test/siwb-ecs-stack.test.ts`.

### Property 1: Tidak ada App Runner resource dalam template SiwbEcsStack

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, template tersebut SHALL NOT mengandung resource bertipe `AWS::AppRunner::Service`.

**Validates: Requirements 1.2**

---

### Property 2: Tiga IAM Role dengan principal yang benar

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, template tersebut SHALL mengandung tepat tiga `AWS::IAM::Role` resource:
- `executionRole`: trust `ecs-tasks.amazonaws.com` + managed policy `AmazonECSTaskExecutionRolePolicy`
- `infrastructureRole`: trust `ecs.amazonaws.com`
- `taskRole`: trust `ecs-tasks.amazonaws.com`

**Validates: Requirements 2.1, 2.2, 2.3**

---

### Property 3: ExecutionRole memiliki izin ECR pull

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, SHALL ada inline policy pada `executionRole` yang mengandung aksi ECR pull (`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:BatchCheckLayerAvailability`).

**Validates: Requirements 2.4**

---

### Property 4: ExpressGatewayService dikonfigurasi dengan benar

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, SHALL terdapat tepat satu resource bertipe `AWS::ECS::ExpressGatewayService` dengan:
- `ExecutionRoleArn`, `InfrastructureRoleArn`, `TaskRoleArn` mereferensikan ARN role yang benar
- `PrimaryContainer.Port` bernilai `8888`
- `PrimaryContainer.Image` mengandung referensi ke parameter `imageTag`

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2**

---

### Property 5: imageTag parameter ada dengan tipe String

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, bagian `Parameters` SHALL mengandung `imageTag` dengan tipe `String` dan deskripsi `Target tag`.

**Validates: Requirements 4.1**

---

### Property 6: Output URL menggunakan GetAtt pada ExpressGatewayService

*For any* synthesized CloudFormation template dari `SiwbEcsStack`, bagian `Outputs` SHALL mengandung output yang nilainya adalah `Fn::GetAtt` pada resource `AWS::ECS::ExpressGatewayService` dengan atribut `ServiceUrl`.

**Validates: Requirements 5.1, 5.2**
