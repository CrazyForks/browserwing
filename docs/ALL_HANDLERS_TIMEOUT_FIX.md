# 所有 MCP Handlers 的 Timeout 修复

## 问题总结

发现 Navigate 工具的零值 timeout 问题后，检查了所有其他 MCP handlers，发现它们都有相同的问题：**缺少必要字段的初始化**。

## 修复列表

### 1. ✅ browser_navigate

**修复前**：
```go
opts := &NavigateOptions{
    WaitUntil: "load",
    // ❌ 缺少 Timeout
}
```

**修复后**：
```go
opts := &NavigateOptions{
    WaitUntil: "load",
    Timeout:   60 * time.Second, // ✅
}
```

### 2. ✅ browser_click

**修复前**：
```go
opts := &ClickOptions{
    WaitVisible: true,
    // ❌ 缺少 Timeout, WaitEnabled, Button, ClickCount
}
```

**修复后**：
```go
opts := &ClickOptions{
    WaitVisible: true,
    WaitEnabled: true,           // ✅
    Timeout:     10 * time.Second, // ✅
    Button:      "left",         // ✅
    ClickCount:  1,              // ✅
}
```

### 3. ✅ browser_type

**修复前**：
```go
opts := &TypeOptions{
    Clear: true,
    // ❌ 缺少 Timeout, WaitVisible, Delay
}
```

**修复后**：
```go
opts := &TypeOptions{
    Clear:       true,
    WaitVisible: true,           // ✅
    Timeout:     10 * time.Second, // ✅
    Delay:       0,              // ✅
}
```

### 4. ✅ browser_select

**修复前**：
```go
result, err := r.executor.Select(ctx, identifier, value, nil)
// ❌ 传 nil
```

**修复后**：
```go
opts := &SelectOptions{
    WaitVisible: true,           // ✅
    Timeout:     10 * time.Second, // ✅
}
result, err := r.executor.Select(ctx, identifier, value, opts)
```

### 5. ✅ browser_wait_for

**修复前**：
```go
opts := &WaitForOptions{
    State: "visible",
    // ❌ 缺少 Timeout
}
```

**修复后**：
```go
opts := &WaitForOptions{
    State:   "visible",
    Timeout: 30 * time.Second, // ✅
}

// ✅ 还添加了从参数读取 timeout 的支持
if timeout, ok := args["timeout"].(float64); ok && timeout > 0 {
    opts.Timeout = time.Duration(timeout) * time.Second
}
```

### 6. ✅ browser_screenshot

**已正确**：
```go
opts := &ScreenshotOptions{
    FullPage: false,
    Quality:  80,
    Format:   "png",
}
// ScreenshotOptions 不需要 Timeout
```

### 7. ✅ browser_extract

**已正确**：
```go
opts := &ExtractOptions{
    Selector: selector,
    Type:     "text",
    Multiple: false,
}
// ExtractOptions 不需要 Timeout
```

### 8. ✅ browser_get_semantic_tree

**不需要 Options**：直接调用 `e.GetSemanticTree(ctx)`

### 9. ✅ browser_get_page_info

**不需要 Options**：直接调用 `e.GetPageInfo(ctx)`

### 10. ✅ browser_scroll

**不需要 Options**：根据方向执行不同操作

## 修复原则

### 默认 Timeout 值

| 操作类型 | 默认 Timeout | 原因 |
|---------|-------------|------|
| Navigate | 60s | 页面加载可能较慢 |
| Click | 10s | 等待元素可见、可用 |
| Type | 10s | 等待输入框可见 |
| Select | 10s | 等待下拉框可见 |
| WaitFor | 30s | 专门用于等待，给更长时间 |

### 字段初始化原则

1. **所有必需字段都要显式设置**
   - 不依赖 Go 的零值
   - 特别是 `time.Duration` 类型

2. **使用合理的默认值**
   - 与 operations.go 中的默认值保持一致
   - 考虑实际使用场景

3. **提供参数覆盖机制**
   - 如 WaitFor 支持从参数读取 timeout
   - 保持灵活性

## 测试建议

### 基本测试

```json
// 1. Navigate
{
  "url": "https://example.com",
  "wait_until": "load"
}

// 2. Click
{
  "identifier": "button#submit"
}

// 3. Type
{
  "identifier": "input#username",
  "text": "testuser"
}

// 4. Select
{
  "identifier": "select#country",
  "value": "USA"
}

// 5. WaitFor
{
  "identifier": "#loading",
  "state": "hidden",
  "timeout": 15
}
```

### 压力测试

```
1. 连续调用 10 次 Navigate
2. 连续调用 10 次 Click
3. 混合调用不同操作
4. 测试超时场景（故意等待不存在的元素）
```

## 潜在问题检查清单

- [x] Navigate - Timeout 字段
- [x] Click - Timeout, WaitEnabled, Button, ClickCount 字段
- [x] Type - Timeout, WaitVisible, Delay 字段
- [x] Select - 从 nil 改为完整 Options
- [x] WaitFor - Timeout 字段 + 参数支持
- [x] Screenshot - 不需要 Timeout
- [x] Extract - 不需要 Timeout
- [x] GetSemanticTree - 不需要 Options
- [x] GetPageInfo - 不需要 Options
- [x] Scroll - 不需要 Options

## 代码审查要点

### Go 零值陷阱检查

```go
// ❌ 危险：依赖零值
type Options struct {
    Timeout time.Duration
}
opts := &Options{}  // Timeout = 0

// ✅ 安全：显式初始化
opts := &Options{
    Timeout: 10 * time.Second,
}
```

### Options 结构体使用检查

```go
// ❌ 危险：传 nil
executor.DoSomething(ctx, param, nil)

// ✅ 安全：传完整 Options
opts := &SomeOptions{
    Field1: value1,
    Field2: value2,
}
executor.DoSomething(ctx, param, opts)
```

## 相关文档

- [ZERO_TIMEOUT_BUG_FIX.md](./ZERO_TIMEOUT_BUG_FIX.md) - 详细的 Navigate bug 分析
- [EXECUTOR_IMPROVEMENTS.md](./EXECUTOR_IMPROVEMENTS.md) - Executor 改进总体文档

## 总结

这次修复是一个**全面的代码审查和修复**过程：

1. **发现问题**：Navigate 的零值 timeout bug
2. **扩展检查**：检查所有其他 handlers
3. **统一修复**：确保所有 handlers 都正确初始化
4. **建立规范**：设定字段初始化的最佳实践

**关键教训**：
- Go 的零值机制在某些场景下是陷阱
- 代码审查要全面，不能只修复一个点
- 建立编码规范和检查清单很重要
- 测试覆盖要包括不同的代码路径

**预期效果**：
- 所有工具都能稳定工作
- 没有零值导致的超时问题
- 行为一致且可预测
