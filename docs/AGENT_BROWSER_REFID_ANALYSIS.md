# agent-browser RefID 实现分析

## 核心发现

agent-browser 的 RefID 实现与我们当前的实现有**根本性区别**：

### 1. RefID 映射的是什么？

#### agent-browser（Playwright）
```typescript
// RefMap 存储语义化定位器信息
refs["e1"] = {
  selector: "getByRole('button', { name: \"Submit\", exact: true })",
  role: "button",
  name: "Submit",
  nth: 0  // 用于处理同 role+name 的多个元素
}
```

#### browserpilot（当前实现，rod）
```go
// refIDMap 存储 DOM 节点 ID
refIDMap["e1"] = proto.DOMBackendNodeID(12345)
```

### 2. 如何查找元素？

#### agent-browser（Playwright）
```typescript
// 每次都重新使用语义化定位器查找
function getLocatorFromRef(ref: string): Locator | null {
  const refData = this.refMap[ref];
  
  // 使用 role + name + exact 重新查找
  let locator = page.getByRole(refData.role, { 
    name: refData.name, 
    exact: true 
  });
  
  // 如果有重复元素，使用 nth 选择
  if (refData.nth !== undefined) {
    locator = locator.nth(refData.nth);
  }
  
  return locator;
}
```

#### browserpilot（当前实现，rod）
```go
// 直接通过 BackendNodeID 解析 DOM 节点
func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
  backendID := e.refIDMap[refID]
  
  // 直接解析节点
  obj, err := proto.DOMResolveNode{
    BackendNodeID: backendID,
  }.Call(page)
  
  elem, err := page.ElementFromObject(obj.Object)
  return elem, nil
}
```

## 关键差异分析

| 维度 | agent-browser (Playwright) | browserpilot (rod) |
|------|---------------------------|-------------------|
| **映射对象** | 语义化定位器 (role+name+nth) | DOM 节点 ID (BackendNodeID) |
| **查找方式** | 重新查找 (re-query) | 直接解析 (direct resolve) |
| **稳定性** | ✅ 页面变化后仍可查找 | ❌ 节点删除后失效 |
| **性能** | 🟡 每次重新查找（稍慢） | ✅ 直接解析（快） |
| **可靠性** | ✅ 语义化，抗变化 | ❌ 依赖 DOM 结构 |
| **缓存策略** | 缓存 refMap 直到下次 snapshot | 缓存 BackendNodeID 映射 |

## 为什么 agent-browser 的方式更好？

### 示例场景：动态内容

#### 场景 1: 页面重新渲染

```bash
# 1. 获取 snapshot
agent-browser snapshot
# 输出：
# - button "Submit" [ref=e1]

# 2. AJAX 请求后页面部分重新渲染
# DOM 节点被替换，BackendNodeID 变化

# 3. 点击 e1
agent-browser click @e1  # ✅ 成功！重新通过 role+name 查找
```

如果用 BackendNodeID：
```bash
# 1. 获取 snapshot（BackendNodeID = 12345）
browserpilot snapshot

# 2. 页面重新渲染，DOM 节点被替换

# 3. 点击 @e1
browserpilot click @e1  
# ❌ 失败！BackendNodeID 12345 已失效
# 错误：failed to resolve node: node not found
```

#### 场景 2: 同类元素

```html
<button>Submit</button>
<button>Submit</button>  <!-- 两个相同文本的按钮 -->
<button>Cancel</button>
```

agent-browser 的处理：
```
- button "Submit" [ref=e1] [nth=0]
- button "Submit" [ref=e2] [nth=1]
- button "Cancel" [ref=e3]
```

使用时：
```ts
// e1 -> getByRole('button', { name: 'Submit', exact: true }).nth(0)
// e2 -> getByRole('button', { name: 'Submit', exact: true }).nth(1)
// e3 -> getByRole('button', { name: 'Cancel', exact: true })
```

### 优势总结

✅ **更稳定**：语义不变，DOM 变了也能找到  
✅ **更可靠**：符合 Web 最佳实践（ARIA roles）  
✅ **更易调试**：定位器本身就说明了查找逻辑  
✅ **更符合 AI 理解**：语义化描述（"button Submit"）vs 节点 ID（12345）

## rod 的限制

**问题**：rod 没有 Playwright 的语义化定位器 API！

Playwright 有：
```ts
page.getByRole('button', { name: 'Submit' })
page.getByLabel('Email')
page.getByText('Welcome')
page.getByPlaceholder('Search...')
```

rod **没有**这些，只有：
```go
page.Element("button")  // CSS selector
page.ElementX("//button")  // XPath
```

## 解决方案

### 方案 1：模拟 Playwright 的语义化定位（推荐）

为每个 RefID 存储足够的信息来构建稳定的 CSS/XPath 选择器：

```go
type RefData struct {
  Role        string  // button, link, textbox, etc.
  Name        string  // 可见文本或 aria-label
  Nth         int     // 用于处理重复元素
  BackendID   proto.DOMBackendNodeID  // 备用（可选）
}

// RefID 查找逻辑
func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
  data := e.refIDMap[refID]
  
  // 方法 1：通过 role + name 构建选择器
  selector := buildSelectorFromRole(data.Role, data.Name)
  
  // 方法 2：通过 XPath 查找（更强大）
  xpath := buildXPathFromRole(data.Role, data.Name)
  elements, _ := page.ElementsX(xpath)
  
  // 如果有 nth，选择第 n 个
  if data.Nth > 0 && data.Nth < len(elements) {
    return elements[data.Nth], nil
  }
  
  return elements[0], nil
}

// 构建 XPath（支持 role + text）
func buildXPathFromRole(role, name string) string {
  switch role {
  case "button":
    if name != "" {
      // 查找按钮：<button>name</button> 或 <input type="button" value="name">
      return fmt.Sprintf("//button[normalize-space(text())='%s'] | //input[@type='button' and @value='%s']", name, name)
    }
    return "//button | //input[@type='button']"
  
  case "link":
    if name != "" {
      return fmt.Sprintf("//a[normalize-space(text())='%s']", name)
    }
    return "//a"
  
  case "textbox":
    if name != "" {
      // 通过 label 或 placeholder 查找
      return fmt.Sprintf("//input[@type='text' and (@placeholder='%s' or @aria-label='%s')] | //textarea[@placeholder='%s' or @aria-label='%s']", 
        name, name, name, name)
    }
    return "//input[@type='text'] | //textarea"
  
  // 更多 role 映射...
  default:
    return fmt.Sprintf("//*[@role='%s']", role)
  }
}
```

### 方案 2：混合策略（更实用）

1. **优先使用 BackendNodeID**（快速路径）
2. **失败时回退到语义化查找**（稳定路径）

```go
func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
  data := e.refIDMap[refID]
  
  // 尝试 1: 使用 BackendNodeID（快速）
  if data.BackendID != 0 {
    elem, err := resolveByBackendID(page, data.BackendID)
    if err == nil {
      // 验证元素是否匹配（防止 DOM 变化）
      if validateElement(elem, data) {
        return elem, nil
      }
    }
  }
  
  // 尝试 2: 使用语义化定位器（回退）
  logger.Warn(ctx, "BackendNodeID failed, falling back to semantic locator for %s", refID)
  return findBySemanticLocator(page, data)
}

func validateElement(elem *rod.Element, expected RefData) bool {
  // 验证元素的 role、文本等是否匹配
  text, _ := elem.Text()
  return strings.Contains(text, expected.Name)
}
```

### 方案 3：仅使用语义化定位（最简单，最稳定）

完全放弃 BackendNodeID，只用 role+name+nth：

```go
type RefData struct {
  Role  string
  Name  string
  Nth   int
}

func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
  data := e.refIDMap[refID]
  
  // 构建 XPath 或 CSS 选择器
  xpath := buildXPathFromRole(data.Role, data.Name)
  elements, err := page.ElementsX(xpath)
  if err != nil || len(elements) == 0 {
    return nil, fmt.Errorf("element not found for refID %s", refID)
  }
  
  // 选择第 nth 个匹配的元素
  if data.Nth >= len(elements) {
    return nil, fmt.Errorf("nth=%d out of range (found %d elements)", data.Nth, len(elements))
  }
  
  return elements[data.Nth], nil
}
```

## 推荐实现路径

### 阶段 1：改进 RefData 结构

```go
type RefData struct {
  Role        string  // ARIA role (button, link, textbox, etc.)
  Name        string  // 可见文本或 aria-label
  Nth         int     // 同 role+name 中的索引
  BackendID   proto.DOMBackendNodeID  // 可选：用于快速路径
  // 可选：更多属性用于精确匹配
  Tag         string  // HTML tag
  Classes     []string
  Placeholder string
}
```

### 阶段 2：实现 role-based XPath 构建器

```go
func buildXPathFromRole(role, name string) string {
  // 为每个 ARIA role 实现对应的 XPath
  // 参考 Playwright 的实现
}
```

### 阶段 3：更新 assignRefIDs 逻辑

```go
func (e *Executor) assignRefIDs(snapshot *AccessibilitySnapshot) {
  roleNameCounter := make(map[string]int)  // "button:Submit" -> 0, 1, 2...
  
  for _, node := range snapshot.GetClickableElements() {
    key := fmt.Sprintf("%s:%s", node.Role, node.Label)
    nth := roleNameCounter[key]
    roleNameCounter[key]++
    
    refID := fmt.Sprintf("e%d", e.refIDCounter+1)
    e.refIDCounter++
    
    e.refIDMap[refID] = RefData{
      Role:      node.Role,
      Name:      node.Label,
      Nth:       nth,
      BackendID: proto.DOMBackendNodeID(node.BackendNodeID),  // 可选
    }
    
    node.RefID = refID
  }
}
```

### 阶段 4：更新查找逻辑

```go
func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
  data, found := e.refIDMap[refID]
  if !found {
    return nil, fmt.Errorf("refID %s not found", refID)
  }
  
  logger.Info(ctx, "Finding element by refID %s: role=%s, name=%s, nth=%d", 
    refID, data.Role, data.Name, data.Nth)
  
  // 构建 XPath
  xpath := buildXPathFromRole(data.Role, data.Name)
  logger.Info(ctx, "XPath: %s", xpath)
  
  // 查找所有匹配的元素
  elements, err := page.ElementsX(xpath)
  if err != nil || len(elements) == 0 {
    return nil, fmt.Errorf("no elements found for refID %s", refID)
  }
  
  logger.Info(ctx, "Found %d elements, selecting nth=%d", len(elements), data.Nth)
  
  // 选择第 nth 个
  if data.Nth >= len(elements) {
    return nil, fmt.Errorf("nth=%d out of range (only %d elements)", data.Nth, len(elements))
  }
  
  return elements[data.Nth], nil
}
```

## 测试验证

### 测试用例 1：基本查找

```go
// HTML: <button>Submit</button>
snapshot → @e1 [role=button, name=Submit, nth=0]
click(@e1) → 成功
```

### 测试用例 2：重复元素

```go
// HTML:
// <button>Submit</button>
// <button>Submit</button>
snapshot → @e1 [role=button, name=Submit, nth=0]
           @e2 [role=button, name=Submit, nth=1]
click(@e1) → 点击第一个
click(@e2) → 点击第二个
```

### 测试用例 3：页面变化后

```go
snapshot → @e1 [role=button, name=Submit]
(AJAX 请求，DOM 重新渲染，BackendNodeID 变化)
click(@e1) → ✅ 仍然成功（通过 role+name 重新查找）
```

### 测试用例 4：不同 role

```go
// HTML:
// <a href="#">首页</a>
// <input type="text" placeholder="搜索">
// <button>提交</button>
snapshot → @e1 [role=link, name=首页]
           @e2 [role=textbox, name=搜索]
           @e3 [role=button, name=提交]
click(@e1) → 点击链接
fill(@e2, "test") → 填充输入框
click(@e3) → 点击按钮
```

## 总结

agent-browser 的 RefID 实现本质上是：
1. **语义化定位器的缓存和简化**
2. **每次查找都重新执行定位器**
3. **使用 nth 处理重复元素**

这种方式牺牲了一点性能（重新查找），换来了更高的稳定性和可靠性。对于 AI agent 来说，这是非常合理的权衡。

我们需要将当前基于 BackendNodeID 的实现改为基于语义化定位器（role+name+nth）的实现，以获得与 agent-browser 相同的稳定性！🎯
