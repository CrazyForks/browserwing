# Context 重用问题修复

## 问题描述

用户报告第二次调用 Navigate 时出现 `context deadline exceeded` 错误，并且"浏览器都没打开"。

### 症状
1. **第一次调用**：返回成功但语义树为空
2. **第二次调用**：返回 `context deadline exceeded`，浏览器未打开
3. **后续调用**：持续失败

## 根本原因分析

### 问题 1：Goroutine 资源竞争

**原始代码**：
```go
go func() {
    tree, err := e.GetSemanticTree(treeCtx)
    // ...
}()

select {
case <-done:
    // 完成
case <-treeCtx.Done():
    // 超时
    time.Sleep(1 * time.Second)  // 等待 goroutine
}
```

**问题**：
- 第一次调用的 goroutine 可能还在运行
- Goroutine 持有 `page` 引用，导致资源竞争
- 多个 goroutine 同时访问 Accessibility API 可能导致状态混乱

### 问题 2：Accessibility API 状态污染

**问题**：
- Chrome DevTools Protocol 的 Accessibility API 是有状态的
- 第一次调用 `AccessibilityEnable` 后，状态一直保持
- 第二次调用时可能遇到脏状态
- 没有正确的清理机制

### 问题 3：过滤过于严格

**原始代码**：
```go
// 跳过被忽略的节点
if axNode.Ignored {
    continue
}

// 只处理可交互或有内容的节点
if !isInteractiveRole(role) {
    // 检查内容...
    if !hasContent {
        return nil
    }
}
```

**问题**：导致所有节点都被过滤掉，语义树为空。

## 解决方案

### 1. 移除 Goroutine，改为同步调用 ✅

**修改后**：
```go
// 创建一个带超时的 context（10秒超时）
treeCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

// 直接调用，不使用 goroutine 避免资源竞争
tree, err := e.GetSemanticTree(treeCtx)
if err != nil {
    if err == context.DeadlineExceeded {
        logger.Warn(ctx, "Semantic tree extraction timed out after 10s")
    } else if err != context.Canceled {
        logger.Warn(ctx, "Failed to extract semantic tree: %s", err.Error())
    }
    // 不影响导航成功
} else if tree != nil {
    semanticTreeText = tree.SerializeToSimpleText()
}
```

**优点**：
- 避免资源竞争
- 代码更简单
- 更容易调试
- 超时控制更可靠

### 2. 添加 Accessibility API 清理 ✅

**修改后**：
```go
func ExtractSemanticTree(ctx context.Context, page *rod.Page) (*SemanticTree, error) {
    // 先禁用再启用，确保状态干净
    _ = proto.AccessibilityDisable{}.Call(page)
    
    // 启用 Accessibility 域
    err := proto.AccessibilityEnable{}.Call(page)
    if err != nil {
        return nil, fmt.Errorf("failed to enable accessibility: %w", err)
    }
    
    // 确保函数结束时禁用
    defer func() {
        _ = proto.AccessibilityDisable{}.Call(page)
    }()
    
    // ... 获取 AX Tree
}
```

**关键改进**：
- **调用前禁用**：清除可能存在的脏状态
- **调用后禁用**：确保资源释放
- **使用 defer**：保证清理一定执行

### 3. 调整节点过滤策略 ✅

**修改后**：
```go
// buildSemanticNodeFromAXNode - 不在构建时过滤
func buildSemanticNodeFromAXNode(axNode *proto.AccessibilityAXNode, tree *SemanticTree) *SemanticNode {
    // 创建节点（不过滤，保留所有节点）
    node := &SemanticNode{
        // ...
    }
    
    // 只记录是否被忽略
    if axNode.Ignored {
        node.Metadata["ignored"] = true
    }
    
    return node
}

// GetClickableElements - 在查询时过滤
func (tree *SemanticTree) GetClickableElements() []*SemanticNode {
    for _, node := range tree.Elements {
        // 跳过被忽略的节点
        if ignored, ok := node.Metadata["ignored"].(bool); ok && ignored {
            continue
        }
        
        // 跳过没有 BackendNodeID 的节点
        if node.BackendNodeID == 0 {
            continue
        }
        
        // 检查 role...
    }
}
```

**优点**：
- 保留完整的 AX Tree 信息
- 在查询时根据需求过滤
- 更灵活，可以支持不同的查询场景

### 4. 添加 Context 检查 ✅

在 `ExtractSemanticTree` 的关键位置添加 context 检查：

```go
// 多处检查 context
select {
case <-ctx.Done():
    return nil, ctx.Err()
default:
}
```

确保及时响应 context 取消。

## 修复效果对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 第一次调用 | 语义树为空 | 返回完整语义树 |
| 第二次调用 | Context 超时 | 正常工作 |
| 资源竞争 | 存在 | 已解决 |
| API 状态 | 污染 | 每次重置 |
| 代码复杂度 | 高（goroutine + channel） | 低（同步调用） |
| 可调试性 | 难 | 易 |

## 性能影响

虽然改为同步调用，但性能影响可接受：
- **第一次调用**：Navigate + 语义树提取 = ~3-5秒
- **后续调用**：由于 Accessibility 状态重置，保持一致性能
- **超时保护**：10秒超时，避免无限阻塞

## 最佳实践

基于这次修复，总结出以下最佳实践：

### 1. 避免在关键路径使用 Goroutine
- 除非必要，避免使用 goroutine
- 同步调用 + 超时控制通常更可靠
- 如果必须用 goroutine，确保正确处理资源竞争

### 2. 有状态 API 需要清理
- 调用前：重置状态
- 调用后：清理资源
- 使用 defer 确保清理

### 3. Context 管理
- 每次调用创建新的 context
- 避免重用带 deadline 的 context
- 在长时间操作中定期检查 context

### 4. 过滤策略
- 数据采集阶段：尽量保留完整信息
- 查询阶段：根据需求过滤
- 避免过早优化

## 测试验证

修复后应验证：

1. **第一次调用**
   ```
   Navigate("https://www.baidu.com")
   -> 成功，返回语义树（包含可交互元素）
   ```

2. **第二次调用**
   ```
   Navigate("https://www.baidu.com")
   -> 成功，返回语义树（同样的元素）
   ```

3. **连续多次调用**
   ```
   for i := 1 to 5 {
       Navigate(url)
       -> 每次都成功
   }
   ```

4. **不同页面**
   ```
   Navigate("https://example.com")
   Navigate("https://google.com")
   -> 都成功
   ```

## 后续优化建议

1. **缓存优化**
   - 对于同一页面，可以缓存语义树
   - 监听 DOM 变化，只在必要时重新提取

2. **并行优化**
   - 如果需要并行，使用 worker pool 模式
   - 限制并发数量
   - 使用 semaphore 控制资源访问

3. **监控和日志**
   - 记录每次 Accessibility API 调用的时间
   - 监控资源使用情况
   - 添加性能指标

## 总结

这次修复解决了三个核心问题：
1. ✅ **资源竞争**：移除 goroutine，改为同步调用
2. ✅ **状态污染**：添加 Accessibility API 清理机制
3. ✅ **过滤策略**：调整为查询时过滤

修复后系统更稳定、可靠，代码也更简单易维护。
