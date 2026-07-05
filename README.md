# 星维设备管理系统 (Shixun Device Management)

企业级设备全生命周期管理系统，支持设备信息管理、状态跟踪、维保提醒和精细化权限控制。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + Vite 8 + Pinia + Vue Router + Element Plus | SPA 单页应用，按需加载 |
| **后端** | Express 4 + MySQL2 + JWT + bcryptjs | RESTful API，参数化查询 |
| **数据库** | MySQL 8.0 | 三张表：users / devices / permissions |
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

# 4. 创建数据库并建表
mysql -u root -p < src/models/init.sql

# 5. 创建初始用户
node src/seed.js

# 6. 安装前端依赖
cd ../client
npm install
```

### 运行（开发模式）

```bash
# 终端 1 - 启动后端（默认端口 3000）
cd server
npm run dev

# 终端 2 - 启动前端（默认端口 5173）
cd client
npm run dev
```

访问 `http://localhost:5173`。

### 生产构建

```bash
# 构建前端
cd client
npm run build
# 输出在 client/dist/

# 后端启动
cd server
NODE_ENV=production npm start
```

## 功能特性

### 设备管理
- **列表查询** — 分页展示，支持设备名和状态筛选
- **新增设备** — 表单验证（设备名、型号、位置为必填）
- **编辑设备** — 回显已有数据，修改后保存
- **删除设备** — el-popconfirm 二次确认后删除
- **维保提醒** — 上次维保距今超过 11 个月自动标注"即将维保"

### 权限控制

| 角色 | 查看设备 | 新增设备 | 编辑设备 | 删除设备 | 用户管理 |
|------|---------|---------|---------|---------|---------|
| **管理员 (admin)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **普通用户 (operator)** | 可单独授权 | 可单独授权 | 可单独授权 | 可单独授权 | ❌ |

管理员通过「用户管理」页面为普通用户分配四个操作的任意组合。

### 认证安全
- 密码使用 bcryptjs 加盐哈希存储
- 登录采用 JWT（JSON Web Token），默认 7 天有效期
- 前端 token 持久化到 localStorage
- 路由守卫拦截未认证访问
- 后端中间件逐接口校验 token 和权限

## API 概览

| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| GET | /api/health | 否 | - | 健康检查（含 DB 连通性） |
| POST | /api/auth/login | 否 | - | 用户登录 |
| POST | /api/auth/register | 否 | - | 用户注册 |
| GET | /api/auth/profile | 是 | - | 获取当前用户信息 |
| GET | /api/devices | 是 | device:read | 设备列表（分页+筛选） |
| GET | /api/devices/:id | 是 | device:read | 设备详情 |
| POST | /api/devices | 是 | device:create | 新增设备 |
| PUT | /api/devices/:id | 是 | device:update | 更新设备 |
| DELETE | /api/devices/:id | 是 | device:delete | 删除设备 |
| GET | /api/users | 是 | admin only | 用户列表（含权限） |
| PUT | /api/users/:id/permissions | 是 | admin only | 设置用户权限 |

## 项目结构

```
shixun/
├── client/                     # 前端 Vue 3 项目
│   ├── src/
│   │   ├── api/                # API 请求模块
│   │   │   ├── auth.js         # 认证相关
│   │   │   ├── device.js       # 设备相关
│   │   │   ├── permission.js   # 权限相关
│   │   │   └── request.js      # Axios 实例 & 拦截器
│   │   ├── layouts/            # 布局组件
│   │   │   └── DefaultLayout.vue
│   │   ├── router/index.js     # 路由配置 & 守卫
│   │   ├── store/modules/      # Pinia 状态管理
│   │   │   └── user.js
│   │   └── views/              # 页面组件
│   │       ├── Login.vue
│   │       ├── DeviceList.vue
│   │       ├── DeviceForm.vue
│   │       ├── UserManage.vue
│   │       └── NotFound.vue
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # 后端 Node.js 项目
│   ├── src/
│   │   ├── app.js              # Express 入口 & 中间件
│   │   ├── config/
│   │   │   ├── index.js        # 全局配置
│   │   │   └── db.js           # MySQL 连接池
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT 认证中间件
│   │   │   ├── requirePermission.js  # 权限校验中间件
│   │   │   └── errorHandler.js # 全局错误处理
│   │   ├── models/
│   │   │   ├── User.js         # 用户模型
│   │   │   ├── Device.js       # 设备模型
│   │   │   ├── Permission.js   # 权限模型
│   │   │   └── init.sql        # 建表脚本
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── deviceController.js
│   │   │   └── permissionController.js
│   │   └── routes/
│   │       ├── index.js        # 路由总控
│   │       ├── auth.js
│   │       ├── devices.js
│   │       └── permissions.js
│   ├── seed.js                 # 初始用户脚本
│   ├── .env.example
│   └── package.json
│
└── .trae/specs/device-management/
    ├── spec.md                 # 需求规格
    ├── tasks.md                # 任务拆分
    └── checklist.md            # 验证清单
```

## 安全设计

| 措施 | 说明 |
|------|------|
| 密码哈希 | bcryptjs (salt rounds=10) |
| 参数化查询 | 所有 SQL 使用 `?` 占位符，防注入 |
| JWT 认证 | 无状态 token，服务端只验签 |
| 中间件防护 | Helmet + CORS + Rate Limit (100 req/15min) + Body Limit (10KB) |
| 错误脱敏 | `NODE_ENV=production` 时不暴露内部错误详情 |
| 输入校验 | 类型/长度/枚举值在前端和后端双重校验 |
| ID 校验 | 所有路由参数先经 `parseInt` 验证再传数据库 |
| 请求取消 | 前端使用 AbortController 防止竞态 |
