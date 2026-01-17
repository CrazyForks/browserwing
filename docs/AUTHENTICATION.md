# 认证功能使用指南

## 概述

BrowserWing 支持可选的用户认证功能，可以保护您的服务器接口不被未授权访问。

## 功能特性

- ✅ JWT Token 认证
- ✅ API Key 认证（用于脚本调用）
- ✅ 用户管理
- ✅ API密钥管理
- ✅ 多语言支持（中文、英文、日文、西班牙文、繁体中文）

## 启用认证

### 1. 修改配置文件

编辑 `backend/config.toml` 文件，启用认证：

```toml
[auth]
enabled = true  # 设置为 true 启用认证
app_key = "your-secret-key-change-this-in-production"  # JWT密钥，生产环境请务必修改
default_username = "admin"  # 默认管理员用户名
default_password = "admin123"  # 默认管理员密码
```

**重要提示：**
- `app_key` 用于生成 JWT Token，生产环境中请务必修改为强密码
- `default_username` 和 `default_password` 仅在首次启动时创建默认用户
- 如果数据库中已有用户，将不会创建默认用户

### 2. 重启服务

修改配置后，重启 BrowserWing 服务：

```bash
# 停止服务
Ctrl+C

# 启动服务
./browserwing
```

## 使用认证功能

### 前端登录

1. 启用认证后，访问前端页面会自动跳转到登录页面
2. 使用默认用户名和密码登录（admin / admin123）
3. 登录成功后会自动跳转到首页

### 用户管理

1. 登录后，点击右上角的设置图标
2. 选择"用户管理"标签页
3. 可以进行以下操作：
   - 创建新用户
   - 修改用户密码
   - 删除用户

### API密钥管理

API密钥用于脚本调用接口，无需使用 JWT Token。

1. 登录后，点击右上角的设置图标
2. 选择"API密钥"标签页
3. 可以进行以下操作：
   - 创建新的API密钥
   - 查看已有的API密钥
   - 删除API密钥

**注意：** API密钥创建后只显示一次，请妥善保管。

## API 调用

### 使用 JWT Token

前端会自动在请求头中添加 JWT Token：

```javascript
Authorization: Bearer <token>
```

### 使用 API Key

脚本调用 PlayScript 接口时，使用 API Key：

```bash
curl -X POST http://localhost:8080/api/v1/scripts/{id}/play \
  -H "X-BrowserWing-Key: bw_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 安全建议

1. **修改默认密码**：首次登录后立即修改默认管理员密码
2. **保护 app_key**：生产环境中使用强密码作为 JWT 密钥
3. **定期更新密钥**：定期更换 API 密钥和用户密码
4. **最小权限原则**：为不同用途创建不同的 API 密钥
5. **HTTPS**：生产环境中使用 HTTPS 加密传输

## 禁用认证

如果不需要认证功能，可以在配置文件中禁用：

```toml
[auth]
enabled = false
```

禁用后，所有接口无需认证即可访问。

## 接口说明

### 认证相关接口（无需认证）

- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/check` - 检查是否启用认证

### 用户管理接口（需要 JWT 认证）

- `GET /api/v1/users` - 列出所有用户
- `GET /api/v1/users/:id` - 获取用户信息
- `POST /api/v1/users` - 创建用户
- `PUT /api/v1/users/:id/password` - 更新密码
- `DELETE /api/v1/users/:id` - 删除用户

### API密钥管理接口（需要 JWT 认证）

- `GET /api/v1/api-keys` - 列出当前用户的API密钥
- `GET /api/v1/api-keys/:id` - 获取API密钥详情
- `POST /api/v1/api-keys` - 创建API密钥
- `DELETE /api/v1/api-keys/:id` - 删除API密钥

### 脚本执行接口（支持 JWT 或 API Key 认证）

- `POST /api/v1/scripts/:id/play` - 执行脚本（支持JWT Token或API Key）

### MCP 端点（需要 API Key 认证）

- `ANY /api/v1/mcp/sse` - MCP SSE 连接端点
- `ANY /api/v1/mcp/sse_message` - MCP SSE 消息端点
- `ANY /api/v1/mcp/message` - MCP Streamable HTTP 端点

**注意：** 如果配置了独立的MCP HTTP服务器（MCPPort），该服务器暂不支持认证，建议仅在开发环境使用。

其他所有接口都需要 JWT Token 认证。

## 故障排查

### 无法登录

1. 检查配置文件中 `auth.enabled` 是否为 `true`
2. 检查用户名和密码是否正确
3. 查看服务器日志是否有错误信息

### API 调用返回 401

1. 检查是否已登录
2. 检查 Token 是否过期（默认7天）
3. 检查 API Key 是否正确

### 忘记密码

如果忘记管理员密码，可以：

1. 停止服务
2. 删除数据库文件 `./data/autowrite.db`
3. 重启服务，将使用默认用户名和密码创建新用户

**警告：** 删除数据库会丢失所有数据，请谨慎操作。

## 技术实现

- **JWT Token**：使用 HS256 算法，有效期7天
- **密码存储**：当前为明文存储（建议后续升级为 bcrypt 加密）
- **API Key**：使用 UUID v4 生成，前缀为 `bw_`
- **数据库**：使用 BoltDB 存储用户和API密钥信息

## 后续改进计划

- [ ] 密码使用 bcrypt 加密存储
- [ ] 支持 Token 刷新机制
- [ ] 支持角色和权限管理
- [ ] 支持 OAuth2 第三方登录
- [ ] 支持 API Key 过期时间设置
- [ ] 支持登录日志和审计
