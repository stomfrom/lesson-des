# 星维设备管理系统 — 需求规格说明书

**文档版本**: v3.0  
**状态**: 已交付  
**更新日期**: 2026-07-01  

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [功能需求](#3-功能需求)
4. [数据库设计](#4-数据库设计)
5. [API 接口定义](#5-api-接口定义)
6. [前端页面清单](#6-前端页面清单)
7. [安全需求](#7-安全需求)
8. [非功能需求](#8-非功能需求)
9. [环境要求](#9-环境要求)
10. [项目文件结构](#10-项目文件结构)
11. [验证清单](#11-验证清单)

---

## 1. 项目概述

### 1.1 项目背景

构建一个企业级设备管理系统，实现对"星维设备"的全生命周期管理，包括设备基本信息登记、状态跟踪、维保提醒、数据概览统计、CSV 导出，以及基于 RBAC 的多用户权限管控。

### 1.2 项目目标

- 提供设备信息的增删改查、**详情查看**、**CSV 导出**
- 支持按设备名和状态筛选，**筛选自动重置分页**
- **数据概览 Dashboard**：设备总数、状态分布、维保统计、最近添加
- 自动识别临近维保日期的设备并标识提醒
- 实现基于角色的权限控制系统（管理员/普通用户）
- 管理员可添加用户并精细化分配操作权限
- 满足企业级安全要求（认证、授权、输入校验、攻击防护）

### 1.3 适用角色

| 角色 | 英文标识 | 说明 |
|------|---------|------|
| 系统管理员 | admin | 全部权限，包括设备管理和用户管理 |
| 普通用户 | operator | 设备 4 项操作（查看/新增/编辑/删除）由管理员单独分配 |

---

## 2. 系统架构

### 2.1 技术选型

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 前端框架 | Vue 3 (Composition API) | 3.5 | 响应式、组合式 API |
| 构建工具 | Vite | 8.1 | 极速 HMR、Rolldown 构建、代码分割 |
| UI 组件库 | Element Plus | 最新 | 企业级组件，unplugin 按需引入 |
| 状态管理 | Pinia | 3.0 | 轻量、类型安全、Composition API 原生 |
| 路由 | Vue Router | 5.1 | SPA 路由、导航守卫、动态路由 |
| 后端框架 | Express | 4.21 | 成熟稳定、中间件生态 |
| 数据库 | MySQL | 8.0 | 关系型、ACID、utf8mb4 字符集 |
| 数据库驱动 | mysql2 | 3.22 | 异步 Promise、连接池、预处理语句 |
| 认证 | jsonwebtoken | 9.x | 无状态 JWT，适合 RESTful API |
| 密码加密 | bcryptjs | 2.4 | 加盐哈希 10 轮，抗彩虹表 |

### 2.2 系统分层

```
┌──────────────────────────────────────────────────────┐
│              前端 SPA (Vue 3 + Vite)                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Dashboard │  │DeviceList│  │DeviceForm│           │
│  │ 数据概览   │  │列表/排序 │  │ 新增/编辑 │           │
│  │          │  │ 详情/导出 │  │ 表单验证 │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐                          │
│  │  Login   │  │UserManage│  ← admin only            │
│  │  JWT 登录 │  │用户/权限  │                          │
│  └──────────┘  └──────────┘                          │
│                                                      │
│  Pinia Store ─ Vue Router ─ Axios ─ Element Plus     │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP/JSON (Authorization: Bearer)
                       ▼
┌──────────────────────────────────────────────────────┐
│          后端 REST API (Express + MySQL2)              │
│                                                      │
│  helmet ─ cors ─ rate-limit ─ morgan ─ errorHandler  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │auth.js   │  │auth.js   │  │require- │           │
│  │(JWT校验)  │  │(路由总控) │  │Perm.js   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│  controllers → models → pool (mysql2/promise)        │
└──────────────────────┬───────────────────────────────┘
                       │ TCP :3306
                       ▼
┌──────────────────────────────────────────────────────┐
│            MySQL 8.0 (utf8mb4)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  users   │  │ devices  │  │permissions│           │
│  │  用户表   │  │  设备表   │  │  权限表   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

---

## 3. 功能需求

### 3.1 数据概览 Dashboard

- **路由**: `/` (登录后默认页)
- **前置条件**: 已登录
- **组件**: `Dashboard.vue`

| 区域 | 内容 | 数据源 |
|------|------|--------|
| 统计卡片 | 设备总数、正常运行、维保中、已报废、即将维保 | GET /api/devices/stats |
| 最近设备 | 最近添加的 5 台设备表格 | GET /api/devices/stats |
| 快捷操作 | 新增设备、查看列表、用户管理（admin） | 路由跳转 |

- 统计卡片用不同颜色区分（蓝色/绿色/橙色/灰色/红色）

### 3.2 设备信息管理

#### 3.2.1 查询设备列表

- **前置条件**: `device:read` 权限
- **描述**: 分页展示设备，支持按设备名模糊匹配和状态筛选
- **列表字段**: ID、设备名、型号、位置、状态、上次维保日期、操作
- **排序**: 所有列均可点击表头排序（客户端排序）
- **分页**: 支持 10/20/50 条每页，后端最大 100 条
- **高级特性**:
  - 筛选条件变更时自动重置到第 1 页
  - 搜索栏显示 `共 N 条结果`
  - 无数据时显示 `el-empty` 空状态
  - 表格行可点击弹出**详情对话框**

#### 3.2.2 新增设备

- **前置条件**: `device:create` 权限
- **表单**:
  - 设备名（必填，1-100 字符）
  - 型号（必填，1-100 字符）
  - 位置（必填，1-200 字符）
  - 状态（可选，默认 normal）
  - 上次维保日期（可选，不可选未来日期）
- **验证**: 前端 + 后端双重校验

#### 3.2.3 编辑设备

- **前置条件**: `device:update` 权限
- **描述**: 回显已有数据，修改后保存
- **脏表单保护**: 有未保存修改时离开弹窗确认

#### 3.2.4 删除设备

- **前置条件**: `device:delete` 权限
- **交互**: `el-popconfirm` 二次确认，**显示设备名**（如"确定要删除设备「XX」吗？"）

#### 3.2.5 设备详情查看

- **触发**: 点击设备列表行
- **展示**: `el-dialog` 弹窗，`el-descriptions` 带边框布局
- **字段**: ID、设备名、型号、位置、状态（含维保提醒）、维保日期、创建/更新时间

#### 3.2.6 设备列表导出 CSV

- **按钮**: 表格顶部「导出 CSV」
- **逻辑**: 导出当前页数据为 UTF-8 BOM CSV 文件
- **文件名**: `设备列表_YYYY-MM-DD.csv`（Windows 兼容）
- **字段**: ID、设备名、型号、位置、状态（中文）、维保日期、创建时间
- **空数据**: 列表为空时按钮禁用

### 3.3 设备维保提醒

- **业务规则**: 当 `status ≠ scrapped` 且 `TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= 11`
- **显示**: 状态栏橙色 `el-tag` 标签"即将维保"
- **例外**:
  - 已报废设备不显示
  - 从未维保（last_maintenance_date IS NULL）不显示

### 3.4 用户认证

#### 3.4.1 登录

- **流程**: 表单提交 → 后端 bcryptjs 校验 → 返回 JWT + 用户信息（含权限列表）
- **安全**: 不区分"用户不存在"和"密码错误"，统一返回 401
- **登录后跳转**: 先检查 `?redirect=` 参数，无则跳转 Dashboard

#### 3.4.2 注册

- **描述**: 任何人可注册，自动创建为 operator 角色
- **验证**: 用户名 3-50 字符（唯一）、密码 >= 6 字符

#### 3.4.3 Token 管理

- **JWT 载荷**: `{ id, username, role }`
- **有效期**: 默认 7 天（`JWT_EXPIRES_IN` 配置）
- **存储**: 前端持久化到 localStorage（`try/catch` 兜底 JSON 解析异常）
- **失效处理**: 401 响应时清除全部凭证并跳转 `/login`
- **生产密钥**: `NODE_ENV=production` 时 `JWT_SECRET` 为必填，缺失直接退出
- **请求取消**: 使用 `AbortController`，Axios 1.x 通过 `code === 'ERR_CANCELED'` 识别

### 3.5 权限控制 (RBAC)

#### 3.5.1 角色模型

| 角色 | 权限来源 | 说明 |
|------|---------|------|
| admin | 内置全部权限，跳过 `requirePermission` 中间件 | 管理员 |
| operator | 从 `permissions` 表动态加载 | 权限按需分配 |

#### 3.5.2 权限粒度

资源 `device` 的 4 种独立操作：

| 操作 | 对应 API | 前端按钮 |
|------|---------|---------|
| `read` | GET /api/devices, GET /api/devices/stats | 查看列表 |
| `create` | POST /api/devices | 新增设备按钮 |
| `update` | PUT /api/devices/:id | 编辑按钮 |
| `delete` | DELETE /api/devices/:id | 删除按钮 |

- admin 不受限制
- 前端根据 `userInfo.permissions` 条件渲染按钮（`v-if`）
- 后端 `requirePermission('device', 'action')` 中间件校验

#### 3.5.3 权限管理界面

- **入口**: 管理员「用户管理」页面
- **操作**: 对每位 operator 勾选/取消 4 个 checkbox，实时生效
- **后端逻辑**: `bulkSetPermissions` 先清空再批量插入

### 3.6 用户管理（管理员专属）

- **路由**: `/users`，路由守卫 `requireAdmin`
- **功能**:
  - 表格展示所有用户（ID/用户名/昵称/角色/权限）
  - 新增用户：`el-dialog` 弹窗，表单含用户名/密码/昵称
  - 权限分配：内联 checkbox 组

---

## 4. 数据库设计

### 4.1 用户表 (users)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | AUTO_INCREMENT, PK | 用户 ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 用户名 |
| password | VARCHAR(255) | NOT NULL | bcrypt 哈希 |
| nickname | VARCHAR(50) | DEFAULT '' | 昵称 |
| role | ENUM('admin','operator') | DEFAULT 'operator' | 角色 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### 4.2 设备表 (devices)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | AUTO_INCREMENT, PK | 设备 ID |
| name | VARCHAR(100) | NOT NULL | 设备名 |
| model | VARCHAR(100) | NOT NULL | 型号 |
| location | VARCHAR(200) | NOT NULL | 位置 |
| status | ENUM('normal','maintenance','scrapped') | DEFAULT 'normal' | 状态 |
| last_maintenance_date | DATE | DEFAULT NULL | 上次维保日期 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### 4.3 权限表 (permissions)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | AUTO_INCREMENT, PK | 权限 ID |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE | 用户 |
| resource | VARCHAR(50) | NOT NULL | 资源标识（device） |
| action | VARCHAR(50) | NOT NULL | 操作（create/read/update/delete） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**唯一约束**: `UNIQUE KEY uk_user_resource_action (user_id, resource, action)`

### 4.4 ER 关系

```
┌─────────┐       ┌───────────────────┐
│  users  │1────N│   permissions     │
│         │       │  (user_id FK)     │
└─────────┘       │  resource         │
                  │  action           │
        ┌─────────┴───────────────────┘
        │ controla acesso a
        ▼
┌──────────────┐
│   devices    │  (tabela independente)
└──────────────┘
```

### 4.5 建表脚本

独立 SQL 脚本位于项目根目录 `init.sql`，一行命令执行：

```bash
mysql -u root -p < init.sql
```

包含 `CREATE DATABASE IF NOT EXISTS` + `USE` + 3 张表，支持跨平台重复执行。

---

## 5. API 接口定义

### 5.1 公共接口

| 方法 | 路径 | 响应 | 错误码 |
|------|------|------|--------|
| GET | /api/health | `{code:200, db:"connected"}` | 503 |

### 5.2 认证接口

| 方法 | 路径 | 请求体 | 成功响应 | 错误码 |
|------|------|--------|---------|--------|
| POST | /api/auth/login | `{username, password}` | `{code:200, data:{token, userInfo}}` | 400/401 |
| POST | /api/auth/register | `{username, password, nickname?}` | `{code:201, data:{token, userInfo}}` | 400/409 |
| GET | /api/auth/profile | - | `{code:200, data:{}}` | 401 |

### 5.3 设备接口（需 JWT + 权限）

| 方法 | 路径 | 请求 | 所需权限 | 成功响应 | 错误码 |
|------|------|------|---------|---------|--------|
| GET | /api/devices | `?name=&status=&page=&pageSize=` | device:read | `{list, total, page, pageSize}` | 400/401/403 |
| GET | /api/devices/stats | - | device:read | `{total, byStatus, maintenanceDue, recent}` | 401/403 |
| GET | /api/devices/:id | - | device:read | `{code:200, data:{}}` | 400/401/403/404 |
| POST | /api/devices | `{name, model, location, status?, ...}` | device:create | `{code:201, data:{}}` | 400/401/403 |
| PUT | /api/devices/:id | `{name, model, location, status?, ...}` | device:update | `{code:200, data:{}}` | 400/401/403/404 |
| DELETE | /api/devices/:id | - | device:delete | `{code:200}` | 400/401/403/404 |

**返回结构说明**:
- 列表接口：响应拦截器已解包 `response.data`，data 层直接返回 `{list, total, page, pageSize}`
- 单条接口：data 层返回 `{code, data: {...}}` 结构

### 5.4 用户管理接口（需 JWT，仅 admin）

| 方法 | 路径 | 请求体 | 成功响应 | 错误码 |
|------|------|--------|---------|--------|
| GET | /api/users | - | `{code:200, data:[{user, permissions}]}` | 401/403 |
| GET | /api/users/:id/permissions | - | `{code:200, data:{user, permissions}}` | 400/401/403/404 |
| PUT | /api/users/:id/permissions | `{resource: "device", actions: [...]}` | `{code:200, data:{user_id, permissions}}` | 400/401/403/404 |

---

## 6. 前端页面清单

| 路由 | 页面 | 组件 | 权限 |
|------|------|------|------|
| /login | 登录页 | Login.vue | 无 |
| / | 数据概览 | Dashboard.vue | 需认证 |
| /devices | 设备列表 | DeviceList.vue | 需认证 + device:read |
| /devices/add | 新增设备 | DeviceForm.vue | 需认证 + device:create |
| /devices/edit/:id | 编辑设备 | DeviceForm.vue | 需认证 + device:update |
| /users | 用户管理（admin） | UserManage.vue | 需认证 + admin |
| /:pathMatch(.*)* | 404 页面 | NotFound.vue | 无 |

---

## 7. 安全需求

### 7.1 已实现的安全措施

| 类别 | 措施 | 实施位置 |
|------|------|---------|
| Web 安全头 | Helmet（XSS/点击劫持/MIME sniffing 等） | `middleware` |
| 跨域控制 | CORS 限制来源 | `app.js` |
| 请求限流 | 15 分钟 100 次 | `app.js` |
| 请求体限制 | JSON 和 URL-encoded 均 10KB | `app.js` |
| JWT 认证 | Bearer Token，Bearer 方式传递 | `middleware/auth.js` |
| 生产密钥校验 | NODE_ENV=production 缺少 JWT_SECRET 直接退出 | `config/index.js` |
| 授权中间件 | requirePermission(resource, action) 工厂模式 | `middleware/requirePermission.js` |
| SQL 注入 | 全部使用 `?` 占位符的参数化查询 | `models/*.js` |
| 密码哈希 | bcryptjs 加盐 10 轮 | `models/User.js` |
| 输入校验 | ID 数值、状态枚举、字段长度（前端+后端） | controllers |
| 错误脱敏 | NODE_ENV=production 时隐藏内部细节 | `middleware/errorHandler.js` |
| 前端路由守卫 | beforeEach 检查 token + admin-only 页面 | `router/index.js` |
| 401 自动跳转 | 响应拦截器自动清除凭证并跳转登录 | `api/request.js` |
| localStorage 防御 | JSON.parse 异常时 try/catch 兜底 | `store/modules/user.js` |
| 敏感文件保护 | .env 被 .gitignore 排除 | `.gitignore` |
| 优雅关闭 | SIGTERM/SIGINT 时 pool.end() + server.close() | `app.js` |

### 7.2 推荐的补充措施

- 部署使用 HTTPS
- 数据库使用专用用户而非 root
- 接入日志聚合和错误追踪
- 首次登录强制修改密码

---

## 8. 非功能需求

### 8.1 性能

| 指标 | 数据 |
|------|------|
| 前端构建总大小 | 约 750 KB（gzip 约 220 KB） |
| 业务代码 | 约 6 KB（按需加载） |
| Vendor 三方库 | 约 320 KB（vue/vue-router/pinia/axios 等） |
| Element Plus | 约 320 KB（按需引入） |
| 数据库连接池 | 默认 10 连接 |
| 分页上限 | 每页最多 100 条 |

### 8.2 可维护性

- **后端**: Model-Controller-Route 三层分离，职责清晰
- **前端**: View-API-Store 三层分离，组件按路由拆分
- **配置集中**: `server/src/config/index.js` + `.env`
- **跨平台**: 独立 `init.sql` 脚本，`start.bat` 一键启动

### 8.3 兼容性

- Node.js >= 18，ESM 模块
- MySQL >= 8.0
- 现代浏览器（Chrome/Firefox/Edge/Safari）

---

## 9. 环境要求

| 组件 | 版本要求 |
|------|---------|
| Node.js | >= 18 |
| MySQL | >= 8.0 |
| npm | >= 9 |
| 内存 | 服务器 >= 512 MB |
| 浏览器 | 支持 ES2020 |

---

## 10. 项目文件结构

```
shixun/
├── init.sql                          # 独立建库建表脚本（跨平台）
├── start.bat                         # Windows 一键启动脚本
├── README.md                         # 项目文档
│
├── .trae/specs/device-management/
│   ├── spec.md                       # 本需求文档
│   ├── test-report.md                # 生产环境测试报告
│   └── checklist.md                  # 验证清单
│
├── server/
│   ├── package.json
│   ├── .env                          # 环境变量（已配置）
│   ├── .env.example                  # 环境变量模板
│   ├── .gitignore
│   └── src/
│       ├── app.js                    # Express 入口 + 中间件
│       ├── seed.js                    # 初始用户种子脚本
│       ├── config/
│       │   ├── index.js              # 全局配置 + 环境校验
│       │   └── db.js                 # MySQL 连接池
│       ├── middleware/
│       │   ├── auth.js               # JWT 认证中间件（含权限加载）
│       │   ├── requirePermission.js  # 权限校验工厂
│       │   └── errorHandler.js       # 全局错误处理（生产脱敏）
│       ├── models/
│       │   ├── User.js               # 用户模型
│       │   ├── Device.js             # 设备模型（含统计）
│       │   ├── Permission.js         # 权限模型
│       │   └── init.sql              # 副本（server 目录下）
│       ├── controllers/
│       │   ├── authController.js     # 登录/注册/个人信息
│       │   ├── deviceController.js   # 设备 CRUD + 统计
│       │   └── permissionController.js # 用户权限 CRUD
│       └── routes/
│           ├── index.js              # 路由总控
│           ├── auth.js               # /api/auth/*
│           ├── devices.js            # /api/devices/*
│           └── permissions.js        # /api/users/*（admin only）
│
└── client/
    ├── package.json
    ├── vite.config.js                # Vite 配置 + El-Plus 按需引入
    ├── index.html
    └── src/
        ├── main.js                   # Vue 应用入口
        ├── App.vue                   # 根组件
        ├── api/
        │   ├── request.js            # Axios 实例 + 拦截器
        │   ├── auth.js               # 认证 API
        │   ├── device.js             # 设备 API
        │   └── permission.js         # 权限 API
        ├── store/modules/
        │   └── user.js               # Pinia 用户状态（localStorage 持久化）
        ├── router/
        │   └── index.js              # 路由配置 + 守卫
        ├── layouts/
        │   └── DefaultLayout.vue     # 布局（导航栏 + 页脚）
        ├── views/
        │   ├── Login.vue             # 登录页
        │   ├── Dashboard.vue         # 数据概览
        │   ├── DeviceList.vue        # 设备列表（排序/详情/导出）
        │   ├── DeviceForm.vue        # 新增/编辑设备
        │   ├── UserManage.vue        # 用户管理（admin only）
        │   └── NotFound.vue          # 404 页面
        └── utils/
            └── export.js             # CSV 导出工具
```

---

## 11. 验证清单

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 数据库 3 张表创建成功 | ✅ |
| 2 | 一键建库脚本 init.sql（跨平台） | ✅ |
| 3 | 一键启动脚本 start.bat | ✅ |
| 4 | GET /api/health（含 DB 连通性） | ✅ |
| 5 | 登录 - 正确凭据返回 JWT | ✅ |
| 6 | 登录 - 错误凭据返回 401 | ✅ |
| 7 | 登录 - redirect 参数正确跳转 | ✅ |
| 8 | 注册 - 新用户创建成功 | ✅ |
| 9 | Token 持久化 + 路由守卫 | ✅ |
| 10 | GET /api/devices 分页列表 | ✅ |
| 11 | GET /api/devices 按 name/status 筛选 | ✅ |
| 12 | 筛选条件变更自动重置分页 | ✅ |
| 13 | GET /api/devices/stats 统计接口 | ✅ |
| 14 | POST /api/devices 新增 | ✅ |
| 15 | PUT /api/devices/:id 编辑 | ✅ |
| 16 | DELETE /api/devices/:id 删除 | ✅ |
| 17 | 输入校验 - 无效 ID 返回 400 | ✅ |
| 18 | 输入校验 - 缺失必填字段返回 400 | ✅ |
| 19 | 输入校验 - 超长字段返回 400 | ✅ |
| 20 | 权限拦截 - 无认证返回 401 | ✅ |
| 21 | 权限拦截 - 无权限返回 403 | ✅ |
| 22 | 管理员添加用户 | ✅ |
| 23 | 管理员分配/回收权限（实时生效） | ✅ |
| 24 | 普通用户仅看到有权限的按钮 | ✅ |
| 25 | Dashboard 数据概览 | ✅ |
| 26 | 设备列表列排序 | ✅ |
| 27 | 设备详情对话框 | ✅ |
| 28 | 导出 CSV（Windows 文件名兼容） | ✅ |
| 29 | 删除确认显示设备名 | ✅ |
| 30 | 脏表单离开保护 | ✅ |
| 31 | 维保提醒（>11个月, 排除报废） | ✅ |
| 32 | 404 路由 | ✅ |
| 33 | 全局错误处理（生产脱敏） | ✅ |
| 34 | Helmet 安全头 + CORS + 限流 | ✅ |
| 35 | 优雅关闭（SIGTERM/SIGINT） | ✅ |
| 36 | 生产构建成功（0 error） | ✅ |
| 37 | 整体 CRUD 流程完整可用 | ✅ |
