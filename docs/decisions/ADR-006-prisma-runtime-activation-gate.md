# ADR-006: Prisma Runtime Activation Gate

## Status

Accepted

## Context

指令037-041 已经证明 Event/Device 心跳链路在 fake delegate 下行为正确。下一阶段会逐步进入真实持久化接入，但当前仍存在以下风险：

1. `DevicePort` 真实 Prisma 实现受 ADR-005 约束，不能误把 `Device.secretHash` 当 HMAC key。
2. `EventModule` / `DeviceModule` / `AppModule` 目前故意不注册真实 adapter，下一步接入前需要明确门禁条件。
3. 执行文件已发生两次误覆盖，协作文件写入必须改为“先备份、再追加、再校验”的流程。

## Decision

### 1. AppModule 导入门禁

- **当前不允许**在 `AppModule` 中导入 `DeviceModule`、`EventModule` 或任何 `PrismaModule`。
- 只有当后续指令**显式授权**运行时，才允许将上述模块加入 `AppModule.imports`。
- 授权指令必须同时说明：是否允许该模块的 HTTP 路由上线、是否允许该模块调用真实数据库、是否允许该模块接入外部服务。

### 2. DeviceModule Provider 门禁

- **当前不允许**在 `DeviceModule` 中注册 `DEVICE_PORT` provider。
- **当前不允许**在 `DeviceModule` 中注册任何以 `PrismaDevice` 或 `DevicePrisma` 为前缀的 provider。
- **当前不允许**在 `DeviceModule` 中注册 `DEVICE_AUTH_PORT` provider。
- **当前不允许**任何代码直接读取 `Device.secretHash` 或 `verificationSecret` 字段用于 HMAC 验证。
- 真实 Device credential 持久化必须先解决 ADR-005 中提出的加密存储/KMS/新字段方案，且必须有独立指令授权。

### 3. EventModule Provider 门禁

- **当前不允许**在 `EventModule` 中注册 `EVENT_PORT` provider。
- **当前不允许**在 `EventModule` 中注册 `PrismaEventPort` provider。
- 真实 EventLog 接入可优先于 Device credential 接入，但必须满足：
  - 通过 `EventModule` 的 `providers` 数组显式注入 `EVENT_PORT`（provider token 方式）。
  - 必须有模块级白盒测试证明 provider wiring、failure behavior 与 lifecycle。
  - 必须由独立指令授权，且该指令必须说明是否允许连接数据库、是否允许 migrate/seed。

### 4. PrismaClient 实例化门禁

- **当前不允许**在 `apps/api/src` 的任何业务文件（service、controller、guard、interceptor）中 `import` 或 `new PrismaClient()`。
- `PrismaClient` 的真实实例化只能在后续明确指令中通过**单一 runtime adapter/provider 边界**进入。
- 该边界必须是：
  - 一个专门的 Prisma module 或 factory provider；
  - 不得散落在业务 service 或 controller 中；
  - 必须有边界守卫测试检测其存在。

### 5. 数据库连接指令显式授权规则

任何涉及真实数据库连接的后续指令必须显式说明以下四项，缺一不可：

| 授权项 | 说明 |
|--------|------|
| PrismaClient | 是否允许实例化 `PrismaClient` |
| 数据库连接 | 是否允许连接到真实 PostgreSQL 实例 |
| migrate | 是否允许运行 `prisma migrate` |
| seed | 是否允许运行 `prisma db seed` |

- **未显式允许则一律禁止**。
- 即使允许，也必须先通过 ADR-006 的 module/provider 门禁检查。

## Consequences

- **Positive:** 防止在 fake delegate 验证完成前过早接入真实数据库，避免数据污染或架构漂移。
- **Positive:** 强制每个持久化边界都有明确的 ADR 和白盒测试覆盖。
- **Positive:** `Device.secretHash` 与 HMAC key 的语义混淆在架构层面被阻断。
- **Negative:** 真实持久化接入需要额外的指令和审查周期，可能延长开发时间。

## Non-Goals

- 本 ADR 不修改 `prisma/schema.prisma`。
- 本 ADR 不运行 `prisma migrate`。
- 本 ADR 不连接真实数据库。
- 本 ADR 不实例化 `PrismaClient`。
- 本 ADR 不注册任何真实 adapter/provider。
- 本 ADR 不创建新的 Controller、HTTP 接口或外部服务调用。
