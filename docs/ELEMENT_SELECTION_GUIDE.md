# 元素选择指南

## 概述

browserpilot 支持三种元素选择方式，优先级从高到低：

1. **RefID** (`@e1`, `@e2`) - 推荐，最稳定
2. **CSS Selector** (`#id`, `.class`) - 标准，精确
3. **XPath** (`//button[text()='Submit']`) - 灵活，强大

## 推荐工作流程

### 步骤 1：获取 Snapshot

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_snapshot"
    }
  }' | jq -r '.result.content[0].text'
```

**输出示例：**
```
Page Interactive Elements:
(Use RefID like '@e1' or standard selectors like CSS/XPath to interact with elements)

Clickable Elements:
  @e1 关于 (role: link)
  @e2 #JMeter1 (role: link)
  @e3 编写提示词需要遵循的五个原则（附实践案例） (role: link)
  @e4 使用 FastMCP 编写一个 MySQL MCP Server (role: heading)
  @e5 提交 (role: button)

Input Elements:
  @e6 搜索 (role: textbox) [placeholder: 输入关键词]
  @e7 邮箱 (role: textbox) [placeholder: your@email.com]
```

### 步骤 2：使用 RefID 交互

```bash
# 点击链接
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_click",
      "arguments": {"identifier": "@e1"}
    }
  }'

# 填充输入框
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "browser_fill",
      "arguments": {
        "identifier": "@e6",
        "text": "测试搜索"
      }
    }
  }'

# 点击按钮
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "browser_click",
      "arguments": {"identifier": "@e5"}
    }
  }'
```

## 方式 1：RefID（推荐）

### 特点

✅ **最稳定**：5分钟缓存，抗页面变化  
✅ **最简单**：直接从 snapshot 复制 RefID  
✅ **最快速**：优先使用 BackendNodeID 直接查找  
✅ **最可靠**：多层 fallback 策略

### 查找策略

RefID 使用4层查找策略确保准确性：

```
@e1 → 查找 refID="e1" 的元素

优先级 1: BackendNodeID (12345)
  ↓ 快速直接解析
  ↓ 验证 href/id 是否匹配
  ✅ 成功 → 返回

优先级 2: href/id 精确匹配
  ↓ //a[@href='/about']
  ↓ //*[@id='submit-btn']
  ✅ 成功 → 返回

优先级 3: role+name+nth XPath
  ↓ //a[normalize-space(.)='关于']
  ↓ 选择第 nth 个匹配的元素
  ✅ 成功 → 返回

优先级 4: 通用文本查找
  ↓ //*[contains(text(), '关于') and clickable]
  ✅ 成功 → 返回

❌ 所有策略都失败 → 返回错误
```

### 适用场景

✅ **动态网页**：AJAX 加载、SPA 路由  
✅ **批量操作**：一次 snapshot，多次交互  
✅ **AI 工作流**：LLM 解析 snapshot，使用 RefID  
✅ **不熟悉的网站**：不知道元素的 id/class

### 示例

```bash
# AI 工作流示例
# 1. AI 获取 snapshot
snapshot = call("browser_snapshot")

# 2. AI 解析输出，找到目标
# "我需要点击'关于'链接"
# AI 找到：@e1 关于 (role: link)

# 3. AI 执行操作
call("browser_click", {"identifier": "@e1"})

# 4. 验证结果
url = call("browser_evaluate", {"script": "window.location.href"})
assert url == "https://leileiluoluo.com/about/"
```

## 方式 2：CSS Selector

### 特点

✅ **标准化**：Web 标准，开发者熟悉  
✅ **精确**：通过 id/class 唯一定位  
⚠️ **依赖结构**：需要元素有 id/class 属性

### 适用场景

✅ **元素有 id**：`#submit-btn`  
✅ **元素有 class**：`.nav-link`, `.btn-primary`  
✅ **已知页面结构**：开发自己的网站  
❌ **动态 class**：`class="btn-1234"`（随机生成）

### 示例

```bash
# 通过 id
curl .../browser_click -d '{"identifier": "#submit-button"}'

# 通过 class
curl .../browser_click -d '{"identifier": ".login-btn"}'

# 复杂选择器
curl .../browser_click -d '{"identifier": "button[type=submit].primary"}'

# 层级选择器
curl .../browser_click -d '{"identifier": "#header .nav-menu > li:first-child > a"}'
```

## 方式 3：XPath

### 特点

✅ **最灵活**：支持复杂条件  
✅ **强大文本匹配**：`contains()`, `normalize-space()`  
✅ **关联查找**：通过 label 找 input  
⚠️ **语法复杂**：需要了解 XPath

### 适用场景

✅ **通过文本查找**：`//button[text()='提交']`  
✅ **通过属性查找**：`//a[@href='/about']`  
✅ **复杂条件**：`//div[@class='item' and @data-active='true']`  
✅ **层级关系**：`//div[@id='menu']//a[1]`

### 示例

```bash
# 通过文本查找按钮
curl .../browser_click -d '{"identifier": "//button[text()='\''提交'\'']"}'

# 通过 href 查找链接
curl .../browser_click -d '{"identifier": "//a[@href='\''/about'\'']"}'

# 部分文本匹配
curl .../browser_click -d '{"identifier": "//a[contains(text(), '\''编写'\'')]"}'

# 通过 label 查找 input
curl .../browser_fill -d '{
  "identifier": "//input[@id=//label[text()='\''邮箱'\'']/@for]",
  "text": "test@example.com"
}'
```

## 最佳实践

### 1. 优先使用 RefID

```bash
# ✅ 推荐：RefID
curl .../browser_snapshot
curl .../browser_click -d '{"identifier": "@e1"}'

# ❌ 不推荐：索引（已移除）
curl .../browser_click -d '{"identifier": "Clickable Element [1]"}'
```

### 2. 批量操作使用 RefID

```bash
# 一次 snapshot，多次操作（5分钟内有效）
curl .../browser_snapshot
curl .../browser_click -d '{"identifier": "@e1"}'
curl .../browser_fill -d '{"identifier": "@e6", "text": "test"}'
curl .../browser_click -d '{"identifier": "@e5"}'
```

### 3. 精确定位使用 CSS/XPath

```bash
# 如果知道元素的 id
curl .../browser_click -d '{"identifier": "#submit-btn"}'

# 如果知道元素的 href
curl .../browser_click -d '{"identifier": "//a[@href='\''/about'\'']"}'
```

### 4. 页面变化后重新 Snapshot

```bash
# 1. 初始 snapshot
curl .../browser_snapshot

# 2. 操作（可能导致页面变化）
curl .../browser_click -d '{"identifier": "@e1"}'

# 3. 页面变化后，重新 snapshot
curl .../browser_snapshot

# 4. 使用新的 RefID
curl .../browser_click -d '{"identifier": "@e1"}'  # 新的 @e1 可能对应不同元素
```

## 错误处理

### RefID 过期

```bash
# 错误：refID e1 not found (cache may be stale, run browser_snapshot first)

# 解决：重新获取 snapshot
curl .../browser_snapshot
```

### 元素未找到

```bash
# 错误：element not found for refID e1 (page may have changed, run browser_snapshot again)

# 解决：页面已变化，重新 snapshot
curl .../browser_snapshot
```

### CSS Selector 无效

```bash
# 错误：element not found: #wrong-id (timeout after 10s)

# 解决：使用 RefID 或检查选择器
curl .../browser_snapshot  # 查看可用的 RefID
```

## 总结

新的元素选择方式：

| 方式 | 格式 | 适用场景 | 稳定性 |
|------|------|---------|--------|
| RefID | `@e1` | AI工作流、动态网页 | ⭐⭐⭐⭐⭐ |
| CSS | `#id`, `.class` | 有id/class的元素 | ⭐⭐⭐⭐ |
| XPath | `//button[text()='提交']` | 复杂条件、文本匹配 | ⭐⭐⭐ |

**推荐**：优先使用 RefID，简单、稳定、无歧义！🚀
