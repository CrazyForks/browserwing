# 登录问题故障排查

## 问题描述
使用 admin/admin123 登录失败，返回 401 Unauthorized

## 可能的原因和解决方案

### 1. 检查配置文件

确保 `backend/config.toml` 中的认证配置正确：

```toml
[auth]
enabled = true
app_key = "your-secret-key-change-in-production"
default_username = "admin"
default_password = "admin123"
```

### 2. 查看后端日志

启动后端时，查看日志中的用户初始化信息：

```bash
cd backend
./browserwing
```

查找以下日志输出：
- `Current user count: X` - 显示当前用户数量
- `Existing users:` - 显示已存在的用户列表
- `Created default user:` - 显示新创建的默认用户

### 3. 查看登录尝试日志

当尝试登录时，后端会输出详细日志：
- `Login attempt: username=XXX` - 登录尝试
- `Login: user found: XXX` - 用户已找到
- `Login: password correct` - 密码正确
- `Login successful` - 登录成功

### 4. 清空数据库重新初始化

如果数据库中有旧数据，可以删除数据库文件重新初始化：

```bash
cd backend
rm -rf ./data/autowrite.db  # 或 ./data/browserwing.db
./browserwing
```

**警告：** 这会删除所有数据，包括脚本、配置等。

### 5. 手动检查数据库

使用数据库查看工具检查用户表：

```bash
# 安装 BoltDB 查看工具
go install github.com/br0xen/boltbrowser@latest

# 查看数据库
boltbrowser ./data/autowrite.db
```

或使用我们提供的调试脚本：

```bash
cd backend
go run -tags debug tools/check_users.go
```

### 6. 临时解决方案：创建测试用户

如果你有访问后端的权限，可以临时禁用认证进行测试：

在 `config.toml` 中设置：
```toml
[auth]
enabled = false  # 临时禁用
```

然后访问前端，进入设置页面创建用户，再重新启用认证。

## 常见错误

### 错误1：用户名或密码不匹配
**现象：** 401 错误，日志显示 `Login: invalid password`
**解决：** 
- 检查配置文件中的 `default_username` 和 `default_password`
- 确保没有多余的空格
- 密码区分大小写

### 错误2：数据库中已有其他用户
**现象：** 日志显示 `Existing users:` 列出其他用户
**解决：**
- 使用已存在的用户名密码登录
- 或删除数据库重新初始化

### 错误3：配置文件未正确加载
**现象：** 认证未启用或使用默认配置
**解决：**
- 确保配置文件路径正确
- 检查配置文件格式是否正确（TOML格式）
- 重启后端服务

## 调试命令

### 查看当前配置
```bash
cd backend
grep -A 5 "\\[auth\\]" config.toml
```

### 查看后端日志
```bash
tail -f ./log/browserwing.log  # 或 autowrite.log
```

### 测试登录接口
```bash
curl -X POST http://localhost:18088/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

成功响应示例：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "xxx",
    "username": "admin",
    "created_at": "2026-01-17T08:00:00Z",
    "updated_at": "2026-01-17T08:00:00Z"
  }
}
```

失败响应示例：
```json
{
  "error": "error.invalidCredentials"
}
```

## 联系支持

如果以上方法都无法解决问题，请：
1. 收集后端启动日志
2. 收集登录尝试日志
3. 提供配置文件（隐藏敏感信息）
4. 提交 GitHub Issue

## 更新记录

- 2026-01-17: 添加详细的调试日志输出
- 2026-01-17: 改进登录页面样式，符合 Notion 风格
