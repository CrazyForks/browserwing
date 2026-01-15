# 语义树输出格式优化

## 问题背景

### 原始问题

当大模型（LLM）接收到语义树信息时，容易误用元素的标签文本（Label）作为 identifier 来操作元素，而不是使用更可靠的索引标识符。

**原始输出格式**：
```
Clickable Elements:
  Clickable Element [1]: 百度首页 (role: link)
  Clickable Element [2]: 新闻 (role: link)
  Clickable Element [3]: 登录 (role: button)

Input Elements:
  Input Element [1]: 搜索 (role: textbox)
```

**问题**：
- 大模型看到 "百度首页" 后，可能会尝试 `browser_click(identifier="百度首页")`
- 这样查找元素不可靠，可能找不到或找到错误的元素
- 正确的方式应该是 `browser_click(identifier="Clickable Element [1]")`

## 解决方案

### 改进后的输出格式

```
Page Interactive Elements:
(Use the exact identifier like 'Clickable Element [1]' or 'Input Element [1]' to interact with elements)

Clickable Elements (use identifier like 'Clickable Element [N]'):
  [1] 百度首页 (role: link)
  [2] 新闻 (role: link)
  [3] 登录 (role: button)

Input Elements (use identifier like 'Input Element [N]'):
  [1] 搜索 (role: textbox) [placeholder: 请输入搜索内容]
```

### 关键改进点

#### 1. 添加明确的使用指导 ✅

**顶部说明**：
```
(Use the exact identifier like 'Clickable Element [1]' or 'Input Element [1]' to interact with elements)
```

让大模型一开始就知道应该使用什么样的标识符。

#### 2. 每个分组都有使用提示 ✅

**Clickable Elements**：
```
Clickable Elements (use identifier like 'Clickable Element [N]'):
```

**Input Elements**：
```
Input Elements (use identifier like 'Input Element [N]'):
```

明确告诉大模型每种元素类型的正确标识符格式。

#### 3. 简化元素显示格式 ✅

**改进前**：
```
Clickable Element [1]: 百度首页 (role: link)
```

**改进后**：
```
[1] 百度首页 (role: link)
```

- 移除了重复的 "Clickable Element" 前缀
- 保持索引号突出显示
- 减少视觉干扰，重点在内容上

## 代码实现

### SerializeToSimpleText 函数改进

```go
func (tree *SemanticTree) SerializeToSimpleText() string {
    var builder strings.Builder
    
    // 添加顶部使用指导
    builder.WriteString("Page Interactive Elements:\n")
    builder.WriteString("(Use the exact identifier like 'Clickable Element [1]' or 'Input Element [1]' to interact with elements)\n\n")

    clickable := tree.GetClickableElements()
    inputs := tree.GetInputElements()

    if len(clickable) > 0 {
        // 添加分组级别的使用提示
        builder.WriteString("Clickable Elements (use identifier like 'Clickable Element [N]'):\n")
        for i, node := range clickable {
            // 简化格式：[索引] 标签 (role) - 描述
            builder.WriteString(fmt.Sprintf("  [%d] %s", i+1, label))
            if node.Role != "" {
                builder.WriteString(fmt.Sprintf(" (role: %s)", node.Role))
            }
            // ...
        }
    }

    // 输入元素同样处理
    if len(inputs) > 0 {
        builder.WriteString("Input Elements (use identifier like 'Input Element [N]'):\n")
        // ...
    }

    return builder.String()
}
```

## 使用示例

### 大模型应该这样使用

**正确 ✅**：
```javascript
// 点击第一个可点击元素
browser_click({
  identifier: "Clickable Element [1]"
})

// 在第一个输入框输入文本
browser_type({
  identifier: "Input Element [1]",
  text: "search query"
})
```

**错误 ❌**：
```javascript
// 不要使用标签文本
browser_click({
  identifier: "百度首页"  // ❌ 不可靠
})

// 不要使用部分标识符
browser_click({
  identifier: "[1]"  // ❌ 不完整
})
```

## 效果对比

### 改进前的交互

```
User: 点击百度首页链接
LLM: 好的，我来点击
LLM Action: browser_click(identifier="百度首页")
Result: ❌ Element not found: 百度首页
```

### 改进后的交互

```
User: 点击百度首页链接
LLM: 我看到页面有以下可点击元素：
     [1] 百度首页 (role: link)
     [2] 新闻 (role: link)
     我将点击第一个元素
LLM Action: browser_click(identifier="Clickable Element [1]")
Result: ✅ Successfully clicked element: Clickable Element [1]
```

## 后端支持

### findElementBySemanticIndex 函数

这个函数已经支持解析语义树索引：

```go
func (e *Executor) findElementBySemanticIndex(ctx context.Context, page *rod.Page, identifier string) (*rod.Element, error) {
    // 支持的格式：
    // - "Input Element [1]"
    // - "Clickable Element [2]"
    // - "input [1]"
    // - "clickable [2]"
    // - "[3]"
    
    // 解析索引并从语义树中查找对应元素
    // 然后通过 BackendNodeID 转换为 Rod Element
}
```

## 最佳实践

### 对大模型的建议

1. **优先使用索引标识符**
   - 始终使用完整的索引标识符（如 "Clickable Element [1]"）
   - 不要尝试使用元素的文本内容作为标识符

2. **理解元素类型**
   - `Clickable Element [N]` - 用于点击操作
   - `Input Element [N]` - 用于输入操作

3. **检查可用元素**
   - 首先查看语义树中列出的所有元素
   - 根据元素的标签和描述选择正确的索引
   - 使用索引来操作元素

4. **错误处理**
   - 如果操作失败，检查索引是否正确
   - 索引从 1 开始，不是从 0

### 对开发者的建议

1. **保持标识符格式一致**
   - 在所有文档和示例中使用相同的格式
   - 强化正确的使用模式

2. **提供清晰的错误信息**
   - 当元素找不到时，提示正确的标识符格式
   - 建议查看语义树获取可用元素

3. **测试不同场景**
   - 测试大模型是否正确使用索引
   - 收集常见的错误用法并改进提示

## 相关文档

- [ACCESSIBILITY_TREE_IMPLEMENTATION.md](./ACCESSIBILITY_TREE_IMPLEMENTATION.md) - Accessibility Tree 实现细节
- [EXECUTOR_IMPROVEMENTS.md](./EXECUTOR_IMPROVEMENTS.md) - Executor 改进总览

## 总结

这次优化通过以下方式提高了大模型使用语义树的准确性：

1. **明确的指导** - 在输出中直接告诉大模型应该使用什么格式
2. **重复强化** - 在多个位置重复强调正确的使用方式
3. **简化格式** - 减少视觉噪音，突出关键信息
4. **示例引导** - 通过格式本身暗示正确的使用方法

**预期效果**：
- 大模型使用索引的准确率显著提高
- 元素操作的成功率提升
- 减少因错误标识符导致的失败
- 改善整体的自动化体验

**关键指标**：
- 索引使用率：目标 > 90%
- 操作成功率：目标 > 95%
- 错误类型：主要是元素不存在，而不是标识符错误
