# RefID 语义化定位器重构

## 概述

基于对 [agent-browser](https://github.com/vercel-labs/agent-browser) 的深入分析，我们完成了对 RefID 实现的重大重构。

**核心改变**：从基于 `BackendNodeID` 的直接节点引用改为基于 `role+name+nth` 的语义化定位。

## 问题背景

### 用户反馈

```
不行。虽然有返回了，click执行的跟实际返回的snapshot的不一样的。
```

### 根本原因

我们之前的实现存在根本性问题：

1. **使用 BackendNodeID**：
   ```go
   // 旧实现
   refIDMap["e1"] = proto.DOMBackendNodeID(12345)
   
   // 查找时
   obj := proto.DOMResolveNode{BackendNodeID: 12345}.Call(page)
   ```

2. **问题**：
   - ❌ BackendNodeID 在页面变化后失效
   - ❌ AJAX/动态内容导致 DOM 重新渲染后，节点 ID 变化
   - ❌ 即使页面看起来没变，内部节点可能已被替换

## agent-browser 的解决方案

### 核心设计

agent-browser 使用 **语义化定位器** (Semantic Locators)：

```typescript
// RefMap 存储语义化信息
refs["e1"] = {
  selector: "getByRole('button', { name: \"Submit\", exact: true })",
  role: "button",
  name: "Submit",
  nth: 0  // 用于处理重复元素
}

// 查找时：重新使用 Playwright 定位器
let locator = page.getByRole("button", { name: "Submit", exact: true });
if (nth !== undefined) {
  locator = locator.nth(nth);
}
```

### 为什么更好？

✅ **抗页面变化**：即使 DOM 重新渲染，role+name 通常保持不变  
✅ **符合 Web 标准**：基于 ARIA roles，符合可访问性最佳实践  
✅ **语义化**：AI 更容易理解 "button Submit" vs "node 12345"  
✅ **可调试**：定位器本身就说明了查找逻辑

## 我们的重构

### 新的数据结构

```go
// RefData 存储语义化定位信息
type RefData struct {
	Role        string // ARIA role (button, link, textbox, etc.)
	Name        string // 可见文本或 aria-label
	Nth         int    // 同 role+name 中的索引
	BackendID   int    // 可选：暂不使用
	Tag         string // HTML tag (可选)
	Placeholder string // 占位符（可选）
}

// RefID 映射改变
// 旧：map[string]proto.DOMBackendNodeID
// 新：map[string]*RefData
refIDMap map[string]*RefData
```

### RefID 分配逻辑

```go
func (e *Executor) assignRefIDs(snapshot *AccessibilitySnapshot) {
	// 跟踪 role:name 组合，用于处理重复元素
	roleNameCounter := make(map[string]int)
	
	for _, node := range clickables {
		// 构建 role:name key
		key := fmt.Sprintf("%s:%s", node.Role, node.Label)
		nth := roleNameCounter[key]
		roleNameCounter[key]++
		
		// 分配 RefID
		refID := fmt.Sprintf("e%d", e.refIDCounter)
		e.refIDMap[refID] = &RefData{
			Role: node.Role,
			Name: node.Label,
			Nth:  nth,
		}
	}
}
```

### 元素查找逻辑

```go
func (e *Executor) findElementByRefID(ctx context.Context, page *rod.Page, refID string) (*rod.Element, error) {
	// 1. 获取语义化定位器数据
	refData := e.refIDMap[refID]
	
	// 2. 构建 XPath（基于 role + name）
	xpath := buildXPathFromRole(refData.Role, refData.Name)
	
	// 3. 查找所有匹配的元素
	elements, err := page.ElementsX(xpath)
	
	// 4. 选择第 nth 个（处理重复元素）
	if refData.Nth < len(elements) {
		return elements[refData.Nth], nil
	}
	
	return nil, fmt.Errorf("element not found")
}
```

### role-based XPath 构建器

新增 `role_xpath.go` 文件，包含完整的 role 到 XPath 映射：

```go
// 示例：button
func buildButtonXPath(name string) string {
	return fmt.Sprintf(`(
		//button[normalize-space(.)='%s'] |
		//input[@type='button' and @value='%s'] |
		//input[@type='submit' and @value='%s'] |
		//button[@aria-label='%s'] |
		//*[@role='button' and normalize-space(.)='%s']
	)`, name, name, name, name, name)
}

// 支持的 roles：
// - button, link, textbox, checkbox, radio
// - combobox, heading, list, listitem
// - cell, row, menuitem, tab
// - article, region, navigation, main
// - banner, contentinfo, complementary
// ... 更多
```

## 对比示例

### 场景：动态内容

```html
<!-- 初始状态 -->
<button id="submit">Submit</button>

<!-- AJAX 后，DOM 重新渲染 -->
<button id="submit-btn">Submit</button>
```

#### 旧实现（BackendNodeID）

```
1. snapshot → @e1 (BackendNodeID=12345)
2. AJAX 重新渲染
3. click(@e1) → ❌ 失败！
   错误：failed to resolve node: node not found
```

#### 新实现（语义化定位器）

```
1. snapshot → @e1 (role=button, name=Submit, nth=0)
2. AJAX 重新渲染
3. click(@e1) → ✅ 成功！
   重新查找：//button[normalize-space(.)='Submit']
```

### 场景：重复元素

```html
<button>Submit</button>
<button>Submit</button>
<button>Cancel</button>
```

```
snapshot输出：
- button "Submit" [@e1] [nth=0]
- button "Submit" [@e2] [nth=1]
- button "Cancel" [@e3]

查找逻辑：
@e1 → //button[normalize-space(.)='Submit'] -> 选择第0个
@e2 → //button[normalize-space(.)='Submit'] -> 选择第1个
@e3 → //button[normalize-space(.)='Cancel'] -> 选择第0个
```

## 技术细节

### XPath vs CSS Selector

我们选择 XPath 而非 CSS Selector 的原因：

✅ **更强大的文本匹配**：`normalize-space(.)='Submit'`  
✅ **支持关联查找**：通过 label 查找 input  
✅ **更灵活的组合**：`|` 运算符支持多种查找方式  
✅ **更接近语义**：表达 "按钮包含文本Submit" 更自然

### rod 的限制

rod 不像 Playwright 有 `getByRole()` API，我们通过 XPath 模拟：

```go
// Playwright (agent-browser)
page.getByRole('button', { name: 'Submit' })

// rod (browserpilot)
xpath := `//button[normalize-space(.)='Submit']`
page.ElementsX(xpath)
```

### Text Node 处理

保留了原有的 Text node 父元素查找逻辑，确保可点击：

```go
// 检查是否是 Text 节点
nodeType, _ := elem.Eval(`() => this.nodeType`)
if nodeType.Value.Int() == 3 {
	// 获取父元素
	parent := elem.Eval(`() => this.parentElement`)
	elem = page.ElementFromObject(parent)
}
```

## 优势总结

| 维度 | 旧实现 (BackendNodeID) | 新实现 (Semantic Locator) |
|------|---------------------|--------------------------|
| **稳定性** | ❌ 页面变化后失效 | ✅ role+name 保持稳定 |
| **可靠性** | ❌ 依赖 DOM 结构 | ✅ 语义化，抗变化 |
| **调试性** | ❌ 节点 ID 无意义 | ✅ role+name 易理解 |
| **性能** | ✅ 直接解析（快） | 🟡 重新查找（稍慢但可接受） |
| **标准化** | ❌ Chrome 特定 | ✅ 符合 ARIA 标准 |
| **AI 友好** | ❌ 数字 ID | ✅ 语义化描述 |

## 测试建议

### 测试用例 1：基本查找

```bash
# 1. 获取 snapshot
curl -X POST .../browser_snapshot

# 输出：
# - button "Submit" [@e1]

# 2. 点击元素
curl -X POST .../browser_click -d '{"identifier": "@e1"}'

# 应该成功
```

### 测试用例 2：页面变化后

```bash
# 1. 获取 snapshot
curl -X POST .../browser_snapshot
# - button "Submit" [@e1]

# 2. 触发 AJAX（页面内容变化）
curl -X POST .../browser_click -d '{"identifier": "@e99"}'  # 触发某个导致页面变化的操作

# 3. 再次点击 @e1
curl -X POST .../browser_click -d '{"identifier": "@e1"}'

# 应该仍然成功！（关键测试点）
```

### 测试用例 3：重复元素

```bash
# HTML:
# <button>Submit</button>
# <button>Submit</button>

# snapshot 输出：
# - button "Submit" [@e1] [nth=0]
# - button "Submit" [@e2] [nth=1]

# 点击第一个
curl -X POST .../browser_click -d '{"identifier": "@e1"}'  # ✅ 第一个

# 点击第二个
curl -X POST .../browser_click -d '{"identifier": "@e2"}'  # ✅ 第二个
```

### 测试用例 4：不同 role

```bash
# HTML:
# <a href="#">首页</a>
# <input type="text" placeholder="搜索">
# <button>提交</button>

# snapshot 输出：
# - link "首页" [@e1]
# - textbox "搜索" [@e2]
# - button "提交" [@e3]

# 测试各种 role
curl -X POST .../browser_click -d '{"identifier": "@e1"}'  # 点击链接 ✅
curl -X POST .../browser_fill -d '{"identifier": "@e2", "text": "test"}'  # 填充输入框 ✅
curl -X POST .../browser_click -d '{"identifier": "@e3"}'  # 点击按钮 ✅
```

## 日志输出

新实现提供详细的调试日志：

```
[INFO] [assignRefIDs] Assigning RefIDs to 42 clickable elements
[INFO] [assignRefIDs] e1 -> role=button, name=Submit, nth=0, backendID=12345
[INFO] [assignRefIDs] e2 -> role=link, name=首页, nth=0, backendID=12346
...
[INFO] [assignRefIDs] Total RefIDs in map: 42 (using semantic locators)

[INFO] [findElementByRefID] Looking up refID: e1
[INFO] [findElementByRefID] Found refData for e1: role=button, name=Submit, nth=0 (cache age: 2m30s)
[INFO] [findElementByRefID] Built XPath: //button[normalize-space(.)='Submit'] | ...
[INFO] [findElementByRefID] Found 2 matching elements, selecting nth=0
[INFO] [findElementByRefID] Successfully selected element at nth=0 for refID e1
```

## 相关文档

- [RefID 实现文档](./REFID_IMPLEMENTATION.md) - 初始实现
- [agent-browser RefID 分析](./AGENT_BROWSER_REFID_ANALYSIS.md) - 详细对比分析
- [RefID 故障排查指南](./REFID_TROUBLESHOOTING.md) - 使用指南

## 下一步

1. ✅ 完成重构（已完成）
2. 🔄 测试各种场景（进行中）
3. ⏸️ 性能优化（如需要）
4. ⏸️ 扩展更多 role 支持（如需要）

## 总结

这次重构将 browserpilot 的 RefID 实现从 Chrome 特定的 `BackendNodeID` 改为符合 Web 标准的 **语义化定位器 (Semantic Locators)**，大幅提高了稳定性和可靠性。

参考 agent-browser 的成熟实现，我们实现了：

✅ **role+name+nth** 三元组定位  
✅ **XPath 构建器**支持20+种 ARIA roles  
✅ **重复元素处理**通过 nth 索引  
✅ **详细日志**便于调试

现在，即使页面内容动态变化，RefID 仍然能够稳定地找到目标元素！🎯
