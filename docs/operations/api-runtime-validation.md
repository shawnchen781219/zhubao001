---

## 指令054 DevicePersistenceModule dormant wiring

**验证时间:** 2026-06-02 16:51 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增 dormant 设备持久化 wiring 模块：**
   - 新增 `apps/api/src/modules/device/device-persistence.module.ts`。
   - `DevicePersistenceModule` 只 `imports: [PrismaRuntimeModule]`。
   - 只注册一个 `DEVICE_PORT` provider。
   - provider 通过 `inject: [PRISMA_CLIENT]` 将 Prisma runtime client delegate wiring 到 `new PrismaDevicePort(client)`。
   - `exports` 只导出 `DEVICE_PORT`。

2. **新增 metadata 白盒测试：**
   - 新增 `apps/api/test/device-persistence.module.spec.ts`。
   - 使用 `MODULE_METADATA` + `Reflect.getMetadata(...)` 检查真实 Nest metadata。
   - 断言 imports/providers/exports 均为精确集合。
   - 断言 `DEVICE_PORT` factory 精确注入 `[PRISMA_CLIENT]`。
   - 通过读取 module source 验证 factory 构造 `PrismaDevicePort`。
   - 测试不执行 provider factory，不创建 Nest application context，不实例化真实 Prisma runtime，不调用 `$connect()`。

3. **边界守卫增强：**
   - `boundary-guard.spec.ts` 新增 AppModule 不得导入 `DevicePersistenceModule` 的断言。
   - `DEVICE_PORT` / `PrismaDevicePort` 的生产 module 注册语义只允许出现在 `device-persistence.module.ts`。
   - 既有 Event persistence 与 DeviceAuth persistence 守卫保持不变。

4. **文档更新：**
   - `apps/api/src/modules/device/README.md` 明确 `DevicePersistenceModule` 是 dormant wiring module。
   - 明确该 module 不应被 AppModule/DeviceModule 或任何运行时业务 module 导入，除非后续明确激活。
   - 明确设备注册持久化仍未实现。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 18 files, 197 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 89 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `DEVICE_PORT` / `PrismaDevicePort` 生产注册语义只出现在 `device-persistence.module.ts`；`new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；DeviceModule/AppModule 注册未变；未发现 migrate/seed、Redis client、对象存储 SDK、AI SDK、微信 SDK runtime 接入 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts` 的 imports/providers/exports。
- 未将 `DevicePersistenceModule` 导入 AppModule、DeviceModule 或任何运行时业务模块。
- 未执行 provider factory，未创建 Nest application context，未触发真实 Prisma runtime。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 到新 module 或 spec。
- 未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。
- 未修改 `DeviceService`、`DeviceController`、`DeviceAuthGuard` 或任何业务逻辑。
- 未实现真实设备注册、secret 生成/哈希、HMAC 校验变更。

---

## 指令053 PrismaDevicePort heartbeat adapter contract

**验证时间:** 2026-06-02 13:14 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增设备心跳写入侧 Prisma adapter 最小骨架：**
   - 新增 `apps/api/src/modules/device/device.prisma-adapter.ts`。
   - 导出最小 Prisma-shaped `DeviceDelegate`，只暴露本条需要的 `device.findUnique` 与 `device.update`。
   - 导出 `PrismaDevicePort implements DevicePort`。
   - `acceptHeartbeat(input)` 对 deviceId 先 trim；空白输入抛 `VALIDATION_FAILED` 400。
   - ACTIVE 设备会先查询 `id/storeId/status`，再只更新 `lastHeartbeatAt`，返回 `{ serverTime, status, storeId }`。
   - not found 抛 `DEVICE_NOT_FOUND` 404；非 ACTIVE 抛 `DEVICE_NOT_ACTIVE` 403 且不调用 update。
   - `assertActiveDevice(deviceId, traceId)` 覆盖空白、not found、非 ACTIVE、ACTIVE 正常路径，不更新 heartbeat。
   - `registerDevice(input)` 明确抛 `SERVICE_UNAVAILABLE` 503，说明 registration persistence 尚未实现。

2. **新增 adapter 契约测试：**
   - 新增 `apps/api/test/device.prisma-adapter.spec.ts`。
   - 使用 fake delegate 覆盖 heartbeat 成功、空白 deviceId、not found、非 ACTIVE、active assertion、registration unavailable。
   - 断言 `findUnique` 参数精确为 `where.id` + `select.id/storeId/status`。
   - 断言 `update` 参数只包含 `lastHeartbeatAt`，不写 `health`、`appVersion`、`localTime`、`requestId` 或原始客户端 payload。
   - 源码守卫确认 adapter/spec 不导入 `@prisma/client`、不实例化真实 `PrismaClient`、不调用 `$connect()`、不创建 Nest application context。

3. **边界守卫增强：**
   - `boundary-guard.spec.ts` 新增生产 module 扫描：`DEVICE_PORT` / `PrismaDevicePort` 的注册语义不得出现在任何 `.module.ts` 中。
   - 保持 `DEVICE_AUTH_PORT` / `PrismaDeviceAuthPort` 只允许在 `device-auth-persistence.module.ts` 注册。
   - 既有 Event persistence 守卫保持不变。

4. **文档更新：**
   - `apps/api/src/modules/device/README.md` 明确 `PrismaDevicePort` 是未注册的 heartbeat persistence adapter。
   - 明确当前只实现 heartbeat/update 与 active assertion，设备注册仍未实现。
   - 明确 `DEVICE_PORT` 仍不得进入 DeviceModule/AppModule，后续需单独指令创建 dormant `DevicePersistenceModule`。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 17 files, 191 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 87 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；device adapter/spec 未导入 runtime `@prisma/client`；无 `DEVICE_PORT` 生产 module provider 注册 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts` 的 imports/providers/exports。
- 未创建或激活 `DevicePersistenceModule`。
- 未注册 `DEVICE_PORT` 到任何 module。
- 未将 `PrismaDevicePort` 导入或注册进 `DeviceModule`、`AppModule` 或任何运行时业务模块。
- 未修改 `DeviceService`、`DeviceController`、`DeviceAuthGuard` 的业务逻辑。
- 未实现真实设备注册、secret 生成/哈希、HMAC 校验变更。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 到 device adapter 或测试文件。
- 未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。
- 未写入完整 `health`、原始媒体、签名、secret、token、appVersion/localTime 原文到 Device model。

---

## 指令052 DeviceAuthPersistenceModule dormant wiring

**验证时间:** 2026-06-01 13:32 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增 dormant 设备认证持久化 wiring 模块：**
   - 新增 `apps/api/src/modules/device/device-auth-persistence.module.ts`。
   - `DeviceAuthPersistenceModule` 只 `imports: [PrismaRuntimeModule]`。
   - 只注册一个 `DEVICE_AUTH_PORT` provider：通过 `inject: [PRISMA_CLIENT]` 把 Prisma runtime client delegate wiring 到 `new PrismaDeviceAuthPort(client)`。
   - `exports` 只导出 `DEVICE_AUTH_PORT`。

2. **新增 metadata 白盒测试：**
   - 新增 `apps/api/test/device-auth-persistence.module.spec.ts`。
   - 使用 `MODULE_METADATA` + `Reflect.getMetadata(...)` 检查真实 Nest metadata。
   - 断言 imports/providers/exports 均为精确集合。
   - 断言 `DEVICE_AUTH_PORT` factory 精确注入 `[PRISMA_CLIENT]`。
   - 通过读取 module source 验证 factory 构造 `PrismaDeviceAuthPort`，但不执行 provider factory，不创建 Nest application context。
   - 测试内通过 mock 避免触达真实 Prisma runtime package 初始化；不实例化真实 `PrismaClient`，不调用 `$connect()`。

3. **边界守卫增强：**
   - `boundary-guard.spec.ts` 新增 AppModule 不得导入 `DeviceAuthPersistenceModule` 的断言。
   - 新增生产 module 注册扫描：`DEVICE_AUTH_PORT` / `PrismaDeviceAuthPort` 的注册语义只允许出现在 `device-auth-persistence.module.ts`。
   - 保持既有 Event persistence 守卫不变。

4. **文档更新：**
   - `apps/api/src/modules/device/README.md` 明确 `DeviceAuthPersistenceModule` 是 dormant wiring module。
   - 明确该 module 不应被 AppModule/DeviceModule 或任何运行时业务 module 导入，除非后续明确激活。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 16 files, 180 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 85 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；device auth adapter/module/spec 未导入 runtime `@prisma/client`；AppModule/DeviceModule 注册未变 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts` 的 imports/providers/exports。
- 未将 `DeviceAuthPersistenceModule` 导入 AppModule、DeviceModule 或任何运行时业务模块。
- 未创建/激活完整 `DevicePersistenceModule`。
- 未注册 `DEVICE_PORT`，未实现设备心跳写入 adapter。
- 未执行 provider factory，未创建 Nest application context，未触发真实 Prisma runtime。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 到 device module/adapter/spec。
- 未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。
- 未修改 `DeviceAuthGuard` 的签名校验逻辑。

---

## 指令051 DeviceAuth Prisma adapter contract

**验证时间:** 2026-06-01 07:15 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增设备认证 Prisma adapter 最小骨架：**
   - 新增 `apps/api/src/modules/device/device-auth.prisma-adapter.ts`。
   - 导出最小 Prisma-shaped `DeviceAuthDelegate`，只暴露 `device.findUnique({ where: { id }, select: { secretHash: true, status: true } })`。
   - 导出 `PrismaDeviceAuthPort implements DeviceAuthPort`。
   - `findSecretByDeviceId(deviceId)` 对 deviceId 先 `trim()`；空白输入直接返回 `null` 且不查询 delegate。
   - delegate 返回 device 时映射为 `{ verificationSecret: device.secretHash, status: device.status }`；not found 返回 `null`。

2. **新增 adapter 契约测试：**
   - 新增 `apps/api/test/device-auth.prisma-adapter.spec.ts`。
   - 使用 fake delegate 覆盖成功查询、not found、空白 deviceId、`ACTIVE` / `SUSPENDED` 状态透传。
   - 断言查询参数精确为 `where.id` + `select.secretHash/status`。
   - 源码守卫确认 adapter/spec 不导入 `@prisma/client`、不实例化真实 `PrismaClient`、不调用 `$connect()`。

3. **文档更新：**
   - 更新 `apps/api/src/modules/device/README.md`。
   - 明确 `DeviceAuthGuard` 依赖 `DeviceAuthPort`。
   - 明确 `PrismaDeviceAuthPort` 是未注册的持久化 adapter，当前不代表设备认证生产启用。
   - 后续需明确指令创建 dormant `DevicePersistenceModule` 后才可接入。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 15 files, 173 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 83 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；`device-auth.prisma-adapter.ts` 未导入 `@prisma/client`；DeviceModule/AppModule 注册未变 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts` 的 imports/providers/exports。
- 未创建 `DevicePersistenceModule`，未将任何 Device adapter 注册进模块。
- 未导入 `PrismaRuntimeModule` 到 DeviceModule 或 AppModule。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 到 device adapter 或测试文件。
- 未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。
- 未修改 `DeviceAuthGuard` 的签名校验逻辑。

---

## 指令050 EventPersistenceModule dormant wiring

**验证时间:** 2026-05-31 23:55 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增 dormant 生产 wiring 模块：**
   - 新增 `apps/api/src/modules/event/event-persistence.module.ts`。
   - `EventPersistenceModule` 只 `imports: [PrismaRuntimeModule]`。
   - 只注册一个 `EVENT_PORT` provider：通过 `inject: [PRISMA_CLIENT]` 把 Prisma runtime client delegate wiring 到 `new PrismaEventPort(client)`。
   - `exports` 只导出 `EVENT_PORT`。

2. **新增 metadata 白盒测试：**
   - 新增 `apps/api/test/event-persistence.module.spec.ts`。
   - 使用 `MODULE_METADATA` + `Reflect.getMetadata(...)` 检查真实 Nest metadata。
   - 断言 imports/providers/exports 均为精确集合，不执行 provider factory，不创建 Nest application context。
   - 测试内通过 mock 避免触达真实 Prisma runtime package 初始化；不实例化真实 `PrismaClient`，不调用 `$connect()`。

3. **边界守卫增强：**
   - `boundary-guard.spec.ts` 新增 AppModule 不得导入 `EventPersistenceModule` 的断言。
   - 新增生产 module 注册扫描：`EVENT_PORT` / `PrismaEventPort` 的注册语义只允许出现在 `event-persistence.module.ts`。
   - 保持 `EventModule` 未注册 `EVENT_PORT` / `PrismaEventPort`，`DeviceModule` 未注册设备真实 port/provider。

4. **文档更新：**
   - `apps/api/src/modules/event/README.md` 明确 `EventModule` 只声明/导出 `EventService`。
   - 明确 `EventPersistenceModule` 是未接入 AppModule 的待激活持久化 wiring 模块。
   - 当前真实数据库持久化仍未启用。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 14 files, 168 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 81 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；`event-persistence.module.ts` 未导入 `@prisma/client`；AppModule 未导入 dormant persistence module |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts`、`apps/api/src/modules/event/event.module.ts` 的 imports/providers/exports。
- 未将 `EventPersistenceModule` 导入 `AppModule`、`DeviceModule` 或 `EventModule`。
- 未创建新的 Controller、HTTP 接口、启动入口或外部服务调用。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 到 `event-persistence.module.ts` 或测试文件。
- 未执行 `PrismaRuntimeModule` provider factory，未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。

---

## 指令049 Event Prisma DI contract test

**验证时间:** 2026-05-31 23:05 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **新增激活前 DI 契约测试：**
   - 新增 `apps/api/test/event.prisma-di-contract.spec.ts`。
   - 测试用 Nest application context 注册 `EventService`、fake `PRISMA_CLIENT`、以及 `{ provide: EVENT_PORT, useFactory: (client) => new PrismaEventPort(client), inject: [PRISMA_CLIENT] }`。
   - fake client 仅包含 `eventLog.create` fake delegate；spec 通过源码守卫确认不导入真实 `PrismaClient`、不导入 `PrismaRuntimeModule`、不调用 `$connect()`。

2. **验证 wiring 与写入映射：**
   - `moduleRef.get(EventService)` 可解析为 `EventService`。
   - `EventService.recordEvent(...)` 经由 `EVENT_PORT -> PrismaEventPort -> fake PRISMA_CLIENT` 写入 fake delegate。
   - 断言 Prisma-shaped `data` 包含 `storeId`、`eventType`、`occurredAt`、`deviceId`、`customerId`、`anonymousId`、`tryOnSessionId`、`payload`。
   - 断言 `input.traceId` 不进入 Prisma data。

3. **验证 delegate 前拦截：**
   - 危险 payload 由 `EventService` 在 delegate 前拦截。
   - 空 `storeId` 由 `PrismaEventPort` 在 delegate 前拦截。
   - 两条失败路径均断言 fake delegate 未发生副作用。

4. **保持生产行为不变：**
   - 本测试只是激活前 wiring 合同，不代表生产 `EventModule` 已注册 `EVENT_PORT`，也不代表真实 Prisma 持久化已启用。
   - 仓库当前未包含 `@nestjs/testing`，且本指令禁止新增依赖，因此本轮使用 `NestFactory.createApplicationContext` 创建测试用 Nest DI context，未修改依赖或 lockfile。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 13 files, 162 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 79 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `new PrismaClient(` 仍仅在 Prisma runtime 边界；无 `$connect(` 实际调用；DI contract spec 未导入 `PrismaRuntimeModule`、未导入 `@prisma/client`、未实例化真实 `PrismaClient` |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改任何 `apps/api/src/**` 生产源码。
- 未修改 AppModule/EventModule/DeviceModule 的 imports/providers/exports。
- 未将 `PrismaRuntimeModule` 导入测试 module 以执行真实 factory。
- 未从 `@prisma/client` 引入 runtime `PrismaClient` 参与本测试。
- 未调用 `$connect()`，未执行真实数据库 query，未连接真实数据库，未运行 migrate/seed。

---

## 指令048 boundary metadata helper coverage repair

**验证时间:** 2026-05-31 16:34 Asia/Shanghai  
**验证人:** 线程02（代码执行）

### 修改内容

1. **修复 boundary metadata helper 覆盖缺口：**
   - `boundary-guard.spec.ts` 的 module import 判断现在同时识别普通 class import 与 Nest dynamic module import (`{ module: X }`)。
   - provider helper 不只检查 object provider 的 `provide` token，也检查 `useClass`、`useExisting`、`useFactory`、`useValue` 等实现侧名称。
   - 新增 helper 覆盖测试，防止后续动态模块或 object provider 变体绕过边界守卫。

2. **保持生产行为不变：**
   - 本轮只修复测试 helper 与 guard 覆盖能力，未修改任何 `apps/api/src/**` 生产源码。
   - `AppModule` 仍未导入 `PrismaRuntimeModule` / `DeviceModule` / `EventModule`。
   - `DeviceModule` / `EventModule` 仍未注册真实 port/provider。

### 覆盖范围

- class module import 与 `{ module: SomeModule }` dynamic module import 均能被 helper 识别。
- class provider、object provider token、`useClass`、`useExisting`、`useFactory`、`useValue` 的名称均纳入 provider guard 判断。
- `DeviceModule` / `EventModule` / `AppModule` 的边界守卫继续基于真实 Nest metadata 读取。
- 保留源码扫描类测试：PrismaClient 单点边界、禁止 `$connect(`、禁止 Redis/对象存储/AI/微信 SDK、禁止业务路由越界。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 12 files, 158 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 78 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现新的 Prisma/DB/外部 SDK/runtime 越界；宽泛 SDK 扫描仅命中既有配置占位和测试 guard 正则 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改任何 `apps/api/src/**` 生产源码。
- 未将 `PrismaRuntimeModule`、`DeviceModule`、`EventModule` 导入 `AppModule`。
- 未在 `DeviceModule` 或 `EventModule` 注册真实 port/provider。
- 未调用 `$connect()`，未执行数据库 query，未连接真实数据库，未运行 migrate/seed。

---

## 指令035 事件类型契约对齐

**验证时间:** 2026-05-30 12:00 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **Prisma EventType 收口与 shared DomainEventType 对齐：**
   - `prisma/schema.prisma` 的 `enum EventType` 从 9 个值扩展到 22 个值，完全覆盖 `packages/shared/src/index.ts` 中 `DomainEventType` 的所有枚举值。
   - 新增值包括：`DEVICE_REGISTERED`, `DEVICE_SUSPENDED`, `CATALOG_SYNCED`, `TRY_ON_QR_SHOWN`, `TRY_ON_AUTHORIZED`, `TRY_ON_COMPLETED`, `CUSTOMER_CREATED`, `CUSTOMER_MERGED`, `CUSTOMER_PROFILE_UPDATED`, `MEDIA_EXPIRED`, `MEDIA_DELETED`, `COUPON_EXPIRED`, `COUPON_VOIDED`。

2. **后端事件端口类型收紧：**
   - `apps/api/src/modules/event/event.ports.ts` 中 `EventLogInput.eventType` 从裸 `string` 改为 `DomainEventType`。
   - `apps/api/src/modules/device/device.service.ts` 记录心跳事件时使用 `DomainEventType.DeviceHeartbeat`，不再硬编码字符串 `"DEVICE_HEARTBEAT"`。

3. **新增防飘移测试：**
   - `apps/api/test/event-type-contract.spec.ts` 读取 `prisma/schema.prisma` 并用正则提取 `enum EventType` 块。
   - 断言 `Object.values(DomainEventType)` 中每个值都存在于 Prisma `EventType`。
   - 断言 `DomainEventType.DeviceHeartbeat` 等于 `"DEVICE_HEARTBEAT"`。
   - 断言 `DomainEventType` 至少包含 21 个期望的一期事件类型。

### 覆盖范围

- Prisma `EventType` 覆盖 shared `DomainEventType` 的全部值。
- `EventLogInput.eventType` 使用 `DomainEventType` 类型，不再是裸 `string`。
- `DeviceService` 使用 `DomainEventType.DeviceHeartbeat` 记录心跳事件。
- 存在自动化测试防止 shared/prisma 事件类型再次飘移。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api exec prisma validate --config ../../prisma.config.ts` | Passed |
| `pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts` | Passed |
| `pnpm --filter @jewelry/api test` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient 实例化、数据库访问、外部服务调用 |

> **注意：** 原始记录中 `pnpm --filter @jewelry/api exec prisma validate` 与 `pnpm --filter @jewelry/api exec prisma generate`（未带 `--config`）被标记为 Passed，但线程01复验发现这两条命令在 `apps/api` 工作目录下无法找到根级 `prisma.config.ts`，实际会失败。正确形式必须显式指定 `--config ../../prisma.config.ts`。该修正由指令036完成。

### 未越界

- 未新增依赖或修改 lockfile。
- 未连接数据库或运行 migrate。
- 未实例化 `PrismaClient` 或实现真实 repository/adapter。
- 未修改 `apps/api/src/app.module.ts`。
- 未创建新的 Controller、HTTP 接口或外部服务调用。
- 未删除现有 Prisma 模型字段、关系或索引。

---

## 指令036 事件类型契约对齐 — 验证命令修复与测试补强

**验证时间:** 2026-05-30 12:25 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **Prisma 验证命令标准修正：**
   - 更正 `docs/operations/api-runtime-validation.md` 指令035小节中未带 `--config` 的 filtered Prisma 命令记录，明确正确形式为 `pnpm --filter @jewelry/api exec prisma validate --config ../../prisma.config.ts` 与 `pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts`。
   - 说明原因：filtered exec 的工作目录是 `apps/api`，不会自动加载根级 `prisma.config.ts`。

2. **新增 package.json 稳定脚本：**
   - `apps/api/package.json` 新增 `prisma:validate`: `prisma validate --config ../../prisma.config.ts`。
   - `apps/api/package.json` 新增 `prisma:generate`: `prisma generate --config ../../prisma.config.ts`。

3. **防漂移测试补强为集合相等：**
   - `apps/api/test/event-type-contract.spec.ts` 新增测试：断言 Prisma `EventType` 与 shared `DomainEventType` 集合相等（双向覆盖，无额外值）。
   - 保留 `DomainEventType.DeviceHeartbeat` 心跳用例断言和最小数量断言。

4. **文档更新：**
   - `apps/api/docs/white-box-test-plan.md` 补充：防漂移测试现在检查 shared/prisma 事件类型集合相等，而不仅是单向覆盖。

### 覆盖范围

- 指令035运行文档不再把未带 `--config` 的 filtered Prisma 命令标为 Passed。
- 正确的 filtered Prisma 命令（带 `--config ../../prisma.config.ts`）通过并记录。
- 事件类型防漂移测试断言 shared `DomainEventType` 与 Prisma `EventType` 集合相等。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api exec prisma validate --config ../../prisma.config.ts` | Passed |
| `pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient 实例化、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- 未实例化 `PrismaClient` 或实现真实 repository/adapter。
- 未修改 `apps/api/src/app.module.ts`。
- 未创建新的 Controller、HTTP 接口或外部服务调用。

---

## 指令034 设备心跳门店归属收紧

**验证时间:** 2026-05-30 11:30 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **DevicePort 返回值契约收紧：**
   - `DevicePort.acceptHeartbeat` 返回值从 `{ serverTime, status }` 改为 `DeviceHeartbeatResult`，必须包含 `storeId`。
   - `storeId` 表示该设备当前绑定的门店 ID，由后续真实 adapter 从设备记录读取。

2. **DeviceService 事件 storeId 来源改变：**
   - `DEVICE_HEARTBEAT` 事件的 `storeId` 现在使用 `DevicePort.acceptHeartbeat` 返回的 `result.storeId`，而不是服务层硬编码的 `"pending-store-binding"`。
   - 若 `storeId` 缺失、空字符串或明显无效，返回受控 `VALIDATION_FAILED` (400)，且不调用 `EventPort.recordEvent`。
   - Heartbeat API 响应体仍仅返回 `{ serverTime, status, traceId }`，不包含 `storeId`，避免向终端暴露不必要的门店内部 ID。

3. **新增自动化测试：**
   - 成功心跳后事件 `storeId` 等于 stub 返回的 `store_hb_001`。
   - Heartbeat API 响应 body 不包含 `storeId`。
   - `DevicePort` 返回空 `storeId` 时，heartbeat 返回 400 `VALIDATION_FAILED`，`EventPort.recordEvent` 不被调用，响应不泄露内部占位值。

### 覆盖范围

- `DevicePort.acceptHeartbeat` 返回契约包含 `storeId`。
- `DEVICE_HEARTBEAT` 事件的 `storeId` 来自 DevicePort 返回值，不再是 `pending-store-binding`。
- DevicePort 返回空/无效 `storeId` 时 heartbeat 返回受控 `VALIDATION_FAILED`，且不调用 `EventPort.recordEvent`。
- Heartbeat API 响应不包含 `storeId`。
- 指令033 新增的危险客户端字段拒绝测试继续通过。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 7 files, 109 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 70 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `DeviceModule` / `EventModule` 未导入 `AppModule`。
- 未创建新的 Controller、HTTP 接口、repository 或真实 adapter。
- 未将 `storeId` 暴露到 `POST /devices/heartbeat` 响应体。
- 未在 `DeviceService` 的心跳事件路径中使用 `pending-store-binding` 作为 EventLog `storeId`。

---

## 指令033 设备心跳事件拒绝路径修复

**验证时间:** 2026-05-30 08:15 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修复内容

1. **DeviceService 客户端字段事件 payload 前置校验：**
   - 在 `DevicePort.acceptHeartbeat` 之前，对将进入事件 payload 的客户端输入字段（`appVersion`、`localTime`）进行预校验。
   - 采用 `EventService.assertPayloadSafe` 复用已有的 `validateEventPayload` 纯函数策略，拒绝时抛受控 `HttpException` (`VALIDATION_FAILED`, 400)，且不泄露原始敏感值。
   - 如果前置校验失败，`DevicePort.acceptHeartbeat` 不被调用，避免已发现事件 payload 不安全时仍执行设备心跳副作用。
   - 前置校验通过后再执行 `DevicePort.acceptHeartbeat`，然后构造安全摘要并调用 `EventService.recordEvent`。

2. **新增自动化测试：**
   - `appVersion` 包含明显 base64-like 危险值时，heartbeat 返回 400 `VALIDATION_FAILED`，`DevicePort` 和 `EventPort` 均不被调用，响应不泄露原始值。
   - `localTime` 包含看起来像手机号的危险值时，heartbeat 返回 400 `VALIDATION_FAILED`，`DevicePort` 和 `EventPort` 均不被调用，响应不泄露原始值。

### 覆盖范围

- 危险 `appVersion` / `localTime` 输入会导致 heartbeat 返回受控 `VALIDATION_FAILED`。
- EventService 拒绝路径下 `EventPort.recordEvent` 不被调用，响应不泄露原始危险值。
- `DevicePort.acceptHeartbeat` 不被调用，确保不安全请求不会触发设备心跳副作用。
- 既有心跳成功事件记录测试继续通过。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 7 files, 107 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 70 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `DeviceModule` / `EventModule` 未导入 `AppModule`。
- 未创建新的 Controller、HTTP 接口、repository 或真实 adapter。
- 未将完整 raw `health`、raw media/base64、raw phone 等敏感值写入事件 payload。

---

## 指令032 设备心跳事件记录组合

**Validation Time:** 2026-05-30 07:50 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增/修改文件

- `apps/api/src/modules/event/README.md` — 更新 Public Methods，移除旧 `redactPayload`，明确 `assertPayloadSafe` 属于 `EventService`。
- `apps/api/src/modules/device/device.service.ts` — 注入 `EventService`；`acceptHeartbeat` 成功后在 `DevicePort.acceptHeartbeat` 后调用 `EventService.recordEvent`，记录 `DEVICE_HEARTBEAT` 事件；事件 payload 只包含安全摘要（`appVersion`、`localTime`、`status`、`healthSummary`），不包含完整 `health`。
- `apps/api/src/modules/device/device.module.ts` — `imports: [EventModule]`，但不导入 `AppModule`。
- `apps/api/test/device-heartbeat.controller.spec.ts` — 扩展 5 个自动化测试：成功记录事件、payload 安全摘要、traceId 来源、body deviceId 不可信、敏感 health 时不记录事件。

### 覆盖范围

- 心跳成功后 `EventPort.recordEvent` 被调用一次，eventType 为 `DEVICE_HEARTBEAT`。
- 事件 `deviceId` 来自 Guard principal，`traceId` 来自请求 trace。
- 事件 payload 不包含完整 `health`，只包含 `healthSummary`（key 列表和数量）。
- body 中篡改 `deviceId` 不影响事件 `deviceId`。
- health 含敏感字段时 heartbeat 在前置校验阶段失败，`EventPort` 不被调用。
- `DeviceModule` / `EventModule` 未导入 `AppModule`；无真实 port adapter。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 7 files, 105 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 70 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `DeviceModule` / `EventModule` 未导入 `AppModule`。
- 未创建运行时 Event Controller 或新的 HTTP 接口。
- 未将完整 raw `health` 写入 EventLog payload。

---

## 指令031 EventService 边界封装

**Validation Time:** 2026-05-30 07:35 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增/修改文件

- `apps/api/src/modules/event/event.ports.ts` — 更新 `FORBIDDEN_EVENT_PAYLOAD_KEYS` 与 `event-payload-hygiene.ts` 规则对齐；新增 `EVENT_PORT` 注入 token；移除 `assertPayloadSafe` 方法（由 `EventService` 封装）。
- `apps/api/src/modules/event/event.service.ts` — 新增 `EventService`，在调用 `EventPort.recordEvent` 前执行 `validateEventPayload` 校验，失败时抛受控 `HttpException` (`VALIDATION_FAILED`)，message/path 保留但不含原始敏感 value。
- `apps/api/src/modules/event/event.module.ts` — 新增 `EventModule`，声明并导出 `EventService`，但不提供真实 `EventPort` adapter。
- `apps/api/test/event.service.spec.ts` — 13 个自动化测试。

### 覆盖范围

- `recordEvent` 安全 payload 调用 `EventPort.recordEvent`。
- `recordEvent` 对包含敏感 key/value 的 payload 抛 `VALIDATION_FAILED`，且不调用 `EventPort.recordEvent`。
- 错误响应/异常 response 不包含原始敏感 value。
- `assertPayloadSafe` 对安全 payload 不抛，对危险 payload 抛受控异常。
- `EVENT_PORT` stub 可通过 NestJS 模块 provider 注入。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 7 files, 100 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 70 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 EventModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `EventModule` 未导入 `AppModule`。
- 未创建运行时 Event Controller 或 HTTP 接口。
- 未将 EventService 接入 DeviceService；本条只做 Event 边界封装和测试。

---

## 指令030 EventLog payload hygiene 纯函数

**Validation Time:** 2026-05-30 07:18 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增/修改文件

- `apps/api/src/modules/event/event-payload-hygiene.ts` — 纯函数实现，无数据库、无 NestJS runtime、无外部服务依赖。
- `apps/api/test/event-payload-hygiene.spec.ts` — 29 个自动化测试。

### 准入策略

- 采用"拒绝"策略而非静默删除，避免调用者意外持久化被安静清理的 payload。
- 命中风险时返回结构化失败结果 `{ ok: false, code, message, path }，不含原始敏感 value。

### 覆盖范围

- 敏感 key 大小写不敏感拒绝：`secret`, `signature`, `privateKey`, `apiKey`, `token`, `password`, `credential`, `phone`, `mobile`, `phoneNumber`, `openid`, `openId`, `unionid`, `unionId`, `rawMedia`, `rawImage`, `rawVideo`, `biometric`, `faceVector`。
- 敏感 value 拒绝：raw media data URI（`data:image/`, `data:video/`, `data:application/octet-stream`）、长 base64-like 字符串、看起来像手机号的原始字符串。
- hash 字段允许：字段名包含 `Hash`/`hash` 时即使 value 看起来像手机号也通过。
- 递归扫描 object/array，最多 5 层深度，超过时返回受控失败。
- 错误响应不泄露原始敏感 value。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 6 files, 87 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 67 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 EventModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `EventModule` 未导入 `AppModule`。
- 未创建运行时 Controller 或 HTTP 接口。
- 未将 Event hygiene 接入 DeviceService；本条只做纯函数和测试。

---

## 指令029 health 敏感字段校验修复

**Validation Time:** 2026-05-30 07:05 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 修复内容

1. **health deny-list 大小写归一化缺陷修复：**
   - 原实现：`HEALTH_SENSITIVE_KEYS` 使用 camelCase（`privateKey`, `apiKey`），但校验时将输入 key 转为小写后比较，导致这些字段永远不会被命中。
   - 修复：将 deny-list 统一改为小写（`privatekey`, `apikey`, `token`, `password`, `credential`），校验时大小写不敏感。
   - 属于安全边界兜底缺陷，非功能缺陷。

2. **health 递归扫描：**
   - 原实现：只做顶层 key/value 扫描，`{ system: { apiKey: "..." } }` 会漏检。
   - 修复：实现递归扫描函数，支持 plain object 与 array，最多 5 层深度。
   - 错误消息包含字段路径（如 `system.apiKey`），但不包含 value。

3. **raw media / base64-like 检测覆盖嵌套：**
   - `data:image/`, `data:video/`, `data:application/octet-stream` 拒绝保持不变。
   - base64-like 检测（长度 ≥100 且只含 base64 字符）现在覆盖嵌套字段。

4. **principal 缺失兜底修复：**
   - 原实现：`DeviceController` 在 Guard 后 principal 缺失时抛普通 `Error`，会绕过业务错误码语义变成 500。
   - 修复：改为受控 `HttpException` (`AUTH_FORBIDDEN`, 403)，响应走 `ApiExceptionFilter`，返回 `{ code, message, traceId }`。

### 新增/修改文件

- `apps/api/src/modules/device/device.service.ts` — 修复 deny-list 和递归扫描。
- `apps/api/src/modules/device/device.controller.ts` — principal 缺失兜底改为受控 HttpException。
- `apps/api/test/device-heartbeat.controller.spec.ts` — 新增 10 个测试：`privateKey`/`apiKey`/`token`/`password`/`credential` 拒绝、大小写不敏感、嵌套敏感 key、嵌套 raw media、嵌套 base64-like、principal 缺失兜底。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 5 files, 58 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 65 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `DeviceModule` 未导入 `AppModule`。
- 未实现 repository、PrismaClient 调用、Redis/对象存储/AI/微信 SDK 调用。
- 未引入通用 validation 框架或外部安全扫描库。

---

## 指令028 设备心跳控制器切片

**Validation Time:** 2026-05-30 06:54 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增/修改文件

- `apps/api/src/modules/device/device.ports.ts` — 新增 `DEVICE_PORT` 注入 token。
- `apps/api/src/modules/device/device.dto.ts` — 定义 `DeviceHeartbeatBodyDto` 纯接口。
- `apps/api/src/modules/device/device.service.ts` — `DeviceService.acceptHeartbeat` 做参数组装、最小结构校验（health 敏感字段拒绝）和调用 `DevicePort`。
- `apps/api/src/modules/device/device.controller.ts` — `DeviceController` 暴露 `POST /devices/heartbeat`，由 `DeviceAuthGuard` 保护，从 `devicePrincipal` 获取 `deviceId`，调用 `DeviceService`。
- `apps/api/src/modules/device/device.module.ts` — 声明 `DeviceModule`，但不导入 `AppModule`。
- `apps/api/test/device-heartbeat.controller.spec.ts` — 10 个自动化测试，覆盖正确签名、principal deviceId 传递、缺少/错误签名、health 敏感字段拒绝与不泄露、base64/raw media 拒绝、X-Request-Id traceId 返回。
- `apps/api/test/boundary-guard.spec.ts` — 更新边界守卫正则，移除 `/devices` 路由限制（指令028 已授权），保留 `/try-on` `/coupons` `/admin` 禁止。
- `apps/api/docs/white-box-test-plan.md` — 补充指令028 自动化覆盖说明。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 5 files, 48 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 65 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule、PrismaClient、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- `DeviceModule` 未导入 `AppModule`，运行时没有不安全默认认证 stub。
- 未实现 repository、PrismaClient 调用、Redis/对象存储/AI/微信 SDK 调用。
- 未硬编码运行时设备密钥或提供生产默认认证 stub。

---

## 指令027 设备凭证语义收口

**Validation Time:** 2026-05-30 06:35 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 修复内容

1. **ADR-005 设备凭证验证架构决策：**
   - 新建 `docs/decisions/ADR-005-device-credential-verification.md`。
   - 明确 HMAC request signature 验证需要服务端可用于计算期望签名的验证材料，不能只依赖不可逆的普通 secret hash。
   - 规定 `DeviceAuthPort` 返回字段命名为 `verificationSecret`，避免与 `Device.secretHash` 混淆。
   - 明确 Prisma `Device.secretHash` 暂不直接接入 Guard；真实设备凭证存储方案需后续单独决策。

2. **端口语义收紧：**
   - `device-auth.port.ts`：`findSecretByDeviceId` 返回类型从 `{ secret: string; status: string }` 改为 `{ verificationSecret: string; status: string }`。
   - `device-auth.guard.ts`：使用 `deviceRecord.verificationSecret` 作为 HMAC key material。
   - `device-auth.types.ts`：`secret` 字段注释更新，明确这是 HMAC key material / test secret，不代表数据库 `secretHash`。
   - `device-auth.guard.spec.ts`：Stub 返回 `verificationSecret`，测试数量和断言保持不变。

3. **文档格式清理：**
   - 修复 `apps/api/docs/white-box-test-plan.md` 中自动化小节前的 `|-` Markdown 格式瑕疵。
   - 补充指令027 Guard 凭证语义收紧的白盒测试覆盖说明。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 4 files, 38 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 60 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现新增业务 Controller、PrismaClient、数据库访问 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未连接数据库或外部服务。
- 未创建 `/devices/*`、`/try-on/*`、`/coupons/*`、`/admin/*` 运行时 Controller。
- 未引入加密/KMS SDK 或任何外部服务。
- 未修改 Prisma schema/config。

---

## 指令026 设备认证 Guard 白盒证据修复与公共层边界说明

**Validation Time:** 2026-05-30 06:27 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 修复内容

1. **测试真实断言 devicePrincipal：**
   - 修改 `apps/api/test/device-auth.guard.spec.ts` 内的测试 Controller，使其通过 `@Req()` 读取 Guard 附加到 request 上的 `devicePrincipal` 并返回。
   - "正确签名时 guard 放行并附加 devicePrincipal" 测试现在断言响应体中包含 `{ deviceId: "dev_guard_001" }`。
   - 新增测试 "attached devicePrincipal does not contain secret, signature, or nonce"，断言 principal 中不存在敏感字段，且仅包含 `deviceId`。

2. **公共层改动说明：**
   - `apps/api/src/common/filters/api-exception.filter.ts` 在指令025中的最小修改原因：
     - Guard 抛出的 `HttpException` 携带自定义 `code` 字段（如 `DEVICE_SIGNATURE_MISSING`）。
     - 原有 `ApiExceptionFilter` 只从 `BadRequestException`、`NotFoundException` 等标准异常解析错误码，无法识别 Guard 自定义的业务错误码。
     - 最小修改：在 `resolveCode` 中优先从 `HttpException.getResponse()` 读取 `code` 字段，并校验其是否属于 `API_ERROR_CODES` 白名单。这使 Guard 错误能被正确映射为 `{ code, message, traceId }` 响应，且不泄露签名/secret。
   - `biome.json` 的 `unsafeParameterDecoratorsEnabled` 配置原因：
     - NestJS 使用 `@Inject(DEVICE_AUTH_PORT)` 参数装饰器进行依赖注入。
     - Biome 默认不解析 TypeScript 参数装饰器，会误报 lint 错误或导致格式化异常。
     - 启用 `unsafeParameterDecoratorsEnabled` 是 Biome 对 NestJS/Angular 风格的参数装饰器解析支持开关，仅影响静态分析，不改变运行时行为。
   - 明确：以上两个改动均不包含依赖安装、lockfile 变更、数据库访问或外部服务调用。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 4 files, 38 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 60 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现新增业务 Controller、PrismaClient、数据库访问 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未连接数据库或外部服务。
- 未创建 `/devices/*`、`/try-on/*`、`/coupons/*`、`/admin/*` 运行时 Controller。
- 测试 Controller 仅存在于 `.spec.ts` 内部，未新增运行时路由。

---

## 指令025 设备认证 Guard 基线

**Validation Time:** 2026-05-30 06:19 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增/修改文件

- `apps/api/src/modules/device/device-auth.constants.ts` — 集中定义设备认证 header 名称。
- `apps/api/src/modules/device/device-auth.port.ts` — 定义 `DeviceAuthPort` 查询端口和注入 token。
- `apps/api/src/modules/device/device-auth.guard.ts` — NestJS Guard，负责从请求头读取认证字段并调用纯函数校验，通过后将 `devicePrincipal` 附加到 request（不含 secret）。
- `apps/api/test/device-auth.guard.spec.ts` — 9 个 Guard 单元测试。
- `apps/api/src/common/filters/api-exception.filter.ts` — 最小修改：优先从 `HttpException` response 中提取自定义 `code`，使 Guard 抛出的设备错误码能被正确映射到响应。
- `biome.json` — 启用 `unsafeParameterDecoratorsEnabled`，支持 NestJS `@Inject()` 参数装饰器解析。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 4 files, 37 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 60 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 PrismaClient、数据库访问、业务 Controller |

### 未越界

- 未新增依赖或修改 lockfile。
- 未连接数据库或外部服务。
- 未创建 `/devices/*`、`/try-on/*`、`/coupons/*`、`/admin/*` 运行时 Controller。
- `DeviceAuthPort` 当前仅为 stub/port 占位，不涉及数据库查询。

---

## 指令024 设备签名修复

**Validation Time:** 2026-05-30 05:34 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 修复内容

1. **移除越界依赖 `@types/node`**：
   - 从 `apps/api/package.json` devDependencies 删除 `@types/node`。
   - 恢复 `apps/api/tsconfig.json` 的 `"types": []`。
   - 新增 `apps/api/src/node-types.d.ts`，声明最小 `node:crypto` 和 `Buffer` 类型，保持 `pnpm typecheck` 通过。
   - `pnpm-lock.yaml` 已更新，不再包含 `apps/api` 对 `@types/node` 的直接依赖声明。

2. **签名 payload 绑定 deviceId：**
   - `buildSignaturePayload` 规范格式从 `method\npath\ntimestamp\nnonce\nbodyHash` 改为 `deviceId\nmethod\npath\ntimestamp\nnonce\nbodyHash`。
   - 更新 `device-auth.types.ts` 注释，明确生产场景中 secret 应来自设备安全存储/派生值。
   - `secret` 字段注释从 "secret hash (or raw secret for testing)" 修正为 "secret (or raw test secret)"，避免命名歧义。

3. **新增测试：**
   - `device-signature.spec.ts` 新增 `deviceId` 变化导致签名失败的测试。
   - 总测试数从 15 个增至 16 个（加上 `verifyRequestTimestamp` 4 个测试，总计 28 个测试通过）。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 3 files, 28 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 56 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 PrismaClient、数据库访问、业务 Controller |
| `@types/node` 直接依赖扫描 | Passed — `apps/api/package.json` 未直接声明 `@types/node` |
| `tsconfig types` 检查 | Passed — `apps/api/tsconfig.json` 的 `types` 为 `[]` |

### 未越界

- 未新增业务 Controller 或 HTTP 接口。
- 未连接数据库或外部服务。
- 未实现 `DEVICE_NOT_FOUND` / `DEVICE_NOT_ACTIVE` 的数据库判断。
- 未新增任何依赖。

---

## 指令023 设备签名白盒基线

**Validation Time:** 2026-05-30 05:19 Asia/Shanghai  
**Validator:** Hermes（环境管理员 / 执行者）

### 新增纯领域文件

- `apps/api/src/modules/device/device-auth.types.ts` — 设备认证类型定义、签名 payload 构建函数、默认时钟偏移常量。
- `apps/api/src/modules/device/device-signature.ts` — 纯函数实现：
  - `verifyRequestTimestamp`：校验请求时间戳是否在 5 分钟偏移窗内。
  - `verifyDeviceSignature`：按照 `deviceId\nmethod\npath\ntimestamp\nnonce\nbodyHash` 规范拼接 payload，使用 Node `crypto` HMAC-SHA256 计算期望签名，并使用 timing-safe 比较。
- `apps/api/test/device-signature.spec.ts` — 15 个单元测试，覆盖：
  - 正确签名通过
  - 错误签名返回 `DEVICE_SIGNATURE_INVALID`
  - 缺少 `deviceId` 或 `signature` 返回 `DEVICE_SIGNATURE_MISSING`
  - 超出时钟偏移返回 `DEVICE_CLOCK_SKEW`
  - `method` / `path` / `bodyHash` / `nonce` 任一变化导致签名失败
  - 不同长度的签名输入不抛异常

### 环境修复

- 由于 `apps/api/src/modules/device/device-signature.ts` 首次直接使用 Node 内置模块 `node:crypto` 和 `Buffer`，而项目之前未安装 `@types/node`，导致 `pnpm typecheck` 失败。
- 修复操作：
  1. 安装 `@types/node@22` 到 `apps/api` devDependencies（匹配 Node >=22.12.0 运行时基线）。
  2. 将 `apps/api/tsconfig.json` 的 `"types": []` 改为 `"types": ["node"]`，使 TypeScript 能够解析 Node 内置 API。
- 该修复不影响运行时行为，仅为类型检查基础设施。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 3 files, 27 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 55 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 PrismaClient、数据库访问、业务 Controller |

### 未越界

- 未新增业务 Controller 或 HTTP 接口。
- 未连接数据库或外部服务。
- 未实现 `DEVICE_NOT_FOUND` / `DEVICE_NOT_ACTIVE` 的数据库判断。

---

## 指令037 EventLog Prisma adapter 映射雏形

**验证时间:** 2026-05-30 12:34 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **新增 PrismaEventPort adapter：**
   - `apps/api/src/modules/event/event.prisma-adapter.ts` 导出 `PrismaEventPort`，实现 `EventPort`。
   - 内部定义最小 `EventLogDelegate` 接口（仅含 `eventLog.create({ data })`），不 import `PrismaClient` 或 `@prisma/client`。
   - 字段映射规则：
     - `storeId` -> `data.storeId`
     - `eventType` -> `data.eventType`（`DomainEventType` 字符串值已与 Prisma `EventType` 对齐）
     - `occurredAt` -> `data.occurredAt`，经 `Date` 转换；非法日期抛 `VALIDATION_FAILED`
     - `deviceId` / `customerId` / `anonymousId` / `tryOnSessionId` / `payload` 仅在 `!== undefined` 时写入 `data`
     - `traceId` 不写入 `data`，也不悄悄塞入 `payload`
   - 输入校验：
     - 空或全空白 `storeId` 抛 `VALIDATION_FAILED`，不调用 delegate
     - 非 ISO / 非法 `occurredAt` 抛 `VALIDATION_FAILED`，不调用 delegate
     - 纯数字字符串（如 `"1234567890"`）因不匹配 ISO 前缀被拒绝

2. **新增自动化测试：**
   - `apps/api/test/event.prisma-adapter.spec.ts` 覆盖：
     - adapter 实现 `EventPort` 类型契约
     - 安全事件正确映射到 `eventLog.create` data
     - `traceId` 不落入 Prisma data
     - `undefined` 可选字段不被写入 data
     - 空 / 空白 `storeId` 拒绝且不调用 delegate
     - 非法 / 数字字符串 `occurredAt` 拒绝且不调用 delegate

3. **文档更新：**
   - `apps/api/src/modules/event/README.md` 增加 Adapter Status 小节，说明 adapter 存在但未在模块中注册。
   - `apps/api/docs/white-box-test-plan.md` 补充指令037 自动化覆盖说明。

### 覆盖范围

- `EventLogInput` 到 Prisma `eventLog.create` data 的映射已定义、已测试。
- `storeId` 和 `occurredAt` 在 adapter 层有受控校验，失败时不触发 delegate 调用。
- `traceId` 明确不进入 Prisma data 或 payload。
- 可选字段为 `undefined` 时不会污染 Prisma `create` data。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient 实例化、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- 未实例化 `PrismaClient` 或实现真实 repository/adapter。
- 未修改 `apps/api/src/app.module.ts`。
- 未在 `EventModule` 中注册真实 adapter/provider。
- 未创建新的 Controller、HTTP 接口或外部服务调用。

---

## 指令038 EventLog adapter 类型收紧与心跳测试隔离收口

**验证时间:** 2026-05-30 13:01 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **Adapter data eventType 类型收紧：**
   - `apps/api/src/modules/event/event.prisma-adapter.ts` 中 `EventLogCreateData.eventType` 从 `string` 改为 `DomainEventType`。
   - `import type { DomainEventType }` 保持纯类型引用，不引入运行时依赖。
   - `data.eventType` 仍直接来自 `input.eventType`，保持与 `EventPort` 契约一致。

2. **测试断言调整：**
   - `apps/api/test/event.prisma-adapter.spec.ts` 中断言 `data.eventType` 从 `"DEVICE_HEARTBEAT"` 改为 `DomainEventType.DeviceHeartbeat`。

3. **心跳测试隔离修复：**
   - `StubDevicePort` 增加 `heartbeatStoreId` 场景字段，默认值为 `"store_hb_001"`。
   - `acceptHeartbeat` 返回的 `storeId` 从 `this.heartbeatStoreId` 读取。
   - `beforeEach` 每次重置 `heartbeatStoreId` 为默认值。
   - 空 `storeId` 测试通过设置 `devicePort.heartbeatStoreId = ""` 触发，不再直接永久重写 `acceptHeartbeat` 方法。
   - 新增测试证明空 `storeId` 场景后，下一次正常心跳仍能记录事件。

### 覆盖范围

- `EventLogCreateData.eventType` 使用 `DomainEventType` 类型，不再是裹 `string`。
- `device-heartbeat.controller.spec.ts` 不再依赖永久重写 `acceptHeartbeat` 的测试顺序。
- 新增/更新测试覆盖上述收口。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 9 files, 122 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 73 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient 实例化、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- 未实例化 `PrismaClient` 或实现真实 repository/adapter。
- 未修改 `apps/api/src/app.module.ts`。
- 未在 `EventModule` 中注册真实 adapter/provider。
- 未创建新的 Controller、HTTP 接口或外部服务调用。
---

## 指令039 EventLog adapter 边界守卫收口

**验证时间:** 2026-05-30 13:55 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **Adapter 注释清理：**
   - `apps/api/src/modules/event/event.prisma-adapter.ts` 中 `EventLogCreateData` 的 JSDoc 注释更新：明确 `eventType` 使用 `DomainEventType`，而非裸 `string`。
   - 注释同时保留对 `event-type-contract.spec.ts` 集合相等保证的引用。

2. **Adapter 单测补强：**
   - `apps/api/test/event.prisma-adapter.spec.ts` 新增测试：当 `input.payload` 本身包含 `traceId` 字段时，`PrismaEventPort` 会将其原样写入 `data.payload`，不会替调用方清洗。
   - 该测试明确区分 adapter 职责（忠实映射）与 `EventService` 职责（payload hygiene）。

3. **边界守卫测试补强：**
   - `apps/api/test/boundary-guard.spec.ts` 新增两项测试：
     - `EventModule` 未注册 `PrismaEventPort`，也未提供 `EVENT_PORT` provider。
     - `AppModule` 的 `@Module({ imports: [...] })` 中不包含 `DeviceModule` 或 `EventModule`。
   - 修复 `PrismaClient` 和 `@prisma/client` 的正则匹配：从全局匹配改为仅匹配行首 import 语法（`^\s*import...`），避免误伤注释中的说明文字。

4. **文档更新：**
   - `apps/api/docs/white-box-test-plan.md` 补充指令039 自动化覆盖说明。

### 覆盖范围

- Adapter 注释与代码类型一致，不再声称 `eventType` 是裸 `string`。
- Adapter 对 `input.payload.traceId` 只做映射，不做清洗；清洗职责由 `EventService` 承担。
- `EventModule` 未提供 `EVENT_PORT` 或 `PrismaEventPort`。
- `AppModule` 未导入 `DeviceModule` / `EventModule`。
- 边界守卫正则不再误伤注释，匹配真实 import/new 语法。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed |
| `pnpm --filter @jewelry/api prisma:generate` | Passed |
| `pnpm --filter @jewelry/api test` | Passed — 9 files, 125 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 73 files checked, no fixes applied |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — 未发现 AppModule 导入 DeviceModule/EventModule、PrismaClient 实例化、数据库访问、外部服务调用 |

### 未越界

- 未新增依赖或修改 lockfile。
- 未修改 Prisma schema/config。
- 未连接数据库或运行 migrate。
- 未实例化 `PrismaClient` 或实现真实 repository/adapter。
- 未修改 `apps/api/src/app.module.ts`。
- 未在 `EventModule` 中注册真实 adapter/provider。
- 未创建新的 Controller、HTTP 接口或外部服务调用。

---

## 指令039 EventLog adapter 边界守卫收口

**执行时间：** 2026-05-30 14:12 Asia/Shanghai  
**执行者：** Hermes  
**目标：** 清理 EventLog adapter 过期注释并加强边界守卫，确保未接真实数据库前越界行为被测试捕获。

### 修复内容

1. **Adapter 注释**：`event.prisma-adapter.ts` 中 `EventLogCreateData.eventType` 注释已正确声明使用 `DomainEventType`，且值可映射到 Prisma `EventType` 枚举（由 `event-type-contract.spec.ts` 保证）。

2. **Adapter 单测加强**：`event.prisma-adapter.spec.ts` 已包含：
   - 当 `input.payload` 本身包含 `traceId` 字段时，adapter 不会替调用方清洗 payload，而是原样传递给 Prisma `data.payload`。
   - adapter 自身不把 `input.traceId` 写入 Prisma data，也不悄悄塞进 payload。

3. **边界守卫加强**：`boundary-guard.spec.ts` 已包含：
   - `EventModule` 不注册 `PrismaEventPort` 或提供 `EVENT_PORT` provider。
   - `AppModule` 不导入 `DeviceModule` 或 `EventModule`（检查 `@Module({ imports: [...] })` 实际数组，而不是元数据常量）。
   - `PrismaClient` 和 `@prisma/client` import 检查使用 `^\s*import` 行首匹配，避免误伤注释。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 9 files, 125 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 73 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 边界扫描

- `AppModule` 未导入 `DeviceModule` / `EventModule` ✅
- `EventModule` 未注册 `PrismaEventPort` / `EVENT_PORT` ✅
- `apps/api/src` 下无 `.spec.ts` / `.test.ts` 文件 ✅
- 无 `new PrismaClient` 、无 `@prisma/client` import 、无数据库连接 、无 migrate ✅
- 无 Redis / 对象存储 / AI / 微信 SDK ✅

### 未修改

- 未新增依赖，未修改 lockfile
- 未修改 Prisma schema/config
- 未修改 `apps/api/src/app.module.ts`
- 未在 `EventModule` 中注册真实 adapter/provider
- 未创建新的 Controller / HTTP 接口

---

## 指令040 EventService + PrismaEventPort 组合白盒测试

**执行时间：** 2026-05-30 15:03 Asia/Shanghai  
**执行者：** Hermes  
**目标：** 增加 EventService 与 PrismaEventPort 的组合白盒测试，证明 payload hygiene 在 Prisma-shaped delegate 之前生效，安全事件才会进入 `eventLog.create`。

### 新增/修改文件

- `apps/api/test/event.service-prisma-adapter.spec.ts` — 新增组合测试（9 tests）。
- `apps/api/docs/white-box-test-plan.md` — 补充指令040 覆盖项。
- `docs/operations/api-runtime-validation.md` — 追加本小节。

### 组合测试覆盖

1. **安全 payload 到达 fake delegate：**
   - `EventService` 调用 `PrismaEventPort`，再由 `PrismaEventPort` 映射为 `eventLog.create` data。
   - 断言 data 包含正确的 `storeId`、`eventType`、`occurredAt` (为 `Date` 实体)、`deviceId`、`payload`。
   - `input.traceId` 不会被写入 Prisma data。

2. **危险 payload 被 EventService 拒绝：**
   - `secret`、raw phone number、raw media data URI 等危险 payload 触发 `VALIDATION_FAILED`。
   - fake delegate 未被调用。
   - 错误响应不泄露原始危险值。

3. **payload traceId 策略：**
   - EventService hygiene 不把 `traceId` 作为敏感 key 拦截。
   - adapter 忠实映射 payload 中的 `traceId` 到 `data.payload`。
   - `input.traceId` 本身不会被额外写入 data。

4. **PrismaEventPort 独立校验仍然有效：**
   - 空 `storeId`、无效 `occurredAt` 仍被 PrismaEventPort 拒绝，fake delegate 不被调用。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 10 files, 134 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 74 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 边界扫描

- `AppModule` 未导入 `DeviceModule` / `EventModule` ✅
- `EventModule` 未注册 `PrismaEventPort` / `EVENT_PORT` ✅
- 无 `new PrismaClient`、无 `@prisma/client` import、无数据库连接、无 migrate ✅
- 无 Redis / 对象存储 / AI / 微信 SDK ✅

### 未越界

- 未新增依赖，未修改 lockfile
- 未修改生产源码（`apps/api/src/modules/event/*`、`apps/api/src/app.module.ts`、`EventModule` providers 均未变更）
- 未在 `EventModule` 中注册真实 adapter/provider
- 未创建新的 Controller / HTTP 接口

---

## 指令041 DeviceService 心跳链路组合白盒测试

**验证时间:** 2026-05-30 15:54 Asia/Shanghai  
**验证人:** Hermes（环境管理员 / 执行者）

### 修改内容

1. **新增 DeviceService + EventService + PrismaEventPort 组合测试：**
   - `apps/api/test/device.service-prisma-event.spec.ts`（7 tests）。
   - 使用纯 TypeScript 实例化（不依赖 Nest TestingModule），构造 fake `DevicePort`、fake `EventLogDelegate`、`PrismaEventPort`、`EventService`、`DeviceService`。

2. **成功心跳链路验证：**
   - `DevicePort.acceptHeartbeat` 被调用一次，输入包含正确的 `deviceId`、`requestId`、`appVersion`、`localTime`、`health`。
   - `DEVICE_HEARTBEAT` 事件通过 `EventService.recordEvent` -> `PrismaEventPort.recordEvent` -> fake delegate 写入。
   - delegate 收到的 Prisma-shaped `eventLog.create` data 中：
     - `storeId` 来自 `DevicePort` 返回值，不是硬编码。
     - `eventType` 为 `DomainEventType.DeviceHeartbeat`。
     - `occurredAt` 为 `Date` 实例。
     - `deviceId` 正确。
     - `payload` 包含 `appVersion`、`localTime`、`status`、`healthSummary`（仅 key 列表和数量），不包含完整 `health` 对象或值。
     - `input.traceId` 不进入 Prisma data。

3. **危险输入拦截验证：**
   - `appVersion` 含 base64-like 数据：`DeviceService.acceptHeartbeat` 返回 `VALIDATION_FAILED`，`DevicePort` 与 EventLog delegate 均不被调用，错误消息不泄露原始值。
   - `localTime` 含 raw phone number（如 `13800138000`）：同上，返回 `VALIDATION_FAILED` 且不调用下游。
   - `health` 含 forbidden key（如 `secret`）或 raw media data URI：同上，返回 `VALIDATION_FAILED` 且不调用下游。

4. **空 storeId 边界：**
   - fake `DevicePort` 返回空 `storeId` 时，`DeviceService` 返回 `VALIDATION_FAILED`（400）。
   - `DevicePort.acceptHeartbeat` 已被调用（验证发生在 DevicePort 之后），但 EventLog delegate 不被调用。

### 覆盖范围

- 心跳成功链路：DevicePort -> DeviceService -> EventService -> PrismaEventPort -> fake delegate，事件 payload 只含安全摘要。
- 危险客户端输入在 DevicePort 和 EventLog delegate 前被受控拦截。
- 错误响应不泄露原始敏感值。
- 空 `storeId` 阻止 EventLog 写入。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 11 files, 141 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 75 files checked |
| `pnpm --filter @jewelry/api build` | Passed |
| 边界扫描 | Passed — `boundary-guard.spec.ts` 通过，AppModule 未导入 DeviceModule/EventModule、无 PrismaClient 实例化、无数据库/Redis/对象存储/AI/微信 SDK |

### 未越界

- 未新增依赖，未修改 lockfile。
- 未修改生产源码（`apps/api/src/modules/device/*`、`apps/api/src/modules/event/*`、`app.module.ts`、模块注册均未变更）。
- 未在 `DeviceModule`/`EventModule` 中注册真实 adapter/provider。
- 未创建新的 Controller / HTTP 接口。

---

## 指令042 Prisma runtime activation gate 与协作记录安全

**执行时间：** 2026-05-31 08:00 Asia/Shanghai  
**执行者：** Hermes（环境管理员 / 执行记录回填员）  
**目标：** 建立“真实持久化接入前”的运行时准入门禁，补充 ADR 与边界守卫；同时修复协作记录追加安全规范，避免执行文件再次被覆盖。

### 新增/修改文件

- `docs/decisions/ADR-006-prisma-runtime-activation-gate.md` — 新增 ADR，明确 Prisma runtime/provider 接入门禁。
- `docs/operations/collaboration-record-safety.md` — 新增协作记录安全规范，规定备份、追加、校验三步流程。
- `apps/api/test/boundary-guard.spec.ts` — 增加4个边界守卫测试：
  - `DeviceModule` 不得注册 `DEVICE_PORT`、`DEVICE_AUTH_PORT` 或任何 `PrismaDevice*` / `DevicePrisma*` provider。
  - `AppModule` 不得导入 `PrismaModule`。
  - 保留并强化既有的 `PrismaClient` import/实例化检查，只匹配行首 `import` 或 `new PrismaClient` 语法，不误伤注释。
- `apps/api/docs/white-box-test-plan.md` — 补充指令042 自动化覆盖说明：ADR-006、边界守卫增强、协作记录安全文档。
- `docs/operations/api-runtime-validation.md` — 追加本小节。

### ADR-006 核心门禁

| 门禁项 | 规则 |
|--------|------|
| AppModule 导入 | 不得导入 `DeviceModule`、`EventModule`、`PrismaModule` |
| DeviceModule providers | 不得注册 `DEVICE_PORT`、`DEVICE_AUTH_PORT`、`PrismaDevice*`、`DevicePrisma*` |
| EventModule providers | 不得注册 `EVENT_PORT`、`PrismaEventPort` |
| PrismaClient 实例化 | 业务文件中不得 `import` 或 `new PrismaClient()` |
| 数据库连接指令 | 必须显式授权 PrismaClient、连接、migrate、seed；未显式允许则一律禁止 |

### 协作记录安全规范

1. **备份：** 每次写入前先备份到 `docs/operations/record-backups/` 或同目录 `.bak`。
2. **追加：** 仅追加，禁止覆盖；使用 `patch`、Python `open(..., 'a')` 或 `cat >>`，严禁 `write_file` 或 `>` 重定向。
3. **校验：** 写入后检查文件大小没有缩小、最新执行编号没有倒退、`tail -20` 确认最新记录在文件末尾。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 11 files, 144 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 75 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 边界扫描

- `AppModule` 未导入 `DeviceModule` / `EventModule` / `PrismaModule` ✅
- `DeviceModule` 未注册 `DEVICE_PORT` / `DEVICE_AUTH_PORT` / `PrismaDevice*` / `DevicePrisma*` ✅
- `EventModule` 未注册 `EVENT_PORT` / `PrismaEventPort` ✅
- 无 `new PrismaClient`、无 `@prisma/client` import、无数据库连接、无 migrate ✅
- 无 Redis / 对象存储 / AI / 微信 SDK ✅

### 未越界

- 未新增依赖，未修改 lockfile。
- 未修改生产源码（`apps/api/src/**` 未修改）。
- 未修改 Prisma schema/config。
- 未实例化 `PrismaClient`。
- 未在 `DeviceModule`/`EventModule`/`AppModule` 中注册真实 adapter/provider。
- 未创建新的 Controller / HTTP 接口。

---

## 指令044 Prisma runtime boundary skeleton

**执行时间：** 2026-05-31 09:22 Asia/Shanghai  
**执行者：** Hermes  
**目标：** 建立受控的 Prisma runtime 单一边界骨架，为后续 EventLog 真实持久化接入做准备。

### 新增文件

1. `apps/api/src/common/prisma-runtime/prisma-runtime.tokens.ts`
   - 定义 `PRISMA_CLIENT = Symbol.for("jewelry-api.prismaClient")` provider token

2. `apps/api/src/common/prisma-runtime/prisma-runtime.module.ts`
   - `PrismaRuntimeModule` 只导出 `PRISMA_CLIENT` provider
   - Provider factory 是本阶段唯一允许 `new PrismaClient()` 的位置
   - 不在 factory 中调用 `$connect()`（连接由 PrismaClient 懒加载）
   - `PrismaClientHolder` 实现 `OnModuleDestroy`，只调用 `$disconnect()`
   - 不导入 `AppModule`、`DeviceModule`、`EventModule`

3. `apps/api/test/prisma-runtime.module.spec.ts`
   - 验证 `PrismaClientHolder.onModuleDestroy()` 调用 `$disconnect()`
   - 验证 `$connect()` 不被调用
   - 使用 fake client，不连接真实数据库

### 边界守卫加强

`boundary-guard.spec.ts` 已更新：
- 允许 `prisma-runtime.module.ts` import `PrismaClient` 和 `@prisma/client`
- 禁止其他业务文件 import `PrismaClient` 或 `@prisma/client`
- 禁止任何文件调用 `$connect(`
- `AppModule` 不导入 `PrismaRuntimeModule` / `PrismaModule`
- `EventModule` 不注册 `PrismaEventPort` / `EVENT_PORT`
- `DeviceModule` 不注册 `DEVICE_PORT` / `DEVICE_AUTH_PORT`

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 12 files, 147 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 78 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 未越界

- 未修改 `AppModule`、`DeviceModule`、`EventModule` 注册
- 未注册 `PrismaEventPort` / `EVENT_PORT` / `DEVICE_PORT` / `DEVICE_AUTH_PORT` 为真实 provider
- 未调用 `$connect()` 或执行任何数据库 query
- 未连接真实数据库、未运行 migrate/seed
- 未新增依赖、未修改 lockfile

---

## 指令045 Prisma runtime boundary review repair

**执行时间：** 2026-05-31 09:30 Asia/Shanghai  
**执行者：** Hermes  
**目标：** 补齐指令044 未通过项：白盒测试计划更新、provider/token 元数据约束增强、明确 `new PrismaClient({} as never)` 的临时骨架性质。

### 修复内容

1. **白盒测试计划更新**：
   - `apps/api/docs/white-box-test-plan.md` 将指令044 覆盖项升级为**指令044 / 指令045**联合覆盖项。
   - 新增明确说明：`PrismaClient` import 和 `new PrismaClient()` 仅允许在 `prisma-runtime.module.ts`；`new PrismaClient(` 在整个源码树中只出现一次。
   - 新增明确说明：`PRISMA_CLIENT` token 由 `PrismaRuntimeModule` provider/export 元数据暴露；`providers` 中只有一个 `PRISMA_CLIENT` provider 使用 `useFactory`；`exports` 仅包含 `PRISMA_CLIENT`，不导出 `PrismaClientHolder`。
   - 新增明确说明：factory 不包含 `$connect(`、query 方法（`.findMany(`、`.findUnique(`、`.create(`、`.update(`、`.delete(`、`.upsert(`）或任何数据库操作。
   - 新增明确说明：`new PrismaClient({} as never)` 是 Prisma 7.8 adapter 尚未接入前的离线骨架占位，不得被解释为真实数据库 runtime 已可接入。

2. **`prisma-runtime.module.spec.ts` 增强**：
   - 保留原有 lifecycle fake client 测试（`$disconnect()` 被调用、`$connect()` 不被调用）。
   - 新增 "module metadata constraints" 测试组：
     - `PRISMA_CLIENT provider exists in module providers` — 通过源码分析证明 providers 数组包含 `PRISMA_CLIENT`。
     - `exports array contains PRISMA_CLIENT and does not contain PrismaClientHolder` — 通过源码分析证明 exports 数组仅含 `PRISMA_CLIENT`。
     - `PRISMA_CLIENT provider uses factory and is the only producer of the token` — 通过源码分析证明 providers 中只有一个 `PRISMA_CLIENT` provider 且使用 `useFactory`。
   - 新增 "source boundary constraints" 测试组：
     - `module source does not contain $connect( outside comments` — 逐行扫描非注释行，确认无 `$connect(`。
     - `factory does not execute query or connect in module source` — 确认非注释行不包含 `$connect(`、`.findMany(`、`.findUnique(`、`.create(`、`.update(`、`.delete(`、`.upsert(`。

3. **`boundary-guard.spec.ts` 增强（可选）**：
   - 新增 `new PrismaClient( must appear exactly once and only in prisma-runtime boundary` — 统计整个 `apps/api/src` 中 `new PrismaClient(` 的出现次数，断言为 1 且仅在 `prisma-runtime.module.ts`。
   - 新增 `prisma-runtime module source must not contain $connect( outside comments` — 逐行扫描 `prisma-runtime.module.ts`，排除注释行后确认无 `$connect(`。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 12 files, 154 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 78 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 未越界

- 未修改 `AppModule`、`DeviceModule`、`EventModule` 注册
- 未注册 `PrismaEventPort` / `EVENT_PORT` / `DEVICE_PORT` / `DEVICE_AUTH_PORT` 为真实 provider
- 未调用 `$connect()` 或执行任何数据库 query
- 未连接真实数据库、未运行 migrate/seed
- 未新增依赖、未修改 lockfile、未修改 Prisma schema/config

---

## 指令046 Prisma runtime metadata white-box repair

**执行时间：** 2026-05-31 13:06 Asia/Shanghai  
**执行者：** 线程02  
**目标：** 修复执行045未通过项，将 `PrismaRuntimeModule` provider/export 白盒测试从源码正则解析升级为真实 Nest module metadata 检查。

### 修复内容

1. `apps/api/test/prisma-runtime.module.spec.ts` 不再使用 `extractModuleBody` / `extractArray` 解析 `@Module({...})` 源码文本。
2. 新测试通过 `MODULE_METADATA` 与 `Reflect.getMetadata(...)` 读取 `PrismaRuntimeModule` 真实 Nest metadata：
   - `providers` 中只存在一个 `PRISMA_CLIENT` factory provider。
   - `exports` 包含 `PRISMA_CLIENT`。
   - `exports` 不包含 `PrismaClientHolder`。
   - `PrismaClientHolder` 仍作为 provider 存在，但保持私有不导出。
3. 保留 lifecycle fake client 测试，继续验证 `onModuleDestroy()` 只触发 `$disconnect()`，不触发 `$connect()`。
4. 保留 source/factory 边界检查；factory source 只读 `useFactory.toString()`，不执行真实 factory，不创建真实 `PrismaClient`。

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 12 files, 156 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 78 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 边界扫描

- `new PrismaClient()` 仅出现在 `apps/api/src/common/prisma-runtime/prisma-runtime.module.ts`。
- `apps/api/src` 中无 `$connect(` 实际调用。
- `AppModule` imports 仅包含 `RuntimeConfigModule`、`HealthModule`，未导入 `PrismaRuntimeModule` / `PrismaModule` / `DeviceModule` / `EventModule`。
- 未发现 migrate/seed、Redis client、对象存储 SDK、AI SDK、微信 SDK 接入。

### 未越界

- 未新增依赖，未修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改 `apps/api/src/app.module.ts`、`apps/api/src/modules/device/device.module.ts`、`apps/api/src/modules/event/event.module.ts`。
- 未将 `PrismaRuntimeModule` 导入任何业务 module。
- 未注册 `EVENT_PORT`、`PrismaEventPort`、`DEVICE_PORT`、`DEVICE_AUTH_PORT` 等真实 provider。
- 未调用 `$connect()`，未执行数据库 query，未连接真实数据库，未运行 migrate/seed。

---

## 指令047 module boundary metadata guard upgrade

**执行时间：** 2026-05-31 14:30 Asia/Shanghai  
**执行者：** 线程02  
**目标：** 将 `AppModule` / `DeviceModule` / `EventModule` 边界守卫由源码正则解析升级为真实 Nest module metadata 检查。

### 修复内容

1. `apps/api/test/boundary-guard.spec.ts` 引入 `MODULE_METADATA` 与 `Reflect.getMetadata(...)`，新增 metadata helper：
   - `getModuleImports(moduleClass)`
   - `getModuleProviders(moduleClass)`
   - `providerToken(provider)`
   - `providerName(provider)`
   - `providerMatchesToken(provider, token)`
2. `AppModule` imports 守卫改为读取真实 metadata，断言未导入：
   - `DeviceModule`
   - `EventModule`
   - `PrismaRuntimeModule`
   - `PrismaModule`
3. `EventModule` providers 守卫改为读取真实 metadata，断言未注册：
   - `EVENT_PORT`
   - `PrismaEventPort`
4. `DeviceModule` providers 守卫改为读取真实 metadata，断言未注册：
   - `DEVICE_PORT`
   - `DEVICE_AUTH_PORT`
   - 名称匹配 `PrismaDevice` 或 `DevicePrisma` 的 provider
5. 保留原有源码扫描类测试：
   - 禁止非边界 `PrismaClient` / `@prisma/client`
   - 禁止 Redis、对象存储、AI、微信 SDK
   - 禁止业务路由 controller
   - 禁止 `$connect(` 实际调用
   - `new PrismaClient(` 单点约束

### 校验结果

| Command | Result |
|---------|--------|
| `python3 -m json.tool apps/api/package.json` | Passed |
| `pnpm --filter @jewelry/api prisma:validate` | Passed — schema valid 🚀 |
| `pnpm --filter @jewelry/api prisma:generate` | Passed — client generated |
| `pnpm --filter @jewelry/api test` | Passed — 12 files, 156 tests |
| `pnpm typecheck` | Passed — 6/6 workspace packages |
| `pnpm lint` | Passed — 78 files checked |
| `pnpm --filter @jewelry/api build` | Passed |

### 边界扫描

- `boundary-guard.spec.ts` 不再包含 `@Module({...})` 源码正则提取逻辑、`importsMatch`、`providersMatch`、`importsArray` 或 `providersArray`。
- `new PrismaClient(` 仅出现在 `apps/api/src/common/prisma-runtime/prisma-runtime.module.ts`。
- `apps/api/src` 中无 `$connect(` 实际调用。
- `AppModule` metadata imports 未包含 `PrismaRuntimeModule` / `PrismaModule` / `DeviceModule` / `EventModule`。
- `EventModule` metadata providers 未包含 `EVENT_PORT` / `PrismaEventPort`。
- `DeviceModule` metadata providers 未包含 `DEVICE_PORT` / `DEVICE_AUTH_PORT` / `PrismaDevice*` / `DevicePrisma*`。
- 未发现 migrate/seed、Redis client、对象存储 SDK、AI SDK、微信 SDK 接入。

### 未越界

- 未新增依赖，未修改 lockfile。
- 未修改 Prisma schema/config。
- 未修改任何 `apps/api/src/**` 生产源码。
- 未将 `PrismaRuntimeModule`、`DeviceModule`、`EventModule` 导入 `AppModule`。
- 未在 `DeviceModule` 或 `EventModule` 注册任何真实 port/provider。
- 未调用 `$connect()`，未执行数据库 query，未连接真实数据库，未运行 migrate/seed。
