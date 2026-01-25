# 禁用 Agent SDK Debug 日志 - 清理终端输出

## 问题描述

虽然在 `main.go` 中设置了 `zerolog.SetGlobalLevel(zerolog.Disabled)`，但终端仍然输出 Debug 日志：

```
[DEBUG] Using system prompt (length=181):
You are a task evaluation assistant...
```

## 根本原因

`agent-sdk-go` 通过我们提供的 `AgentLogger.Debug()` 方法输出调试信息，而不是直接使用 zerolog。

**调用链：**
```
agent-sdk-go 内部
    ↓
AgentLogger.Debug(msg, fields)
    ↓
logger.Debug(ctx, msg)
    ↓
终端输出 ❌
```

## 解决方案

### 修改 AgentLogger.Debug() 方法

**位置：** `backend/agent/agent.go:1668`

```go
func (al *AgentLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
    // ✅ 完全禁用 Debug 日志输出
    // agent-sdk-go 的内部调试信息会非常冗长，这里直接忽略
    // 如果需要调试，可以临时取消注释下面这行
    // al.logger.Debug(ctx, "%s %s", msg, al.fieldsToString(fields))
}
```

**原理：** 直接让 Debug 方法变成空操作（no-op），agent-sdk-go 的调用不会产生任何输出。

### 更新 main.go 注释

添加说明，指出 Debug 日志已在 `AgentLogger` 中禁用。

## 效果对比

### 修复前

```
2026/01/25 20:06:09 🚀 BrowserWing server started at http://0.0.0.0:17080
[DEBUG] Using system prompt (length=181):       ← ❌ 冗长的调试信息
You are a task evaluation assistant...
[DEBUG] Agent initialized with tools: [...]     ← ❌ 更多调试信息
[DEBUG] Running iteration 1...                  ← ❌ 运行时日志
...
```

### 修复后

```
2026/01/25 20:06:09 🚀 BrowserWing server started at http://0.0.0.0:17080
(干净整洁，没有 Debug 输出) ✅
```

## 日志级别

修复后的日志级别控制：

| 方法 | 输出 | 说明 |
|------|------|------|
| `Info()` | ✅ | 关键信息（如启动、完成）|
| `Warn()` | ✅ | 警告信息（如降级）|
| `Error()` | ✅ | 错误信息 |
| `Debug()` | ❌ | **完全禁用**（agent-sdk-go 内部调试）|

## 临时启用 Debug（调试时）

如果需要排查 agent-sdk-go 内部问题，可以临时启用：

**步骤：**
1. 打开 `backend/agent/agent.go:1668`
2. 取消注释 `al.logger.Debug(...)` 这行
3. 重新编译
4. 调试完成后再次注释

```go
func (al *AgentLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
    // 临时启用调试
    al.logger.Debug(ctx, "%s %s", msg, al.fieldsToString(fields))  // ← 取消注释
}
```

## 代码变更

```
修改文件：
├─ backend/agent/agent.go
│  └─ AgentLogger.Debug() 改为空操作
└─ backend/main.go
   └─ 更新注释说明

总计：~5 行代码修改
```

## 优势

| 优势 | 说明 |
|------|------|
| ✅ **清洁输出** | 终端只显示关键信息 |
| ✅ **易于阅读** | 不被调试信息淹没 |
| ✅ **性能提升** | 减少日志 I/O 开销 |
| ✅ **灵活调试** | 需要时可快速启用 |

## 总结

通过让 `AgentLogger.Debug()` 变成空操作，彻底解决了终端 Debug 日志输出问题，让终端输出更加清爽。

**一句话：** 让终端清爽，让日志聚焦重要信息！🎯
