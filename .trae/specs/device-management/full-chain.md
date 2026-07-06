# 星维设备管理系统 — 前后端数据库全链路文档

本文档追踪一个请求从浏览器 UI → Express 路由 → 中间件 → 控制器 → 模型 → MySQL 的完整链路。

---

## 目录

1. [系统总架构图](#1-系统总架构图)
2. [登录流程完整链路](#2-登录流程完整链路)
3. [设备列表查询链路](#3-设备列表查询链路)
4. [新增设备链路](#4-新增设备链路)
5. [设备详情弹窗链路](#5-设备详情弹窗链路)
6. [删除设备链路](#6-删除设备链路)
7. [Dashboard 统计链路](#7-dashboard-统计链路)
8. [用户管理链路](#8-用户管理链路)
9. [权限分配链路](#9-权限分配链路)
10. [中间件调用栈](#10-中间件调用栈)

---

## 1. 系统总架构图

```
┌──────────────────────────────────────────────────────────────────┐
│  浏览器 (Vue 3 SPA)                                              │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐  │
│  │ 页面组件  │──▶│  Vue      │──▶│  Pinia   │──▶│ LocalStorage │  │
│  │ (views/) │   │  Router   │   │  Store   │   │ (token/权限)  │  │
│  └────┬─────┘   └──────────┘   └──────────┘   └──────────────┘  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ API 模块  │  Axios 实例                                       │
│  │ (api/)   │  - 请求拦截器: 注入 Bearer token                    │
│  │          │  - 响应拦截器: 解包 response.data                   │
│  │          │  - 401 拦截: 清除 token, 跳转 /login                │
│  └────┬─────┘                                                   │
└───────┼─────────────────────────────────────────────────────────┘
        │ HTTP/JSON (localhost:5173 → proxy → localhost:3000)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  Express 后端                                                    │
│                                                                  │
│  ① helmet()       - 安全头 (XSS/点击劫持/MIME-sniffing)          │
│  ② cors()         - 跨域限制                                     │
│  ③ rateLimit()    - 全局限流 100次/15min                        │
│  ④ morgan()       - 请求日志                                     │
│  ⑤ express.json() - Body 解析 (10KB 限制)                       │
│                                                                  │
│  ⑥ Routes (/api/*)                                              │
│     ├── /health        → 无认证                                  │
│     ├── /auth/*        → loginLimiter(10次/15min) + 无认证       │
│     ├── /devices/*     → authMiddleware → requirePermission      │
│     └── /users/*       → authMiddleware → adminOnly              │
│                                                                  │
│  ⑦ Controllers       接收 req, 调用 Model, 返回 res             │
│  ⑧ Models            执行参数化 SQL, 返回数据                    │
│                                                                  │
│  ⑨ errorHandler()    全局兜底                                    │
└───────┼─────────────────────────────────────────────────────────┘
        │ mysql2/promise (连接池)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  MySQL 8.0 (utf8mb4)                                            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  users   │  │ devices  │  │permissions│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 登录流程完整链路

### 前端 → 后端 → 数据库

```
用户输入 admin / admin123
        │
        ▼
┌──────────────────── Login.vue ────────────────────┐
│  handleLogin()                                     │
│  ① formRef.value?.validate()  → 表单验证           │
│  ② login({ username, password })                   │
│     └─ request.post('/auth/login', data)           │
└──────────────────── Axios ─────────────────────────┘
        │ POST /api/auth/login
        │ Content-Type: application/json
        ▼
┌──────────────────── routes/auth.js ────────────────┐
│  router.post('/auth/login', loginLimiter, login)   │
│         ↑                          ↑               │
│  限流中间件                 authController.login()  │
│  (10次/15min)                                       │
└────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────── controllers/authController.js ──────────────┐
│  login()                                                       │
│  ① 校验 username, password 非空                                │
│  ② User.findByUsername(username)                               │
│     └─ SELECT id, username, password, nickname, role           │
│        FROM users WHERE username = ?                           │
│  ③ bcrypt.compare(password, user.password)                     │
│  ④ 失败 → 401 (统一提示"用户名或密码错误")                      │
│  ⑤ 成功 → jwt.sign({ id, username, role }, JWT_SECRET)        │
│  ⑥ enrichUserInfo(user)  → 查 permissions 表                  │
│  ⑦ 返回 { token, userInfo }                                   │
└───────────────────────────────────────────────────────────────┘
        │ 200 OK
        │ { code:200, data: { token, userInfo: {  } } }
        ▼
┌──────────────────── Login.vue ────────────────────┐
│  ① res.data.token    → userStore.setToken(token)  │
│     └─ localStorage.setItem('token', token)        │
│  ② res.data.userInfo → userStore.setUserInfo(info)│
│     └─ localStorage.setItem('userInfo', ...)       │
│  ③ router.push(safe || '/dashboard')              │
│     (redirect 只允许相对路径)                        │
└────────────────────────────────────────────────────┘
```

### 响应数据结构

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "role": "admin"
      // operator 还会包含:
      // "permissions": [{"resource":"device","action":"read"}, ...]
    }
  },
  "message": "登录成功"
}
```

### Token 验证中间件（后续请求自动携带）

```
每次请求 → Axios 请求拦截器
  └─ localStorage.getItem('token')
  └─ config.headers.Authorization = `Bearer ${token}`
       │
       ▼
┌────────────── middleware/auth.js ──────────────────────┐
│  authMiddleware()                                       │
│  ① 取 Authorization header                             │
│  ② jwt.verify(token, JWT_SECRET)                       │
│  ③ User.findById(decoded.id)  → 用户是否存在            │
│  ④ 不存在 → 401 "用户已被删除"                           │
│  ⑤ 存在 → req.user = decoded                           │
│  ⑥ admin → 直接 next()                                 │
│  ⑦ operator → 查 permissions 表 → req.permissions      │
│  ⑧ next()                                              │
└────────────────────────────────────────────────────────┘
```

---

## 3. 设备列表查询链路

### 场景：用户进入设备管理页，显示第 1 页

```
DeviceList.vue (onMounted → fetchDevices())
        │
        ▼
┌────────────────── api/device.js ──────────────────────┐
│  getDevices({ page:1, pageSize:20 },                  │
│             { signal: abortController.signal })        │
│  → request.get('/devices', { params, signal })         │
└────────────────────────────────────────────────────────┘
        │ GET /api/devices?page=1&pageSize=20
        │ Authorization: Bearer ...
        ▼
┌────────────────── 路由层 ──────────────────────────────┐
│  app.js → routes/index.js                              │
│  routes.use('/devices', authMiddleware, devicesRouter)  │
│         ↑                    ↑                         │
│   检查 token          校验 device:read 权限              │
│   middleware/auth.js  middleware/requirePermission.js   │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────── controllers/deviceController.js ─────────────┐
│  getDevices()                                            │
│  ① 取 query: name?, status?, page, pageSize             │
│  ② Device.findAll({ name, status, page, pageSize })     │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────── models/Device.js ────────────────────────────┐
│  findAll({ name, status, page, pageSize })               │
│                                                          │
│  // 1. 构造查询 SQL                                      │
│  sql = `SELECT id, name, model, location, status,        │
│         last_maintenance_date, created_at, updated_at    │
│         FROM devices WHERE 1=1`                          │
│                                                          │
│  // 2. 可选筛选条件                                       │
│  if (name)  → AND name LIKE '%xxx%'  (通配符已转义)      │
│  if (status)→ AND status = ?                             │
│                                                          │
│  // 3. 总数查询                                           │
│  countSql = REPLACE(columns, 'COUNT(*) AS total')        │
│  → SELECT COUNT(*) AS total FROM devices WHERE ...       │
│                                                          │
│  // 4. 分页                                               │
│  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'    │
│  pageSize: min(max(userInput, 1), 100)                  │
│                                                          │
│  // 5. 返回                                              │
│  return { list: rows, total, page, pageSize }           │
└─────────── MySQL ───────────────────────────────────────┘
        │
        ▼
┌─────────── 响应回传 ───────────────────────────────────┐
│  res.json({ code: 200, list: [...], total: 5,           │
│             page: 1, pageSize: 20 })                    │
│                                                          │
│  Axios 响应拦截器 → response.data 解包                   │
│  → DeviceList.vue 收到 { list, total, page, pageSize }  │
│  → devices.value = res.list                             │
│  → total.value = res.total                              │
│  → 渲染 el-table                                        │
└─────────────────────────────────────────────────────────┘
```

### 数据库实际执行

```sql
-- 总数查询
SELECT COUNT(*) AS total FROM devices WHERE 1=1;

-- 数据查询 (已转义 LIKE, 分页)
SELECT id, name, model, location, status,
       last_maintenance_date, created_at, updated_at
FROM devices
WHERE 1=1
  AND name LIKE '%搜索词%'   -- 如有筛选
  AND status = ?            -- 如有筛选
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

---

## 4. 新增设备链路

### 场景：表单填写 → 提交

```
DeviceForm.vue
  │  handleSubmit()
  │  ① formRef.value?.validate()  → Element Plus 表单验证
  │     设备名: required, max 100
  │     型号: required, max 100
  │     位置: required, max 200
  │     日期: disabledDate (不可选未来)
  │  ② createDevice({ ...form })
  │     → request.post('/devices', data)
  └──▶ POST /api/devices
        Authorization: Bearer ...
        Body: { name:"服务器A", model:"HP-DL380", location:"机房",
               status:"normal", last_maintenance_date:"2026-01-15" }
             │
             ▼
┌─── 路由层 ─────────────────────────────────────────────┐
│  authMiddleware → requirePermission('device', 'create') │
│  → devicesRouter → deviceController.createDevice()      │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── controllers/deviceController.js ────────────────────┐
│  createDevice()                                         │
│  // 后端验证 (防御性，前端已校验)                         │
│  ① name, model, location 非空                           │
│  ② status 在 ['normal','maintenance','scrapped'] 中    │
│  ③ status !== ''                                        │
│  ④ 各字段长度 ≤ 100/200                                 │
│  ⑤ last_maintenance_date 格式 YYYY-MM-DD + 有效日期     │
│  ⑥ Device.create({...})                                 │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── models/Device.js ───────────────────────────────────┐
│  create({ name, model, location, status,                │
│           last_maintenance_date })                      │
│                                                          │
│  sql = INSERT INTO devices                               │
│        (name, model, location, status,                   │
│         last_maintenance_date)                           │
│        VALUES (?, ?, ?, ?, ?)                            │
│                                                          │
│  params = [name, model, location,                        │
│            status || 'normal',                           │
│            last_maintenance_date || null]                │
│                                                          │
│  // INSERT 后重新查询完整记录                             │
│  return this.findById(result.insertId)                   │
└─────────── MySQL ───────────────────────────────────────┘
             │
             ▼
┌─── 响应 ───────────────────────────────────────────────┐
│  201 Created                                            │
│  { code:201, data: { id:10, name:"服务器A", ... },      │
│    message:"设备创建成功" }                              │
│                                                          │
│  DeviceForm.vue                                         │
│  → ElMessage.success('设备创建成功')                     │
│  → router.push({ name: 'DeviceList' })                  │
└─────────────────────────────────────────────────────────┘
```

### 数据库执行

```sql
INSERT INTO devices (name, model, location, status, last_maintenance_date)
VALUES ('服务器A', 'HP-DL380', '机房', 'normal', '2026-01-15');

SELECT id, name, model, location, status,
       last_maintenance_date, created_at, updated_at
FROM devices WHERE id = LAST_INSERT_ID();
```

---

## 5. 设备详情弹窗链路

### 场景：点击设备列表某一行

```
DeviceList.vue
  │  @row-click="handleRowClick(row)"
  │  ① getDevice(row.id)
  │     → request.get(`/devices/${row.id}`)
  │  ② 成功 → detailData = res.data, detailVisible = true
  │  ③ el-dialog 渲染 el-descriptions
  └──▶ GET /api/devices/10
        Authorization: Bearer ...
             │
             ▼
┌─── 路由 / 中间件 ──────────────────────────────────────┐
│  authMiddleware → requirePermission('device', 'read')   │
│  → controller.getDevice()                               │
│    parseId('10') → 10 ✓                                 │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── controllers/deviceController.js ────────────────────┐
│  getDevice()                                            │
│  ① parseId(req.params.id)   → NaN / ≤0 返回 400        │
│  ② Device.findById(id)      → null 返回 404             │
│  ③ res.json({ code:200, data: device })                │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── models/Device.js ───────────────────────────────────┐
│  findById(id)                                           │
│  SELECT id, name, model, location, status,              │
│         last_maintenance_date, created_at, updated_at   │
│  FROM devices WHERE id = ?                              │
└─────────── MySQL ───────────────────────────────────────┘
             │
             ▼
┌─── 前端显示 ───────────────────────────────────────────┐
│  toLocalDate(last_maintenance_date)  → "2026-01-15"     │
│  toLocalDatetime(created_at)         → "2026-07-01 09:06"│
│  (UTC → UTC+8 本地时间转换)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 删除设备链路

### 场景：点击删除 → 弹窗确认 → 执行

```
DeviceList.vue
  │  el-popconfirm :title="`确定要删除设备「${row.name}」吗？`"
  │       ↓ 用户点击 "确定"
  │  @confirm="handleDelete(row.id)"
  │  → deleteDevice(id)
  │    → request.delete(`/devices/${id}`)
  └──▶ DELETE /api/devices/10
        Authorization: Bearer ...
             │
             ▼
┌─── 路由 / 中间件 ──────────────────────────────────────┐
│  authMiddleware → requirePermission('device', 'delete') │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── controllers/deviceController.js ────────────────────┐
│  deleteDevice()                                         │
│  ① parseId → 无效返回 400                               │
│  ② Device.delete(id)                                    │
│  ③ false → 404 "设备不存在"                              │
│  ④ true → 200 "设备删除成功"                             │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── models/Device.js ───────────────────────────────────┐
│  delete(id)                                             │
│  DELETE FROM devices WHERE id = ?                       │
│  return affectedRows > 0                                │
└─────────── MySQL ───────────────────────────────────────┘
             │
             ▼
┌─── 前端 ───────────────────────────────────────────────┐
│  ElMessage.success('删除成功')                           │
│  fetchDevices()  → 刷新列表                             │
└─────────────────────────────────────────────────────────┘
```

### 数据库执行

```sql
DELETE FROM devices WHERE id = 10;
-- 影响行数 = 1 → return true
-- 级联: 无 (permissions 引用 users, 不引用 devices)
```

---

## 7. Dashboard 统计链路

### 场景：登录后进入首页

```
Dashboard.vue
  │  onMounted → fetchStats()
  │  → getDeviceStats()
  │    → request.get('/devices/stats')
  └──▶ GET /api/devices/stats
        Authorization: Bearer ...
             │
             ▼
┌─── 路由 ───────────────────────────────────────────────┐
│  GET /stats (在 /:id 之前注册，避免匹配为 id)            │
│  authMiddleware → requirePermission('device', 'read')   │
│  → controller.getDeviceStats()                          │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── models/Device.js getStats() ────────────────────────┐
│  // 查询 1: 各状态计数                                    │
│  SELECT status, COUNT(*) AS count                       │
│  FROM devices GROUP BY status                           │
│  → { normal: 10, maintenance: 2, scrapped: 1 }         │
│                                                          │
│  // 查询 2: 即将维保计数                                  │
│  SELECT COUNT(*) AS count FROM devices                   │
│  WHERE status != 'scrapped'                              │
│    AND last_maintenance_date IS NOT NULL                 │
│    AND TIMESTAMPDIFF(MONTH, last_maintenance_date,       │
│                     CURDATE()) >= 11                    │
│  → { maintenanceDue: 3 }                                 │
│                                                          │
│  // 查询 3: 最近 5 台                                     │
│  SELECT columns FROM devices                             │
│  ORDER BY created_at DESC LIMIT 5                       │
│  → [{ id:10, name:"服务器A",... }, ...]                  │
│                                                          │
│  return { total, byStatus, maintenanceDue, recent }     │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── 前端 Dashboard.vue ─────────────────────────────────┐
│  统计卡片区域                                            │
│  总: 13  │  正常: 10  │  维保中: 2  │  报废: 1  │  即将: 3  │
│                                                          │
│  最近添加设备表格 (el-table)                              │
│  快捷操作按钮区                                          │
└─────────────────────────────────────────────────────────┘
```

### 全部 SQL（三次查询）

```sql
-- Q1: 状态统计
SELECT status, COUNT(*) AS count FROM devices GROUP BY status;

-- Q2: 维保预警 (TIMESTAMPDIFF 按月计算)
SELECT COUNT(*) AS count FROM devices
WHERE status != 'scrapped'
  AND last_maintenance_date IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= 11;

-- Q3: 最近设备
SELECT id, name, model, location, status,
       last_maintenance_date, created_at, updated_at
FROM devices ORDER BY created_at DESC LIMIT 5;
```

---

## 8. 用户管理链路

### 场景：管理员查看用户列表

```
UserManage.vue
  │  onMounted → fetchUsers()
  │  → getUsers()
  │    → request.get('/users')
  └──▶ GET /api/users
        Authorization: Bearer ...
             │
             ▼
┌─── 路由 ───────────────────────────────────────────────┐
│  routes/index.js → authMiddleware                       │
│  → permissionsRouter                                    │
│    → adminOnly 中间件: req.user.role === 'admin'        │
│      非 admin → 403                                     │
│  → permissionController.listUsers()                     │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── controllers/permissionController.js ───────────────┐
│  listUsers()                                            │
│  // Q1: 查所有用户                                       │
│  SELECT id, username, nickname, role, created_at        │
│  FROM users ORDER BY created_at DESC                    │
│                                                          │
│  // Q2: 批量查权限                                        │
│  permsRows = Permission.getPermissionsByUsers(userIds)   │
│  SELECT user_id, resource, action FROM permissions       │
│  WHERE user_id IN (?, ?, ?) ORDER BY user_id             │
│                                                          │
│  // 合并返回                                             │
│  data = rows.map(u => ({                                 │
│    ...u,                                                 │
│    permissions: permsMap[u.id] || []                     │
│  }))                                                     │
│  res.json({ code: 200, data })                          │
└─────────────────────────────────────────────────────────┘
```

### 数据库执行

```sql
-- 全部用户
SELECT id, username, nickname, role, created_at
FROM users ORDER BY created_at DESC;

-- 关联权限 (避免 N+1，一次性查完)
SELECT user_id, resource, action
FROM permissions
WHERE user_id IN (1, 2, 4)
ORDER BY user_id;
```

---

## 9. 权限分配链路

### 场景：管理员勾选/取消普通用户的权限 checkbox

```
UserManage.vue
  │  el-checkbox-group @change="onPermChange(row.id, val)"
  │  → setUserPermissions(userId, { resource:'device', actions:['read','create'] })
  │    → request.put(`/users/${userId}/permissions`, data)
  └──▶ PUT /api/users/2/permissions
        Body: { resource: "device", actions: ["read","create"] }
             │
             ▼
┌─── 路由 ───────────────────────────────────────────────┐
│  authMiddleware → adminOnly → setUserPermissions()      │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── controllers/permissionController.js ───────────────┐
│  setUserPermissions()                                   │
│  ① parseId(userId)  (NaN / ≤0 → 400)                   │
│  ② 查 users 表 → 用户存在? 角色?                        │
│  ③ admin 不可设置 → 400 "管理员无需设置"                 │
│  ④ resource 必须在 ['device'] 中                        │
│  ⑤ actions 必须在 ['create','read','update','delete']  │
│  ⑥ Permission.bulkSetPermissions(userId, resource,     │
│                                    actions)             │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─── models/Permission.js ───────────────────────────────┐
│  bulkSetPermissions(userId, resource, actions)          │
│  ┌─ conn = await pool.getConnection()                  │
│  │  await conn.beginTransaction()   ← 事务开始         │
│  │  DELETE FROM permissions                             │
│  │  WHERE user_id = ? AND resource = ?                 │
│  │                                                     │
│  │  if actions.length > 0:                             │
│  │    INSERT INTO permissions                          │
│  │    (user_id, resource, action)                      │
│  │    VALUES (?,?,?), (?,?,?), ...                     │
│  │                                                     │
│  │  await conn.commit()              ← 事务提交        │
│  └─ 异常 → await conn.rollback()     ← 事务回滚        │
│     最终 conn.release()                                │
│                                                          │
│  return { user_id, permissions: updated }               │
└─────────── MySQL ───────────────────────────────────────┘
```

### 数据库执行（事务内）

```sql
START TRANSACTION;

DELETE FROM permissions
WHERE user_id = 2 AND resource = 'device';

INSERT INTO permissions (user_id, resource, action) VALUES
(2, 'device', 'create'),
(2, 'device', 'read');

COMMIT;
-- 异常则 ROLLBACK
```

---

## 10. 中间件调用栈

### 按注册顺序

| 顺序 | 中间件 | 适用路由 | 作用 |
|------|--------|---------|------|
| 1 | `helmet()` | 全部 | 设置安全 HTTP 头 |
| 2 | `cors()` | 全部 | 跨域来源限制 |
| 3 | `rateLimit(100/15min)` | 全部 | 请求频率限制 |
| 4 | `morgan()` | 全部 | 请求日志 |
| 5 | `express.json(10kb)` | 全部 | JSON Body 解析 |
| 6 | `express.urlencoded(10kb)` | 全部 | URL-encoded Body |
| 7 | `/api/health` | GET /health | — |
| 8 | `/api/auth/login` | POST /auth/login | `loginLimiter(10/15min)` |
| 9 | `/api/auth/register` | POST /auth/register | — |
| 10 | `authMiddleware` | /devices/*, /users/* | JWT 验证 + 用户存在性 |
| 11 | `requirePermission` | /devices/* | device:read/create/update/delete |
| 12 | `adminOnly` | /users/* | role === admin |
| 13 | 各 Controller | 对应路由 | 业务逻辑 |
| 14 | `errorHandler` | 全部 | 全局错误兜底 |

### 一个典型设备操作的完整调用栈

```
请求: GET /api/devices?page=1&pageSize=20
                                       时间线 →
helmet() ──▶ cors() ──▶ rateLimit() ──▶ morgan() ──▶ express.json()
  │
  ▼
router.use('/api', ...)
  │
  ▼
routes/index.js → GET /health? 不匹配
                → authRouter  不匹配
                → authMiddleware()
                    ├── jwt.verify(token)         ← 解析 JWT
                    ├── User.findById(decoded.id) ← 检查用户存在
                    ├── admin? → 跳过权限查表
                    └── next()
                → requirePermission('device', 'read')
                    ├── admin? → 直接放行
                    └── operator? → 检查 req.permissions 含 device:read
                → devicesRouter
                    └── deviceController.getDevices()
                        └── Device.findAll({ page:1, pageSize:20 })
                            └── pool.execute(sql, params)
                                └── MySQL: SELECT ... LIMIT 20 OFFSET 0
  │
  ▼
res.json({ code:200, list:[...], total:5, page:1, pageSize:20 })
  │
  ▼
Axios 响应拦截器 → response.data → DeviceList.vue
```

### 错误路径

```
路由匹配不到      → 无   → 无输出 (路由无 '*' 兜底，但实际上有 /:pathMatch(.*)*)
解析 Body 失败    → 4   → express.json() → 400
JWT 过期/无效     → 10  → authMiddleware → 401
无 device:read    → 11  → requirePermission → 403
设备不存在        → 13  → controller → 404
参数校验失败      → 13  → controller → 400
DB 异常          → 14  → errorHandler → 500 (生产环境脱敏)
```

### 全局错误处理（errorHandler）

```javascript
// middleware/errorHandler.js
export default (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`)
  if (err.stack) console.error(err.stack)

  const status = err.status || 500

  // 生产环境: 500 级错误返回通用信息，不暴露堆栈
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误'

  res.status(status).json({ code: status, message })
}
```

---

## 附录：关键文件映射

| 功能模块 | 前端文件 | API 路径 | 后端路由 | 后端控制器 | 模型 | 数据库表 |
|---------|---------|----------|---------|-----------|------|---------|
| 登录 | `Login.vue` | POST /auth/login | `routes/auth.js` | `authController.login` | `User` | users |
| 注册 | Login 弹窗 | POST /auth/register | `routes/auth.js` | `authController.register` | `User` | users |
| 设备列表 | `DeviceList.vue` | GET /api/devices | `routes/devices.js` | `deviceController.getDevices` | `Device` | devices |
| 设备统计 | `Dashboard.vue` | GET /api/devices/stats | `routes/devices.js` | `deviceController.getDeviceStats` | `Device` | devices |
| 设备详情 | `DeviceList.vue` (弹窗) | GET /api/devices/:id | `routes/devices.js` | `deviceController.getDevice` | `Device` | devices |
| 新增设备 | `DeviceForm.vue` | POST /api/devices | `routes/devices.js` | `deviceController.createDevice` | `Device` | devices |
| 编辑设备 | `DeviceForm.vue` | PUT /api/devices/:id | `routes/devices.js` | `deviceController.updateDevice` | `Device` | devices |
| 删除设备 | `DeviceList.vue` | DELETE /api/devices/:id | `routes/devices.js` | `deviceController.deleteDevice` | `Device` | devices |
| 用户列表 | `UserManage.vue` | GET /api/users | `routes/permissions.js` | `permissionController.listUsers` | `User+Permission` | users+permissions |
| 权限设置 | `UserManage.vue` | PUT /api/users/:id/permissions | `routes/permissions.js` | `permissionController.setUserPermissions` | `Permission` | permissions |
| 删除用户 | `UserManage.vue` | DELETE /api/users/:id | `routes/permissions.js` | `permissionController.deleteUser` | `User` | users |
| CSV 导出 | `DeviceList.vue` | 纯前端 | — | — | — | — |
