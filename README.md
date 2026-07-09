# 星维设备管理系统 (Shixun Device Management)

企业级设备全生命周期管理系统，支持设备信息管理、状态跟踪、维保提醒、Dashboard 统计看板和 RBAC 精细化权限控制。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + Vite 8 + Pinia + Vue Router + Element Plus | SPA 单页应用，按需加载 |
| **后端** | Express 4 + MySQL2 + JWT + bcryptjs | RESTful API，参数化查询 |
| **数据库** | MySQL 8.0 | 四张表：users / devices / permissions / settings |
| **安全** | Helmet + CORS + Rate Limit + Body Limit | 生产级安全防护 |

## 快速开始

### 前置条件

- Node.js >= 18
- MySQL 8.0
- npm

### 安装

```bash
# 1. 克隆项目
git clone <repo-url> shixun
cd shixun

# 2. 安装后端依赖
cd server
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填写数据库连接信息和 JWT 密钥

# 4. 创建数据库并建表（独立脚本，跨平台）
mysql -u root -p < init.sql

# 5. 创建初始用户
node server/src/seed.js

# 6. 安装前端依赖
cd ../client
npm install
```

### 运行（开发模式）

```bash
# 终端 1 - 启动后端（默认端口 3000）
cd server && npm run dev

# 终端 2 - 启动前端（默认端口 5173）
cd client && npm run dev
```

访问 `http://localhost:5173`。也可直接双击 `start.bat` 一键启动。

### 生产构建

```bash
cd client && npm run build     # 输出在 client/dist/
cd server && NODE_ENV=production npm start
```

---

## 功能特性

### 设备管理
- **列表查询** — 分页展示，支持设备名模糊搜索和状态多选筛选
- **列排序** — 所有列（ID/名称/型号/位置/状态/维保日期）可点击排序
- **详情弹窗** — 点击行弹出完整信息对话框
- **新增/编辑** — 表单验证（设备名/型号/位置必填），编辑模式回显，脏表单离开保护
- **删除** — el-popconfirm 二次确认，提示文本含设备名
- **维保提醒** — 系统自动计算，超过阈值显示橙色"即将维保"标识
- **CSV 导出** — 导出当前页数据，含 BOM 头（UTF-8 中文兼容）和公式注入防护

### 数据概览 Dashboard
- **统计卡片** — 设备总数、正常运行、维保中、已报废、即将维保
- **最近设备** — 最近添加的 5 台设备
- **快捷操作** — 新增设备、查看列表、用户管理（管理员可见）

### 设备生命周期自动流转
- 每台设备独立配置**维保触发月数**（默认 11 月）和**报废触发月数**（默认 12 月）
- 超期未维保自动变为「维保中」，维保中超期自动变为「已报废」
- 每次访问 Dashboard 时自动执行

### 权限控制

| 角色 | 查看设备 | 新增设备 | 编辑设备 | 删除设备 | 用户管理 |
|------|---------|---------|---------|---------|---------|
| **管理员 (admin)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **普通用户 (operator)** | 可单独授权 | 可单独授权 | 可单独授权 | 可单独授权 | ❌ |

管理员通过「用户管理」页面为普通用户分配四个操作的任意组合，实时生效（事务保护）。

### 认证安全
- 密码使用 bcryptjs 加盐哈希存储（cost=10），**前端不处理密码**
- 登录采用 JWT，默认 7 天有效期
- 已删用户的 token 自动失效（每请求查库校验）
- `req.user` 从数据库读取而非 JWT 载荷，防角色过时
- 登录端点独立限流（15分钟10次）
- 前端 token 持久化到 localStorage，JSON 解析异常 try/catch 兜底

### UI 反馈
- **悬浮提示** — 操作结果（成功/失败）以浮动卡片形式显示在右下角，不遮挡页面主体
- **加载状态** — 列表和表单均有 v-loading 遮罩，Dashboard 统计卡片带加载态
- **空状态** — 无数据时显示 `el-empty` 友好提示
- **错误提示** — Element Plus ElMessage 自定义为右下角悬浮卡片样式，带左边框色条

---

| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| GET | /api/health | 否 | - | 健康检查 |
| POST | /api/auth/login | 否(限流) | - | 用户登录（15分钟10次） |
| POST | /api/auth/register | 否 | - | 用户注册 |
| GET | /api/auth/profile | 是 | - | 当前用户信息 |
| GET | /api/devices | 是 | device:read | 设备列表（分页+筛选+排序） |
| GET | /api/devices/stats | 是 | device:read | Dashboard 统计数据 |
| GET | /api/devices/:id | 是 | device:read | 设备详情 |
| POST | /api/devices | 是 | device:create | 新增设备 |
| PUT | /api/devices/:id | 是 | device:update | 更新设备 |
| DELETE | /api/devices/:id | 是 | device:delete | 删除设备 |
| GET | /api/users | 是 | admin | 用户列表（含权限） |
| GET | /api/users/:id/permissions | 是 | admin | 查询用户权限 |
| PUT | /api/users/:id/permissions | 是 | admin | 设置用户权限 |
| DELETE | /api/users/:id | 是 | admin | 删除用户（禁止删自己和admin） |

---

## 项目结构

```
shixun/
├── init.sql                        # 独立建库建表脚本（跨平台）
├── start.bat                       # Windows 一键启动脚本
├── restart-servers.bat             # 快速重启脚本
├── README.md                       # 项目文档
│
├── server/
│   ├── package.json
│   ├── .env.example                # 环境变量模板
│   ├── seed.js                     # 初始用户种子脚本
│   └── src/
│       ├── app.js                  # Express 入口 + 中间件
│       ├── config/
│       │   ├── index.js            # 全局配置 + 环境校验
│       │   └── db.js               # MySQL 连接池
│       ├── middleware/
│       │   ├── auth.js             # JWT 认证（含用户存在校验）
│       │   ├── requirePermission.js# 权限校验工厂
│       │   └── errorHandler.js     # 全局错误处理（生产脱敏）
│       ├── models/
│       │   ├── User.js             # 用户模型
│       │   ├── Device.js           # 设备模型（含统计+生命周期）
│       │   ├── Permission.js       # 权限模型（事务保护）
│       │   └── init.sql            # 建表副本
│       ├── controllers/
│       │   ├── authController.js   # 登录/注册/个人信息
│       │   ├── deviceController.js # 设备 CRUD + 统计
│       │   └── permissionController.js # 用户+权限管理
│       └── routes/
│           ├── index.js            # 路由总控
│           ├── auth.js             # /api/auth/*（登录限流）
│           ├── devices.js          # /api/devices/*
│           └── permissions.js      # /api/users/*（admin only）
│
├── client/
│   ├── package.json
│   ├── vite.config.js              # Vite + Element Plus 按需引入
│   └── src/
│       ├── main.js                 # Vue 入口
│       ├── App.vue                 # 根组件
│       ├── api/                    # API 请求模块
│       │   ├── request.js          # Axios 实例 + 401 同步清理
│       │   ├── auth.js             # 认证 API
│       │   ├── device.js           # 设备 API
│       │   └── permission.js       # 权限 API
│       ├── store/modules/user.js   # Pinia 用户状态（localStorage 同步）
│       ├── router/index.js         # 路由 + 守卫（认证+admin）
│       ├── layouts/DefaultLayout.vue # 布局（导航栏/页脚）
│       ├── views/
│       │   ├── Login.vue           # 登录页（开放重定向防护）
│       │   ├── Dashboard.vue       # 数据概览/统计看板
│       │   ├── DeviceList.vue      # 设备列表（排序/筛选/详情/导出）
│       │   ├── DeviceForm.vue      # 新增/编辑设备（含生命周期配置）
│       │   ├── UserManage.vue      # 用户管理（admin）
│       │   └── NotFound.vue        # 404
│       └── utils/
│           ├── toast.js            # 悬浮提示（操作位置附近弹窗）
│           ├── export.js           # CSV 导出（公式注入防护）
│           └── date.js             # UTC→本地时区转换
│
└── .trae/specs/device-management/
    ├── spec.md                     # 需求规格说明书 v3.0
    ├── test-report.md              # 生产环境测试报告（38项全通过）
    ├── audit-report.md             # 深度代码审计报告
    ├── full-chain.md               # 前后端数据库全链路文档
    ├── design-doc.md               # 需求分析与设计文档
    ├── defense-script.md           # 答辩文稿
    └── project-summary.md          # 项目摘要
```

---

## 安全设计

| 措施 | 说明 |
|------|------|
| 密码哈希 | bcryptjs (salt rounds=10)，**前端不处理密码** |
| 参数化查询 | 所有 SQL 使用 `?` 占位符，LIKE 通配符已转义 |
| JWT 认证 | 无状态 token，服务端验签 + 用户存在性校验 |
| 角色实时性 | `req.user` 从数据库读取而非 JWT 载荷，管理员降级立即生效 |
| Web 安全 | Helmet + CORS + Rate Limit (100 req/15min) + Body Limit (10KB) |
| 登录限流 | 独立限流 10次/15min，防暴力破解 |
| 错误脱敏 | NODE_ENV=production 时不暴露内部错误详情 |
| 输入校验 | 类型/长度/枚举值在前端和后端双重校验 |
| ID 校验 | 所有路由参数 `parseInt` 验证，拒绝 NaN 和 ≤0 |
| 事务保护 | 权限批量写入 BEGIN/COMMIT/ROLLBACK |
| 请求取消 | 前端 AbortController 防止竞态乱序 |
| 优雅关闭 | SIGTERM/SIGINT 时释放连接池，10s 超时强制退出 |
| 日期兼容 | 编辑设备时自动标准化 ISO 日期为 YYYY-MM-DD |
