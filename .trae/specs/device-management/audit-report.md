# 星维设备管理系统 — 深度审计报告

**审计日期**: 2026-07-01  
**审计范围**: 后端 16 个文件 + 前端 23 个文件  
**审计人员**: MiMoCode 深度审查双代理  
**总发现**: 45 项（后端 22 + 前端 23）

---

## 修复状态

| 严重级别 | 总数 | 已修复 | 未修复 |
|---------|------|--------|--------|
| CRITICAL | 7 | 4 | 3 |
| MEDIUM | 17 | 0 | 17 |
| LOW | 21 | 0 | 21 |

---

## 后端发现 (22项)

### CRITICAL (3)

| # | 文件:行 | 问题 | 严重性 | 修复状态 |
|---|---------|------|--------|---------|
| C1 | `config/index.js:5-7` | **JWT_SECRET 仅在生产环境校验**：开发环境 `config.jwt.secret` 为 undefined，所有 jwt.sign/verify 抛出 `JsonWebTokenError`，服务器启动即正常但认证全挂。 | 功能不可用 | ✅ 已修复 |
| C2 | `models/Permission.js:34-48` | **bulkSetPermissions 非原子操作**：先 DELETE 再 INSERT，中间崩溃则用户权限永久丢失，无恢复路径。 | 数据丢失 | ✅ 已修复 |
| C3 | `routes/auth.js:7` | **登录端点无独立限流**：全局限流 100次/15分钟 ≈ 6.7次/分钟，无账号锁定、无指数退避，配合 seed.js 弱密码（admin123/123456）可被暴力破解。 | 安全漏洞 | ✅ 已修复（10次/15分钟独立限流） |

### MEDIUM (10)

| # | 文件:行 | 问题 | 严重性 |
|---|---------|------|--------|
| M1 | `config/index.js:27` | **DB_PASSWORD 默认空字符串**：环境变量未设置时静默使用空密码连接。 | 安全 |
| M2 | `middleware/auth.js:13` | **已删除用户的 JWT 仍有效**：token 签发后不校验用户是否存在于 DB，删除用户的 token 7天内仍可访问系统。 | 安全 |
| M3 | `app.js:46-57` | **优雅关闭无超时机制**：`pool.end()` 挂起时进程永不退出，k8s/Docker 最终 SIGKILL 丢失请求。 | 可靠性 |
| M4 | `controllers/deviceController.js:36,59` | **last_maintenance_date 格式未校验**：`"not-a-date"` 或 `"9999-99-99"` 导致 DB 错误或静默存为 `0000-00-00`。 | 数据完整性 |
| M5 | `models/Device.js:10-13` | **LIKE 查询未转义通配符**：搜索 `name=100%` 时 `%` 被当作通配符而非字面字符。 | 功能正确性 |
| M6 | `models/Device.js:49-71` | **Device.update TOCTOU 竞态**：先 `findById` 检查存在性再 UPDATE，并发删除后 UPDATE 影响0行，返回 `{code:200, data:null}`。 | 功能正确性 |
| M7 | `middleware/errorHandler.js:8-10` | **非生产环境泄露 DB 错误细节**：`ER_DUP_ENTRY` 等暴露表名/列名/内部 schema。 | 安全 |
| M8 | `app.js` | **缺少 unhandledRejection 处理**：Node 15+ 对未捕获 Promise 拒绝直接终止进程。 | 可靠性 |
| M9 | `controllers/authController.js:49-73` | **注册时昵称长度未校验**：超过 VARCHAR(50) 时 strict 模式返回 500，非 strict 模式静默截断。 | 数据完整性 |
| M10 | `routes/index.js:11-18` | **健康检查暴露 DB 状态**：未认证即可探测 `db:connected/disconnected`，可用于指纹识别。 | 安全 |

### LOW (9)

| # | 文件:行 | 问题 |
|---|---------|------|
| L1 | `controllers/deviceController.js:63` | status 为空字符串 `""` 时跳过校验，ENUM 列被写入空值 |
| L2 | `seed.js:11,21` | 种子脚本日志输出明文密码到 stdout |
| L3 | `seed.js:6,14` | 硬编码弱密码 `admin123` / `123456` |
| L4 | `models/Device.js:73-76` | 硬删除设备，无审计追溯 |
| L5 | `models/init.sql:13-22` | devices 表缺索引（status, created_at） |
| L6 | `routes/index.js:11-18` | 健康检查无 DB 详情认证（同 M10，偏设计） |
| L7 | `controllers/permissionController.js:32,49,82` | userId 未校验 ≤ 0（-1/0 可通过 NaN 检查） |
| L8 | `models/User.js:22-29` | User.create 未校验 role 参数 |
| L9 | `controllers/permissionController.js:13-14` | listUsers 顺序查询（用户 + 权限）可优化为 JOIN |

---

## 前端发现 (23项)

### CRITICAL (4)

| # | 文件:行 | 问题 | 严重性 | 修复状态 |
|---|---------|------|--------|---------|
| C1 | `store/modules/user.js:8` | **JWT 存 localStorage**：任意 XSS 可窃取 token，无 httpOnly cookie 保护。 | 安全风险 | ❌ 未修复 |
| C2 | `views/Login.vue:56-57` | **开放重定向**：`/login?redirect=https://evil.com` 登录后跳转外部，钓鱼攻击向量。 | 安全漏洞 | ✅ 已修复（仅允许 `/` 开头相对路径） |
| C3 | `router/index.js:57-66` | **客户端 RBAC 可被绕过**：localStorage 中的 `userInfo.role` 可被篡改为 admin。后端虽有独立校验，但前端 admin 入口可被非 admin 访问到 404。 | 安全 | ❌ 未修复 |
| C4 | `api/request.js:22-28` | **401 处理未同步 Pinia**：仅清 localStorage，`userStore.token` 仍持有旧值，`userStore.logout()` 未调用。 | 状态不一致 | ❌ 未修复 |

### MEDIUM (7)

| # | 文件:行 | 问题 |
|---|---------|------|
| M5 | `store/modules/user.js:13` | `isLoggedIn` 仅检查 token 非空，过期/伪造 token 也返回 true |
| M6 | `store/modules/user.js` | 权限仅从 localStorage 加载，管理员修改后 operator 必须重新登录 |
| M7 | `views/DeviceList.vue:176` | AbortController 创建了 signal 但未传给 axios 请求，取消无效 |
| M8 | `views/PermissionManage.vue` | 死代码 — 无路由引用，功能与 UserManage.vue 重复 |
| M9 | `views/UserManage.vue:128` | 权限 checkbox 无防抖/锁，快速点击导致并发请求冲突 |
| M10 | `views/UserManage.vue:31` | `el-checkbox` 同时传 `label` 和 `value` 两个 prop，`value` 无效 |
| M11 | `layouts/DefaultLayout.vue` | 登录页也显示顶部导航栏，未隐藏导航/退出按钮 |

### LOW (12)

| # | 文件:行 | 问题 |
|---|---------|------|
| L12 | `views/Dashboard.vue` | 统计卡片无 loading/error 态，API 静默失败时全显示 0 |
| L13 | `views/DeviceList.vue:227` | CSV 导出仅导出当前页，忽略筛选条件 |
| L14 | `utils/export.js:32` | 临时 `<a>` 未 append 到 DOM，Firefox 可能下载失败 |
| L15 | `utils/export.js:27` | CSV 注入：设备名以 `=`/`+`/`-`/`@` 开头时 Excel 执行公式 |
| L16 | `App.vue` + `DefaultLayout.vue` | 登录页显示导航栏 |
| L17 | `layouts/DefaultLayout.vue:79` | `router-link-active` 匹配路径前缀，Dashboard 总高亮 |
| L18 | `main.js:10` | 全局错误处理仅 console.log，用户看到白屏 |
| L19 | `utils/index.js:7` | `formatDate` 无输入校验，无效日期输出 `NaN-aN-aN` |
| L20 | `utils/index.js` | `storage` + `formatDate` 从未被导入，死代码 |
| L21 | `components/HelloWorld.vue` | Vite 脚手架模板，从未被引用 |
| L22 | `middleware/permission.js` | 定义 `checkPermission()` 但无人调用 |
| L23 | `views/Home.vue` | 无路由注册，无法访问 |

---

## 修复建议优先级

### 第一优先（功能/安全阻断）

| 问题 | 理由 |
|------|------|
| C4 - 401 未同步 Pinia | 用户已登出但 store 认为仍在线，后续操作产生不可预期 401 链式失败 |
| M7 - AbortController 无效 | 快速切换筛选/翻页时请求结果乱序覆盖 |
| M5 - isLoggedIn 虚报 | 过期 token 用户看到空数据但不报错，体验断裂 |
| M6 - 权限缓存 | 管理员改权限后 operator 需强制退出才生效，业务流程阻断 |
| M2 - 已删用户 token 有效 | 删号安全措施形同虚设 |

### 第二优先（数据/体验）

| 问题 | 理由 |
|------|------|
| M1 - DB_PASSWORD 空字符串 | 配置错误无声，安全防线缺失 |
| M4 - 日期格式未校验 | 非法日期导致 500 或数据污染 |
| M5 - LIKE 通配符 | 含 `%` 的设备名搜索不准确 |
| M6 - TOCTOU 竞态 | 并发操作返回 `200 + null`，前端无防护 |
| M9 - 昵称长度 | 同 M4，输入未校验 |
| M9 - 权限竞态 | 用户管理页快速勾选丢失权限 |

### 第三优先（清理/优化）

- 删除死代码：`PermissionManage.vue`、`HelloWorld.vue`、`Home.vue`、`middleware/permission.js`
- 合并工具文件：`utils/index.js` 与 `utils/date.js` 重复
- 添加索引：`devices` 表 `status` 和 `created_at` 列建索引
- 软删除：`devices` 表加 `deleted_at` 列替代硬删除
- CSV 导出增强：添加公式注入防护、导出全部筛选结果
- 登录页隐藏导航栏：`App.vue` 条件渲染 layout

---

## 已验证正确的设计

审计过程中确认以下设计符合企业级标准：

- **全部 SQL 使用参数化查询**：零 SQL 注入风险 ✅
- **RBAC 架构正确**：admin 跳过中间件检查、permission/resource/action 白名单 ✅
- **密码哈希**：bcryptjs cost=10 ✅
- **请求体限制 10KB** ✅
- **Helmet 安全头** ✅
- **CORS 限制来源** ✅
- **外键 + ON DELETE CASCADE**：删除用户自动清理权限 ✅
- **INSERT IGNORE 种子脚本**：幂等执行 ✅
- **parseId 数字校验**：deviceController 中对 id 做了 NaN/<=0 校验 ✅
- **错误消息统一中文**：不泄露英文栈轨迹 ✅
