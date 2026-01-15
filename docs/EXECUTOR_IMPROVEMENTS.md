# Executor 操作改进文档

## 概述

本文档描述了对 `backend/executor/operations.go` 的重要改进，包括语义树返回和超时机制优化。

## 改进内容

### 1. Navigate 操作返回页面语义树

#### 改进说明
`Navigate` 函数在成功导航到页面后，会自动提取页面的语义树并在返回结果中包含语义树的文本表示。这使得调用者可以立即了解页面上的可交互元素，无需额外调用。

#### 返回数据结构
```go
{
    "success": true,
    "message": "Successfully navigated to https://example.com",
    "data": {
        "url": "https://example.com",
        "semantic_tree": "Page Interactive Elements:\n\nClickable Elements:\n  Clickable Element [1]: Login (type: button)\n  Clickable Element [2]: Sign Up (type: a)\n\nInput Elements:\n  Input Element [1]: Email (type: email)\n  Input Element [2]: Password (type: password)\n"
    },
    "timestamp": "2026-01-15T10:30:00Z"
}
```

#### 语义树格式
语义树以人类可读的文本格式返回，包含：
- **Clickable Elements**: 可点击的元素（按钮、链接等）
- **Input Elements**: 输入元素（文本框、密码框等）

每个元素都有一个索引号（从 1 开始），可以直接使用这些索引进行后续操作。

#### 使用示例
```go
// 导航到页面
result, err := executor.Navigate(ctx, "https://example.com", nil)
if err != nil {
    log.Fatal(err)
}

// 获取语义树
semanticTree := result.Data["semantic_tree"].(string)
fmt.Println(semanticTree)

// 使用语义树索引进行操作
executor.Click(ctx, "Clickable Element [1]", nil)  // 点击第一个可点击元素
executor.Type(ctx, "Input Element [1]", "user@example.com", nil)  // 在第一个输入框输入
```

#### 注意事项
- 如果语义树提取失败，不会影响导航操作的成功
- 失败时会记录警告日志，但 `Navigate` 仍会返回成功
- `semantic_tree` 字段仅在成功提取时才会出现在返回数据中

---

### 2. 操作超时机制优化

#### 改进说明
所有元素查找和等待操作都添加了适当的超时机制，避免无限期等待元素出现。

#### 受影响的操作

| 操作 | 默认超时时间 | 可配置 |
|------|-------------|--------|
| `Click` | 10秒 | ✓ |
| `Type` | 10秒 | ✓ |
| `Select` | 10秒 | ✓ |
| `Hover` | 10秒 | ✓ |
| `WaitFor` | 30秒 | ✓ |
| `GetText` | 10秒 | ✗ |
| `GetValue` | 10秒 | ✗ |
| `Navigate` | 60秒 | ✓ |

#### 超时配置示例

##### Click 操作
```go
opts := &ClickOptions{
    WaitVisible: true,
    WaitEnabled: true,
    Timeout:     5 * time.Second,  // 自定义超时为5秒
    Button:      "left",
    ClickCount:  1,
}
result, err := executor.Click(ctx, "#submit-button", opts)
```

##### Type 操作
```go
opts := &TypeOptions{
    Clear:       true,
    WaitVisible: true,
    Timeout:     8 * time.Second,  // 自定义超时为8秒
    Delay:       50 * time.Millisecond,
}
result, err := executor.Type(ctx, "#email-input", "user@example.com", opts)
```

##### Hover 操作（新增超时支持）
```go
opts := &HoverOptions{
    WaitVisible: true,
    Timeout:     5 * time.Second,  // 自定义超时为5秒
}
result, err := executor.Hover(ctx, ".dropdown-menu", opts)
```

##### WaitFor 操作
```go
opts := &WaitForOptions{
    Timeout: 15 * time.Second,  // 自定义超时为15秒
    State:   "visible",
}
result, err := executor.WaitFor(ctx, "#loading-spinner", opts)
```

#### 超时错误消息
当操作超时时，会返回详细的错误信息：
```
Element not visible: #submit-button (timeout after 10s)
Element not found: .dropdown-item (timeout after 10s)
Wait failed for state 'visible': timeout (timeout after 30s)
```

#### 最佳实践

1. **根据页面加载速度调整超时**
   ```go
   // 对于慢速网络或复杂页面
   opts := &ClickOptions{
       Timeout: 20 * time.Second,
   }
   ```

2. **为动态内容设置更长的超时**
   ```go
   // 等待异步加载的内容
   opts := &WaitForOptions{
       Timeout: 30 * time.Second,
       State:   "visible",
   }
   ```

3. **为快速操作设置更短的超时**
   ```go
   // 对于已知快速响应的元素
   opts := &ClickOptions{
       Timeout: 3 * time.Second,
   }
   ```

---

## 技术实现细节

### findElementWithTimeout 函数
新增的 `findElementWithTimeout` 函数替代了原来的 `findElement`，在查找元素时就应用超时：

```go
func (e *Executor) findElementWithTimeout(
    ctx context.Context, 
    page *rod.Page, 
    identifier string, 
    timeout time.Duration,
) (*rod.Element, error)
```

该函数支持多种元素查找方式：
1. 语义树索引（如 "Input Element [1]"）
2. CSS 选择器
3. XPath
4. 文本内容匹配
5. ARIA 标签匹配
6. Placeholder 匹配

所有查找方式都会应用指定的超时时间。

---

## 向后兼容性

所有更改都保持了向后兼容：
- 所有选项参数都可以传 `nil`，会使用合理的默认值
- 现有代码无需修改即可受益于超时保护
- `Hover` 函数签名略有变化，但新增的 `opts` 参数可以传 `nil`

---

## 语义树提取优化 (2026-01-15)

### 问题
原来的 `ExtractSemanticTree` 实现返回的可交互元素太少，很多页面上明显可点击的元素没有被识别。

### 优化内容

#### 1. 改进元素选择器
- 包含所有 `<a>` 标签（不仅仅是有 `href` 的）
- 添加 Angular/Vue 点击事件选择器（`ng-click`, `v-on:click`, `@click`）
- 添加带 `onclick` 的 `div`、`span`、`li` 元素
- 使用 ObjectID 去重，避免重复元素

#### 2. 修正元素类型识别
**问题**：原来的实现会用 `type` 属性覆盖所有元素的类型，导致 `<a>` 标签可能被错误分类。

**修复**：只对 `input` 和 `button` 元素使用 `type` 属性，其他元素保持使用标签名。

```go
// 仅对 input 和 button 元素使用 type 属性
if elemType, ok := node.Attributes["type"]; ok && (tagNameStr == "input" || tagNameStr == "button") {
    node.Type = elemType
}
```

#### 3. 更宽松的可见性检查
**问题**：Rod 的 `Visible()` 方法检查过于严格，会过滤掉一些实际可点击的元素。

**优化**：采用三级检查策略
1. 首先使用 Rod 的 `Visible()` 方法
2. 如果失败，检查元素位置（宽高 > 0）
3. 最后使用 JavaScript 检查 CSS 属性

```go
// 检查 display、visibility、opacity 等
visibleJS, err := elem.Eval(`() => {
    const rect = this.getBoundingClientRect();
    const style = window.getComputedStyle(this);
    return rect.width > 0 && rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
}`)
```

#### 4. 改进可点击元素过滤逻辑
- **移除强制 `IsEnabled` 检查**：某些可点击元素可能没有 `disabled` 属性
- **添加多种判断条件**：
  - 标签类型（button, a, submit）
  - Role 属性（button, link, menuitem, tab, checkbox, radio）
  - 有 `onclick` 属性
  - 链接有有效的 `href`
- **要求元素有基本标识**：至少有 label、text、id 或 name 之一

#### 5. 扩展输入元素类型
添加更多输入类型支持：
```go
inputTypes := map[string]bool{
    "text": true, "email": true, "password": true,
    "search": true, "tel": true, "url": true,
    "number": true, "date": true, "time": true,
    "datetime-local": true, "month": true, "week": true,
    "color": true, "file": true, "range": true,
    "textarea": true,
}
```

同时支持：
- `<select>` 元素
- `contenteditable="true"` 元素

### 效果对比

**优化前**：
```
Clickable Elements:
  Clickable Element [1]: id:csaitab (type: a)
  Clickable Element [2]: tj_login (type: a) - 登录
  Clickable Element [3]: 百度一下 (type: button)
```

**优化后**（预期）：
```
Clickable Elements:
  Clickable Element [1]: 百度首页 (type: a)
  Clickable Element [2]: 新闻 (type: a)
  Clickable Element [3]: hao123 (type: a)
  Clickable Element [4]: 地图 (type: a)
  Clickable Element [5]: 贴吧 (type: a)
  ... (更多元素)
  Clickable Element [15]: 登录 (type: a)
  Clickable Element [16]: 百度一下 (type: button)
```

---

## 总结

这些改进大幅提高了 executor 的可用性和鲁棒性：
1. **语义树自动返回**使得页面分析更便捷
2. **超时机制**防止操作无限期挂起
3. **详细的错误信息**帮助快速定位问题
4. **优化的元素识别**能发现更多可交互元素
5. **更宽松的可见性检查**减少误过滤

建议在使用时根据实际页面特性调整超时配置，以获得最佳的自动化体验。
