# Accessibility Tree 实现文档

## 概述

本文档描述了基于 Chrome DevTools Protocol Accessibility API 的语义树实现，替代了原来基于 DOM 选择器的简单实现。

## 背景

原来的 `ExtractSemanticTree` 实现使用 DOM 选择器来查找可交互元素，存在以下问题：
1. **不够准确**：依赖 CSS 选择器和 DOM 属性，容易遗漏或误判元素
2. **不够语义化**：没有利用浏览器的语义信息
3. **维护困难**：需要手动维护大量选择器列表

## 新实现

### 核心原理

使用 Chrome DevTools Protocol 的 `Accessibility.getFullAXTree` API 获取页面的完整 Accessibility Tree（可访问性树）。这是浏览器内部用于辅助功能（如屏幕阅读器）的树结构，准确反映了页面的语义结构。

### 主要变更

#### 1. 使用 Accessibility API

```go
// 启用 Accessibility 域
err := proto.AccessibilityEnable{}.Call(page)

// 获取完整的 Accessibility Tree
axTree, err := proto.AccessibilityGetFullAXTree{}.Call(page)
```

#### 2. 更新数据结构

**SemanticTree**
```go
type SemanticTree struct {
    Root         *SemanticNode                     // 根节点
    Elements     map[string]*SemanticNode          // AXNodeID -> Node 映射
    AXNodeMap    map[proto.AccessibilityAXNodeID]*proto.AccessibilityAXNode // AXNodeID -> AXNode 映射
    BackendIDMap map[proto.DOMBackendNodeID]*SemanticNode // BackendNodeID -> Node 映射
}
```

**SemanticNode**
```go
type SemanticNode struct {
    ID            string                        // 节点 ID（字符串形式的 AXNodeID）
    AXNodeID      proto.AccessibilityAXNodeID   // Accessibility 节点 ID
    BackendNodeID proto.DOMBackendNodeID        // DOM Backend 节点 ID
    Role          string                        // Accessibility Role（如 button, link, textbox 等）
    Label         string                        // 节点标签/名称
    Description   string                        // 节点描述
    Value         string                        // 节点值
    Text          string                        // 文本内容
    Placeholder   string                        // placeholder 属性
    Attributes    map[string]string             // 所有属性
    IsInteractive bool                          // 是否可交互
    IsEnabled     bool                          // 是否启用（非 disabled）
    Children      []*SemanticNode               // 子节点
    // ... 其他字段
}
```

#### 3. 基于 Role 的元素识别

不再使用 CSS 选择器，而是基于 Accessibility Role 来识别元素：

**可点击元素**
```go
clickableRoles := map[string]bool{
    "button":           true,
    "link":             true,
    "menuitem":         true,
    "menuitemcheckbox": true,
    "menuitemradio":    true,
    "tab":              true,
    "checkbox":         true,
    "radio":            true,
    "switch":           true,
    "treeitem":         true,
}
```

**输入元素**
```go
inputRoles := map[string]bool{
    "textbox":    true,
    "searchbox":  true,
    "combobox":   true,
    "spinbutton": true,
    "slider":     true,
}
```

#### 4. BackendNodeID 到 DOM 元素的映射

关键功能：通过 AX Tree 节点反查 DOM 元素

```go
func GetElementFromPage(ctx context.Context, page *rod.Page, node *SemanticNode) (*rod.Element, error) {
    if node.BackendNodeID == 0 {
        return nil, fmt.Errorf("node has no backend node ID")
    }

    // 使用 DOM.resolveNode 将 BackendNodeID 转换为 ObjectID
    obj, err := proto.DOMResolveNode{
        BackendNodeID: node.BackendNodeID,
    }.Call(page)
    
    if err != nil {
        return nil, fmt.Errorf("failed to resolve backend node: %w", err)
    }

    // 创建 Rod Element
    elem, err := page.ElementFromObject(obj.Object)
    if err != nil {
        return nil, fmt.Errorf("failed to create element from object: %w", err)
    }
    
    return elem, nil
}
```

### Accessibility Tree 的优势

1. **准确性**：浏览器维护的语义信息，100% 准确
2. **完整性**：包含所有可访问的交互元素
3. **语义化**：Role、Name、Description 等语义信息丰富
4. **一致性**：不受 DOM 结构变化影响
5. **性能**：一次 API 调用获取整棵树，无需多次查询

### 使用示例

#### 获取语义树
```go
tree, err := executor.GetSemanticTree(ctx)
if err != nil {
    log.Fatal(err)
}
```

#### 获取可交互元素
```go
// 获取所有可点击元素
clickable := tree.GetClickableElements()
for i, node := range clickable {
    fmt.Printf("Clickable Element [%d]: %s (role: %s)\n", 
               i+1, node.Label, node.Role)
}

// 获取所有输入元素
inputs := tree.GetInputElements()
for i, node := range inputs {
    fmt.Printf("Input Element [%d]: %s (role: %s)\n", 
               i+1, node.Label, node.Role)
}
```

#### 通过索引操作元素
```go
// Navigate 返回的语义树包含元素索引
result, _ := executor.Navigate(ctx, "https://example.com", nil)
semanticTree := result.Data["semantic_tree"].(string)
// 输出：
// Clickable Element [1]: Login (role: button)
// Clickable Element [2]: Sign Up (role: link)
// Input Element [1]: Email (role: textbox)

// 直接使用索引操作
executor.Click(ctx, "Clickable Element [1]", nil)  // 点击 Login 按钮
executor.Type(ctx, "Input Element [1]", "user@example.com", nil)  // 输入邮箱
```

### 元素定位流程

1. **用户指定元素**：如 "Clickable Element [1]"
2. **查找语义节点**：从语义树中找到对应的 SemanticNode
3. **获取 BackendNodeID**：从 SemanticNode 获取 BackendNodeID
4. **解析为 ObjectID**：调用 `DOM.resolveNode` 将 BackendNodeID 转换为 ObjectID
5. **创建 Rod Element**：使用 `page.ElementFromObject` 创建可操作的元素
6. **执行操作**：点击、输入等

## 兼容性

### 保留的字段
为了向后兼容，保留了一些旧字段：
- `Type`：映射到 `Role`
- `Selector`：可能为空
- `XPath`：可能为空  
- `Position`：可能为空
- `IsVisible`：可能不准确

### 迁移指南

如果你的代码使用了旧的字段，建议迁移到新字段：

| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| `Type` | `Role` | 使用 Accessibility Role |
| `node.Type == "button"` | `node.Role == "button"` | 基于 Role 判断 |
| 通过 CSS 选择器 | 通过 BackendNodeID | 更可靠的定位方式 |

## 已知限制

1. **需要浏览器支持**：依赖 Chrome DevTools Protocol 的 Accessibility API
2. **BackendNodeID 为 0**：某些节点可能没有对应的 DOM 元素（纯语义节点）
3. **性能开销**：获取完整 AX Tree 有一定开销，但比多次 DOM 查询更高效

## 测试建议

1. **检查元素识别**：确认关键元素都能被正确识别
2. **测试元素操作**：确认通过索引能正确操作元素
3. **检查语义树输出**：确认 SerializeToSimpleText 输出符合预期
4. **测试复杂页面**：在 SPA、动态页面等场景下测试

## 未来改进

1. **缓存优化**：缓存 AX Tree，避免重复获取
2. **增量更新**：监听 DOM 变化，增量更新语义树
3. **更多 Role 支持**：扩展支持更多的 Accessibility Role
4. **可见性判断**：通过 AX Tree 的 `ignored` 字段更准确地判断可见性
5. **层次结构**：利用 AX Tree 的父子关系提供更好的元素定位

## 参考资料

- [Chrome DevTools Protocol - Accessibility Domain](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/)
- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
- [ARIA Roles](https://www.w3.org/TR/wai-aria-1.1/#role_definitions)
