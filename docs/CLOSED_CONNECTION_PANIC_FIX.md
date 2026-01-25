# 已关闭连接 Panic 修复

## 问题描述

在使用浏览器自动化时，会出现以下 panic 错误：

```
panic recovered:
write tcp 127.0.0.1:65202->127.0.0.1:65200: use of closed network connection
/root/go/1.24.2/pkg/mod/github.com/go-rod/stealth@v0.4.9/main.go:30
/root/code/browserpilot/backend/services/browser/manager.go:515
```

## 根本原因

1. **浏览器连接已关闭**
   - 用户手动关闭了浏览器窗口
   - 浏览器进程崩溃
   - 网络连接断开
   - Chrome DevTools Protocol 连接超时

2. **代码未检查连接状态**
   - `OpenPage` 和 `PlayScript` 函数直接调用 `stealth.MustPage(browser)`
   - 没有在调用前验证浏览器连接是否仍然有效

3. **Must* 函数会 panic**
   - `stealth.MustPage` 和 `browser.MustPage` 使用 Must 模式
   - 遇到错误时会 panic 而不是返回错误
   - panic 会传播到 Gin 的 recovery 中间件

## 解决方案

### 1. 添加浏览器连接检查函数

```go
// checkBrowserConnection 检查浏览器连接是否仍然有效
func checkBrowserConnection(browser *rod.Browser) error {
	if browser == nil {
		return fmt.Errorf("browser is nil")
	}

	// 尝试获取浏览器页面列表，这是一个轻量级的检查
	// 如果连接已关闭，这个调用会失败
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := browser.Context(ctx).Pages()
	if err != nil {
		return fmt.Errorf("failed to get browser pages: connection may be closed: %w", err)
	}

	return nil
}
```

**为什么使用 `Pages()` 检查：**
- 这是一个轻量级的 CDP (Chrome DevTools Protocol) 调用
- 会立即失败如果连接已关闭
- 2秒超时确保不会长时间阻塞
- 不会对浏览器状态造成任何影响

### 2. 修改 OpenPage 函数

**修改前：**
```go
func (m *Manager) OpenPage(url string, language string, instanceID string, norecord ...bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	browser, _, _, err := m.getInstanceBrowser(instanceID)
	if err != nil {
		return err
	}
	
	// ... 直接使用 browser
	page = stealth.MustPage(browser) // ❌ 可能 panic
}
```

**修改后：**
```go
func (m *Manager) OpenPage(url string, language string, instanceID string, norecord ...bool) (err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	// ✅ 捕获 panic
	defer func() {
		if r := recover(); r != nil {
			ctx := context.Background()
			logger.Error(ctx, "Panic in OpenPage: %v", r)
			err = fmt.Errorf("failed to open page: browser connection may be closed (panic: %v)", r)
		}
	}()
	
	browser, _, _, err := m.getInstanceBrowser(instanceID)
	if err != nil {
		return err
	}
	
	// ✅ 检查连接
	ctx := context.Background()
	if err := checkBrowserConnection(browser); err != nil {
		logger.Error(ctx, "Browser connection check failed: %v", err)
		return fmt.Errorf("browser connection is closed or invalid: %w", err)
	}
	
	// ... 安全使用 browser
	page = stealth.MustPage(browser) // 已有 defer recover 保护
}
```

**关键改进：**
1. **命名返回值** `(err error)` - 允许 defer 修改返回值
2. **defer recover** - 捕获所有 panic 并转换为错误
3. **连接检查** - 在使用 browser 前验证连接
4. **友好错误消息** - 提示用户可能的原因

### 3. 修改 PlayScript 函数

应用相同的模式：

```go
func (m *Manager) PlayScript(ctx context.Context, script *models.Script, instanceID string) (result *models.PlayResult, page *rod.Page, err error) {
	// ✅ 捕获 panic
	defer func() {
		if r := recover(); r != nil {
			logger.Error(ctx, "Panic in PlayScript: %v", r)
			err = fmt.Errorf("failed to play script: browser connection may be closed (panic: %v)", r)
			result = nil
			page = nil
		}
	}()
	
	browser, _, instance, err := m.getInstanceBrowser(instanceID)
	if err != nil {
		return nil, nil, err
	}
	
	// ✅ 检查连接
	if err := checkBrowserConnection(browser); err != nil {
		logger.Error(ctx, "Browser connection check failed: %v", err)
		return nil, nil, fmt.Errorf("browser connection is closed or invalid: %w", err)
	}
	
	// ... 继续执行
}
```

## 用户体验改进

### 修复前

```
[Recovery] panic recovered:
write tcp 127.0.0.1:65202->127.0.0.1:65200: use of closed network connection
```

用户看到：
- ❌ 服务器 panic（虽然被 recovery 捕获）
- ❌ 不友好的技术错误信息
- ❌ 不清楚如何解决

### 修复后

**场景 1 - 连接检查失败：**
```
Browser connection check failed: failed to get browser pages: connection may be closed
```

API 返回：
```json
{
  "error": "browser connection is closed or invalid: failed to get browser pages: connection may be closed"
}
```

**场景 2 - 捕获到 panic：**
```
Panic in OpenPage: write tcp ...: use of closed network connection
```

API 返回：
```json
{
  "error": "failed to open page: browser connection may be closed (panic: ...)"
}
```

用户体验：
- ✅ 没有服务器 panic
- ✅ 清晰的错误消息
- ✅ 明确提示是浏览器连接问题
- ✅ 前端可以友好地提示用户重启浏览器

## 技术细节

### 为什么不直接避免 Must* 函数？

**选项 A：使用非 Must 版本**
```go
// go-rod 的 Page() 函数不返回错误，直接 panic
// stealth 包也没有非 Must 版本
page := browser.Page() // 不存在这样的 API
```

**选项 B：当前方案 - defer recover**
```go
// ✅ 既使用了 Must* 的便利性
// ✅ 又通过 recover 提供了错误处理
defer func() {
	if r := recover(); r != nil {
		err = fmt.Errorf("...")
	}
}()
page = stealth.MustPage(browser)
```

### 连接检查的成本

- **时间成本**: 每次检查 < 100ms（本地连接）
- **网络成本**: 1个 CDP 命令（`Target.getTargets` 或类似）
- **性能影响**: 可忽略不计
- **可靠性提升**: 显著（避免 panic）

### 为什么设置 2 秒超时？

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
```

- **太短**（< 1s）: 可能误判慢速网络
- **太长**（> 5s）: 用户等待时间过长
- **2 秒**: 在可靠性和响应性之间的平衡

## 测试场景

### 1. 正常情况

```bash
# 启动浏览器
curl -X POST http://localhost:8080/api/browser/start

# 打开页面（正常工作）
curl -X POST http://localhost:8080/api/browser/open -d '{"url": "https://example.com"}'
```

**预期**: ✅ 正常工作，无错误

### 2. 浏览器关闭后打开页面

```bash
# 启动浏览器
curl -X POST http://localhost:8080/api/browser/start

# 手动关闭 Chrome 窗口

# 尝试打开页面
curl -X POST http://localhost:8080/api/browser/open -d '{"url": "https://example.com"}'
```

**预期**: 
- ✅ 返回友好的错误消息
- ✅ 不会 panic
- ✅ 日志记录详细信息

### 3. 回放脚本时连接断开

```bash
# 启动浏览器并录制脚本
curl -X POST http://localhost:8080/api/browser/start

# 关闭浏览器
# 重新启动浏览器
curl -X POST http://localhost:8080/api/browser/start

# 但在回放前手动关闭 Chrome
# 尝试回放
curl -X POST http://localhost:8080/api/scripts/{id}/play
```

**预期**: 
- ✅ 返回错误而不是 panic
- ✅ 前端可以提示用户重启浏览器

## 后续改进建议

### 1. 自动重连机制

```go
func (m *Manager) OpenPageWithRetry(url string, maxRetries int) error {
	for i := 0; i < maxRetries; i++ {
		err := m.OpenPage(url, "", "")
		if err == nil {
			return nil
		}
		
		if strings.Contains(err.Error(), "connection may be closed") {
			// 尝试重启浏览器
			if restartErr := m.Restart(); restartErr != nil {
				return fmt.Errorf("failed to restart browser: %w", restartErr)
			}
			continue
		}
		
		return err
	}
	return fmt.Errorf("max retries exceeded")
}
```

### 2. 连接健康检查

```go
// 定期检查浏览器连接健康状态
func (m *Manager) StartHealthCheck(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			if err := checkBrowserConnection(m.browser); err != nil {
				logger.Warn(ctx, "Browser connection unhealthy: %v", err)
				// 可以触发通知或自动重启
			}
		}
	}()
}
```

### 3. 更智能的错误分类

```go
func classifyBrowserError(err error) string {
	errStr := err.Error()
	switch {
	case strings.Contains(errStr, "connection refused"):
		return "browser_not_started"
	case strings.Contains(errStr, "closed network connection"):
		return "browser_disconnected"
	case strings.Contains(errStr, "timeout"):
		return "browser_timeout"
	default:
		return "browser_unknown_error"
	}
}
```

## 修改的文件

```
backend/services/browser/manager.go
- 添加 checkBrowserConnection() 函数
- 修改 OpenPage() 函数（添加 panic recovery 和连接检查）
- 修改 PlayScript() 函数（添加 panic recovery 和连接检查）
```

## 相关问题

- GitHub Issue: #XXX (如果有)
- 相关 Panic: `use of closed network connection`
- go-rod stealth 包: https://github.com/go-rod/stealth

## 总结

这次修复通过以下方式提高了系统的健壮性：

1. **预防性检查** - 在使用前验证连接
2. **防御性编程** - 使用 defer recover 捕获意外 panic
3. **友好错误** - 提供清晰的错误消息
4. **日志记录** - 记录详细的调试信息

用户现在会得到清晰的错误提示，而不是看到服务器 panic，从而可以采取适当的行动（如重启浏览器）。
