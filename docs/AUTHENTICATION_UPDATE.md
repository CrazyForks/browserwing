# 认证功能更新说明

## 更新时间
2026-01-17

## 更新内容

### 1. 脚本执行接口支持双重认证

**接口：** `POST /api/v1/scripts/:id/play`

**改进前：**
- 只支持 JWT Token 认证（用于前端调用）
- API Key 认证在单独的路由组中

**改进后：**
- 同时支持 JWT Token 和 API Key 认证
- 任一认证方式均可访问
- 内部调用（前端）使用 JWT Token
- 外部调用（脚本、程序）使用 API Key

**使用示例：**

```bash
# 使用 JWT Token
curl -H "Authorization: Bearer <token>" \
  -X POST http://localhost:8080/api/v1/scripts/123/play

# 使用 API Key
curl -H "X-BrowserWing-Key: bw_xxx" \
  -X POST http://localhost:8080/api/v1/scripts/123/play
```

### 2. MCP 端点添加 API Key 认证

**受影响的端点：**
- `/api/v1/mcp/sse` - SSE 连接端点
- `/api/v1/mcp/sse_message` - SSE 消息端点
- `/api/v1/mcp/message` - Streamable HTTP 端点

**改进前：**
- MCP 端点使用 JWT Token 认证
- 外部 MCP 客户端无法访问

**改进后：**
- MCP 端点使用 API Key 认证
- 外部 MCP 客户端可以使用 API Key 访问
- 更符合 MCP 协议的使用场景

**使用示例：**

```bash
# SSE 连接
curl -H "X-BrowserWing-Key: bw_xxx" \
  http://localhost:8080/api/v1/mcp/sse

# Streamable HTTP 消息
curl -H "X-BrowserWing-Key: bw_xxx" \
  -X POST http://localhost:8080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## 技术实现

### 新增中间件

**JWTOrApiKeyAuthenticationMiddleware**
- 同时支持 JWT Token 和 API Key 认证
- 优先尝试 API Key，失败后尝试 JWT Token
- 用于脚本执行接口

**代码位置：** `backend/api/router.go`

```go
func JWTOrApiKeyAuthenticationMiddleware(config *config.Config, db *storage.BoltDB) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 先尝试 API Key
        apiKey := c.GetHeader("X-BrowserWing-Key")
        if apiKey != "" {
            // ... 验证 API Key
            return
        }
        
        // 再尝试 JWT Token
        token := c.GetHeader("Authorization")
        if token != "" {
            // ... 验证 JWT Token
            return
        }
        
        // 都失败则返回 401
        c.JSON(http.StatusUnauthorized, ...)
    }
}
```

### 路由更新

**脚本执行路由：**
```go
scriptsPlay := r.Group("/api/v1/scripts")
scriptsPlay.Use(JWTOrApiKeyAuthenticationMiddleware(handler.config, handler.db))
{
    scriptsPlay.POST("/:id/play", handler.PlayScript)
}
```

**MCP 路由：**
```go
mcpSSE := r.Group("/api/v1/mcp")
mcpSSE.Use(ApiKeyAuthenticationMiddleware(handler.config, handler.db))
{
    mcpSSE.Any("/sse", gin.WrapH(handler.mcpServer.GetSSEServer().SSEHandler()))
    mcpSSE.Any("/sse_message", gin.WrapH(handler.mcpServer.GetSSEServer().MessageHandler()))
}
```

## 兼容性说明

### 向后兼容
- ✅ 脚本执行接口仍然支持 JWT Token
- ✅ 前端代码无需修改
- ✅ 现有的内部调用不受影响

### 新功能
- ✅ 外部脚本可以使用 API Key 执行脚本
- ✅ MCP 客户端可以使用 API Key 访问端点
- ✅ 更灵活的认证方式选择

## 安全建议

1. **API Key 管理**
   - 为不同用途创建不同的 API Key
   - 定期轮换 API Key
   - 妥善保管 API Key，避免泄露

2. **脚本执行**
   - 内部调用建议使用 JWT Token
   - 外部调用建议使用 API Key
   - 为脚本执行创建专用的 API Key

3. **MCP 访问**
   - 为 MCP 客户端创建专用的 API Key
   - 限制 API Key 的访问权限（未来功能）
   - 记录 API Key 的使用情况（未来功能）

## 测试验证

### 脚本执行接口测试

1. **JWT Token 认证测试**
```bash
# 登录获取 token
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 使用 token 执行脚本
curl -H "Authorization: Bearer $TOKEN" \
  -X POST http://localhost:8080/api/v1/scripts/YOUR_SCRIPT_ID/play
```

2. **API Key 认证测试**
```bash
# 使用 API Key 执行脚本
curl -H "X-BrowserWing-Key: YOUR_API_KEY" \
  -X POST http://localhost:8080/api/v1/scripts/YOUR_SCRIPT_ID/play
```

### MCP 端点测试

```bash
# 测试 SSE 连接
curl -H "X-BrowserWing-Key: YOUR_API_KEY" \
  http://localhost:8080/api/v1/mcp/sse

# 测试 MCP 工具列表
curl -H "X-BrowserWing-Key: YOUR_API_KEY" \
  -X POST http://localhost:8080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## 后续计划

1. **API Key 权限控制**
   - 为 API Key 添加权限范围设置
   - 限制 API Key 只能访问特定接口
   - 支持只读/读写权限

2. **使用统计**
   - 记录 API Key 的使用次数
   - 统计访问频率
   - 异常访问告警

3. **独立 MCP 服务器认证**
   - 为独立的 MCP HTTP 服务器添加认证
   - 创建 HTTP 中间件包装器
   - 统一认证机制

## 相关文档

- [认证功能使用指南](./AUTHENTICATION.md)
- [认证功能实现总结](../AUTHENTICATION_IMPLEMENTATION.md)

## 问题反馈

如有问题或建议，请通过 GitHub Issues 反馈。
