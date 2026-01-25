# SKILL.md 和 API 文档 RefID 更新

## 概述

更新了所有面向用户的文档（SKILL.md 和 handlers.go），移除了已弃用的索引定位方式，改为使用 RefID。

## 更新内容

### 1. 移除的定位方式 ❌

以下定位方式已从所有文档中移除：

- `Clickable Element [1]`
- `Input Element [1]`
- `[1]`, `[2]` (纯索引方式)

**原因**：这些索引方式有严重的歧义问题：
- 索引顺序不稳定（Accessibility Tree 顺序 ≠ DOM 顺序）
- 重新获取快照会导致索引变化
- 点击的元素可能不是 snapshot 中显示的元素

详见：[REFID_ONLY_SIMPLIFICATION.md](./REFID_ONLY_SIMPLIFICATION.md)

### 2. 新的推荐方式 ✅

#### RefID（推荐）

```bash
# 1. 获取 snapshot
curl -X GET 'http://{host}/api/v1/executor/snapshot'

# 输出：
# Clickable Elements:
#   @e1 Login (role: button)
#   @e2 Sign Up (role: link)
#
# Input Elements:
#   @e3 Email (role: textbox) [placeholder: your@email.com]
#   @e4 Password (role: textbox)

# 2. 使用 RefID 交互
curl -X POST 'http://{host}/api/v1/executor/click' \
  -d '{"identifier": "@e1"}'

curl -X POST 'http://{host}/api/v1/executor/type' \
  -d '{"identifier": "@e3", "text": "user@example.com"}'
```

#### 其他支持的方式

```bash
# CSS Selector
{"identifier": "#submit-btn"}
{"identifier": ".login-form input[type=email]"}

# XPath
{"identifier": "//button[@type='submit']"}
{"identifier": "//a[contains(text(), '登录')]"}

# Text content
{"identifier": "Login"}
{"identifier": "Submit"}
```

## 更新的文件

### 1. SKILL.md

**更新点：**
- ✅ Snapshot 响应示例改为 RefID 格式
- ✅ 所有命令示例使用 RefID (`@e1`, `@e2`)
- ✅ Identifier 格式说明更新
- ✅ 工作流说明改为"获取 RefIDs"
- ✅ 完整示例场景更新

**对比：**

| 位置 | 旧内容 | 新内容 |
|------|--------|--------|
| Snapshot 响应 | `"Clickable Element [1]: Login Button"` | `"@e1 Login (role: button)"` |
| Click 示例 | `{"identifier": "[1]"}` | `{"identifier": "@e1"}` |
| Type 示例 | `{"identifier": "Input Element [1]"}` | `{"identifier": "@e3"}` |
| Batch 示例 | `"identifier": "[1]"` | `"identifier": "@e1"` |

### 2. handlers.go (ExecutorHelp)

**更新函数：**
- `ExecutorHelp()` - 第 3275 行
- `generateExecutorSkillMD()` - 第 4790 行

**更新点：**
- ✅ Click 命令参数描述：`RefID (@e1, @e2 from snapshot), CSS selector, XPath, or text content`
- ✅ Snapshot 说明：`get element RefIDs`
- ✅ 响应示例改为 RefID 格式
- ✅ 所有代码示例使用 RefID
- ✅ 工作流步骤更新

**对比：**

```diff
// 旧
- "description": "Element identifier: CSS selector, XPath, text, semantic index ([1], Clickable Element [1])",
- "example":     "#button-id or [1]",

// 新
+ "description": "Element identifier: RefID (@e1, @e2 from snapshot), CSS selector, XPath, or text content",
+ "example":     "@e1 or #button-id",
```

## 优势对比

| 维度 | 旧方式（索引） | 新方式（RefID） |
|------|-------------|----------------|
| **歧义性** | ❌ 高（顺序不稳定） | ✅ 无歧义 |
| **稳定性** | ❌ 索引易变化 | ✅ 5分钟缓存 |
| **准确性** | ❌ 点击≠显示 | ✅ 多策略fallback |
| **明确性** | ❌ `[1]` 不够清晰 | ✅ `@e1` 清晰明了 |
| **调试性** | ❌ 难以追踪 | ✅ 易于调试 |

## RefID 的技术优势

### 1. 多策略查找

```
RefID (@e1) 查找顺序：
1️⃣ BackendNodeID（最快）
   → 直接节点引用
   → 验证 href/id 匹配
   
2️⃣ 属性精确匹配（最准确）
   → //a[@href='/tags/jmeter/']
   → //*[@id='submit-btn']
   
3️⃣ role+name+nth XPath（最稳定）
   → //a[normalize-space(.)='#JMeter1']
   → 选择第 nth 个匹配的
   
4️⃣ 通用文本查找（最宽松）
   → //*[contains(text(), 'JMeter') and clickable]
```

### 2. 5分钟缓存

```python
# 一次 snapshot，多次操作
snapshot = call_mcp("browser_snapshot")
# @e1, @e2, @e3 等在接下来5分钟内有效

click("@e1")  # 有效
fill("@e3", "text")  # 有效
click("@e2")  # 有效

# 5分钟后或页面变化后，重新 snapshot
snapshot = call_mcp("browser_snapshot")
```

### 3. 智能验证

```go
// 查找到元素后会验证
if element.href != refData.Href {
    // 继续尝试其他策略
}
```

## AI 工作流更新

### 旧工作流 ❌

```
1. navigate(url)
2. snapshot()
   输出: "Clickable Element [1]: Login"
3. click("[1]")  ← 可能点击错误元素
```

### 新工作流 ✅

```
1. navigate(url)
2. snapshot()
   输出: "@e1 Login (role: button)"
3. click("@e1")  ← 精确点击
```

## 示例场景对比

### 场景：登录表单

#### 旧方式

```bash
# 1. Snapshot
Response: "Input Element [1]: Username\nInput Element [2]: Password\nClickable Element [1]: Login"

# 2. 填写表单（有歧义）
POST /type {"identifier": "Input Element [1]", "text": "john"}
POST /type {"identifier": "Input Element [2]", "text": "pass"}
POST /click {"identifier": "Clickable Element [1]"}
```

#### 新方式

```bash
# 1. Snapshot
Response: "@e2 Username (role: textbox)\n@e3 Password (role: textbox)\n@e1 Login (role: button)"

# 2. 填写表单（清晰无歧义）
POST /type {"identifier": "@e2", "text": "john"}
POST /type {"identifier": "@e3", "text": "pass"}
POST /click {"identifier": "@e1"}
```

## 向后兼容性

✅ **完全向后兼容**：
- CSS Selector 继续工作：`#id`, `.class`
- XPath 继续工作：`//button[text()='Submit']`
- Text 继续工作：`Login`

❌ **不再支持**：
- `[1]`, `[2]` 等纯索引
- `Clickable Element [1]`
- `Input Element [1]`

**迁移建议**：
```python
# 旧代码
click("[1]")
type("Input Element [1]", "text")

# 新代码
snapshot()  # 获取 RefIDs
click("@e1")
type("@e3", "text")
```

## 相关文档

1. **RefID 设计**
   - [REFID_ONLY_SIMPLIFICATION.md](./REFID_ONLY_SIMPLIFICATION.md) - 为什么移除索引
   - [REFID_IMPLEMENTATION.md](./REFID_IMPLEMENTATION.md) - RefID 实现
   - [REFID_SEMANTIC_LOCATOR_REFACTOR.md](./REFID_SEMANTIC_LOCATOR_REFACTOR.md) - 语义化定位器

2. **使用指南**
   - [ELEMENT_SELECTION_GUIDE.md](./ELEMENT_SELECTION_GUIDE.md) - 元素选择完整指南

3. **其他改进**
   - [BROWSER_EVALUATE_GUIDE.md](./BROWSER_EVALUATE_GUIDE.md) - evaluate 智能包装
   - [BROWSER_GET_PAGE_INFO_ENHANCED.md](./BROWSER_GET_PAGE_INFO_ENHANCED.md) - page_info 增强

## 测试

```bash
cd /root/code/browserpilot/test

# 启动服务器
./browserwing-test --port 18080 &

# 测试 RefID 功能
curl -X POST http://localhost:18080/api/v1/executor/navigate \
  -d '{"url": "https://leileiluoluo.com"}'

curl -X GET http://localhost:18080/api/v1/executor/snapshot

# 使用返回的 RefID 进行操作
curl -X POST http://localhost:18080/api/v1/executor/click \
  -d '{"identifier": "@e1"}'
```

## 总结

✅ **移除歧义**：不再使用不稳定的索引方式  
✅ **清晰明确**：RefID 格式 `@e1` 清晰易懂  
✅ **稳定可靠**：多策略fallback + 5分钟缓存  
✅ **文档一致**：SKILL.md 和 API 文档全部更新  
✅ **AI 友好**：更适合 LLM 理解和使用  

现在所有的用户文档都已更新为推荐使用 RefID 的方式，提供了更稳定、更可靠、更清晰的浏览器自动化体验！🎯
