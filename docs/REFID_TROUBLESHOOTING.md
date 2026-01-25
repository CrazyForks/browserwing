# RefID 问题排查指南

## 常见问题

### 问题 1：RefID 找不到元素

**症状：**
```
browser_snapshot → 返回 @e1, @e2, @e3...
browser_click("@e1") → refID e1 not found
```

**原因：**
1. 缓存已失效（超过 5 分钟）
2. 页面已刷新或导航，RefID 映射被清除
3. snapshot 和 click 使用了不同的会话

**解决方法：**

#### 方法 1：重新获取 snapshot

```bash
# 1. 重新获取 snapshot
curl -X POST .../browser_snapshot

# 2. 使用新的 RefID
curl -X POST .../browser_click -d '{"identifier": "@e1"}'
```

#### 方法 2：检查缓存状态

查看日志中的缓存信息：
```
[INFO] [GetAccessibilitySnapshot] Using cached snapshot (age: 2m30s, 42 refs)
[INFO] [findElementByRefID] Looking up refID: e1
[INFO] [findElementByRefID] Found BackendNodeID 12345 for refID e1 (cache age: 2m30s)
```

#### 方法 3：增加缓存 TTL

如果需要更长的缓存时间：
```go
executor := NewExecutor(browserManager)
executor.refIDTTL = 600 * time.Second  // 10 分钟
```

### 问题 2：Click 的元素和 Snapshot 显示的不一致

**症状：**
```
browser_snapshot → @e5 [5] 提交按钮
browser_click("@e5") → 点击了其他元素或找不到
```

**原因：**
1. 页面内容发生了变化（动态加载、AJAX）
2. BackendNodeID 对应的 DOM 节点被替换
3. RefID 缓存未及时更新

**解决方法：**

#### 方法 1：在 click 前重新 snapshot

```bash
# 每次操作前重新获取 snapshot
curl -X POST .../browser_snapshot
curl -X POST .../browser_click -d '{"identifier": "@e5"}'
```

#### 方法 2：使用索引作为备选

如果 RefID 不可靠，使用索引格式：
```bash
curl -X POST .../browser_click -d '{"identifier": "Clickable Element [5]"}'
```

但注意：索引格式会重新获取 snapshot，可能更慢且不稳定。

#### 方法 3：检查日志

查看详细的 RefID 解析日志：
```
[INFO] [findElementByRefID] Looking up refID: e5
[INFO] [findElementByRefID] Found BackendNodeID 67890 for refID e5 (cache age: 30s)
[ERROR] [findElementByRefID] Failed to resolve BackendNodeID 67890: node not found
```

如果看到 "node not found"，说明元素已被删除，需要重新获取 snapshot。

### 问题 3：RefID 数量不匹配

**症状：**
```
browser_snapshot → 显示 84 个元素
日志显示 → 只分配了 42 个 RefID
```

**原因：**
1. 某些元素的 BackendNodeID 为 0（无效节点）
2. 元素被过滤掉了（不可见、不可交互）

**解决方法：**

查看日志中的 RefID 分配信息：
```
[INFO] [assignRefIDs] Assigning RefIDs to 84 clickable elements
[WARN] [assignRefIDs] Skipping clickable element with BackendNodeID=0: 隐藏按钮
[INFO] [assignRefIDs] Assigned 42 RefIDs to clickable elements
[INFO] [assignRefIDs] e1 -> BackendNodeID=12345, Label=首页, Role=link
[INFO] [assignRefIDs] e2 -> BackendNodeID=12346, Label=关于, Role=link
...
[INFO] [assignRefIDs] Total RefIDs in map: 42
```

这是正常的，因为只有具有有效 BackendNodeID 的元素才能被 RefID 引用。

## 最佳实践

### 1. 工作流程

```
1. browser_navigate → 导航到页面
2. browser_snapshot → 获取元素列表和 RefID
3. browser_click(@eN) → 使用 RefID 交互
4. （如果页面有重大变化）重新执行步骤 2
```

### 2. 何时重新获取 Snapshot

以下情况需要重新获取 snapshot：

✅ **必须重新获取：**
- 页面导航后
- 页面刷新后
- 页面内容发生重大变化（AJAX 加载、路由切换）

⚠️ **建议重新获取：**
- RefID 查找失败时
- 缓存超过 5 分钟时
- 点击后页面内容变化时

❌ **无需重新获取：**
- 连续点击同一页面的多个元素
- 简单的表单填充操作
- 5 分钟内的操作

### 3. RefID vs 索引

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 静态页面 | RefID `@e1` | 快速、稳定 |
| 动态内容 | RefID `@e1` | 仍然比索引稳定 |
| 缓存过期 | 重新 snapshot | 获取最新 RefID |
| 紧急情况 | 索引 `Clickable Element [1]` | 自动重新获取 |

### 4. 调试技巧

#### 启用详细日志

在服务端日志中查找：
```bash
grep "RefID\|assignRefIDs\|findElementByRefID" log.txt
```

#### 验证 RefID 映射

检查 snapshot 输出：
```
Clickable Elements:
  @e1 [1] 首页 (role: link)      ← RefID 是 e1
  @e2 [2] 关于 (role: link)      ← RefID 是 e2
```

#### 测试 RefID

```bash
# 1. 获取 snapshot 并记录 RefID
curl -X POST .../browser_snapshot | tee snapshot.txt

# 2. 立即测试 RefID
curl -X POST .../browser_click -d '{"identifier": "@e1"}'

# 3. 查看日志
# 应该看到：
# [INFO] [findElementByRefID] Looking up refID: e1
# [INFO] [findElementByRefID] Found BackendNodeID ... for refID e1
# [INFO] [findElementByRefID] Successfully resolved refID e1 to element
```

## 故障排查步骤

### 步骤 1：确认 RefID 已生成

```bash
# 获取 snapshot
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_snapshot"
    }
  }' | jq '.result.content[0].text'
```

**期望输出：**
```
Page Interactive Elements:
(Use the ref like '@e1' or index like 'Clickable Element [1]' to interact with elements)

Clickable Elements:
  @e1 [1] 首页 (role: link)
  @e2 [2] 关于 (role: link)
  ...
```

如果没有看到 `@e1`, `@e2`，说明 RefID 没有生成。

### 步骤 2：测试 RefID 查找

```bash
# 点击 @e1
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_click",
      "arguments": {
        "identifier": "@e1"
      }
    }
  }' | jq
```

**成功响应：**
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully clicked element: @e1"
      }
    ]
  }
}
```

**失败响应：**
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "refID e1 not found (cache may be stale, run browser_snapshot first)"
      }
    ],
    "isError": true
  }
}
```

### 步骤 3：检查服务器日志

查看日志文件中的 RefID 相关信息：

```bash
# 查看 RefID 分配
grep "assignRefIDs" log.txt

# 查看 RefID 查找
grep "findElementByRefID" log.txt

# 查看缓存状态
grep "cached snapshot" log.txt
```

### 步骤 4：验证缓存有效性

```bash
# 1. 第一次 snapshot（生成 RefID）
curl -X POST .../browser_snapshot

# 日志应该显示：
# [INFO] [GetAccessibilitySnapshot] Fetching new accessibility snapshot
# [INFO] [assignRefIDs] Assigned 42 RefIDs to clickable elements

# 2. 第二次 snapshot（使用缓存）
curl -X POST .../browser_snapshot

# 日志应该显示：
# [INFO] [GetAccessibilitySnapshot] Using cached snapshot (age: 5s, 42 refs)

# 3. 使用 RefID（使用缓存的映射）
curl -X POST .../browser_click -d '{"identifier": "@e1"}'

# 日志应该显示：
# [INFO] [findElementByRefID] Found BackendNodeID ... for refID e1 (cache age: 10s)
```

## 错误信息对照表

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `refID e1 not found` | RefID 不在缓存中 | 重新运行 browser_snapshot |
| `cache may be stale` | 缓存已过期（>5分钟） | 重新运行 browser_snapshot |
| `failed to resolve node` | DOM 节点已被删除 | 页面已变化，重新 snapshot |
| `element may have been removed` | 元素不存在 | 确认元素仍在页面上 |
| `text node has no parent` | Text 节点异常 | 重新 snapshot |

## 性能优化

### 减少 Snapshot 调用

```bash
# ❌ 不好的做法：每次操作都 snapshot
for i in 1 2 3; do
  curl -X POST .../browser_snapshot
  curl -X POST .../browser_click -d '{"identifier": "@e'$i'"}'
done

# ✅ 好的做法：snapshot 一次，多次使用
curl -X POST .../browser_snapshot
for i in 1 2 3; do
  curl -X POST .../browser_click -d '{"identifier": "@e'$i'"}'
done
```

### 批量操作

```bash
# 1. 一次 snapshot
curl -X POST .../browser_snapshot

# 2. 多次操作（使用同一个缓存）
curl -X POST .../browser_click -d '{"identifier": "@e1"}'
curl -X POST .../browser_fill -d '{"identifier": "@e2", "text": "test"}'
curl -X POST .../browser_click -d '{"identifier": "@e3"}'

# 缓存在 5 分钟内有效，无需重复 snapshot
```

## 高级技巧

### 1. 自定义缓存 TTL

```go
// 在创建 Executor 后设置
executor := NewExecutor(browserManager)
executor.refIDTTL = 10 * time.Minute  // 10 分钟
```

### 2. 手动失效缓存

```go
// 在页面发生重大变化后
executor.InvalidateRefIDCache()
```

### 3. 检查缓存状态

```go
// 获取缓存年龄
age := time.Since(executor.refIDTimestamp)
if age > 2*time.Minute {
    // 缓存较旧，考虑刷新
}
```

## 相关文档

- [RefID 实现文档](./REFID_IMPLEMENTATION.md)
- [RefID 改进方案](./REFID_ELEMENT_REFERENCE_PROPOSAL.md)
- [MCP 集成文档](./MCP_INTEGRATION.md)

## 总结

RefID 提供了稳定可靠的元素引用机制，但需要注意：

✅ **优势：**
- 比索引更稳定（5 分钟内有效）
- 性能更好（直接 BackendNodeID 查找）
- 适合批量操作

⚠️ **注意事项：**
- 缓存有效期 5 分钟
- 页面变化后需要重新 snapshot
- RefID 映射依赖于 DOM 结构

🔧 **调试技巧：**
- 查看详细日志
- 验证 RefID 分配
- 测试缓存有效性

遇到问题时，首先重新运行 `browser_snapshot` 通常就能解决！🚀
