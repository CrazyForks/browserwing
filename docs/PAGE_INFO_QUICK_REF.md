# browser_get_page_info 快速参考

## TL;DR

现在返回**丰富的页面信息**，不再只是简单的 `{url, title}`！

```bash
# 一次调用获取所有页面信息
curl .../browser_get_page_info

# 返回：
# - 基本：URL, title, viewport
# - 元素统计：links, buttons, inputs, images, etc.
# - 元数据：Open Graph, Twitter Card, SEO
# - 性能：加载时间，DOM ready 时间
# - 交互性：可点击/输入元素统计
# - 滚动：位置和是否可滚动
# - 语言：页面语言和文本方向
```

## 快速对比

### 旧版本 ❌

```json
{
  "url": "https://example.com",
  "title": "Example Domain"
}
```

### 新版本 ✅

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "viewport": {"width": 1280, "height": 720, "devicePixelRatio": 2},
  "elementCounts": {
    "links": 45, "buttons": 12, "inputs": 8, 
    "images": 20, "forms": 2, "headings": 18
  },
  "interactive": {
    "clickableElements": 57,
    "inputElements": 8,
    "visibleInputs": 6
  },
  "metadata": {
    "description": "...",
    "ogTitle": "...",
    "ogImage": "..."
  },
  "performance": {
    "domContentLoadedTime": 450,
    "loadTime": 850
  },
  "scroll": {
    "scrollY": 0,
    "scrollHeight": 2400,
    "isScrollable": true
  },
  "language": {
    "language": "zh-CN",
    "direction": "ltr"
  }
}
```

## 核心字段速查

| 字段 | 用途 | 示例 |
|------|------|------|
| `elementCounts.links` | 链接数量 | `45` |
| `elementCounts.forms` | 表单数量 | `2` |
| `interactive.clickableElements` | 可点击元素 | `57` |
| `interactive.inputElements` | 输入元素 | `8` |
| `performance.loadTime` | 加载时间（ms） | `850` |
| `scroll.isScrollable` | 是否可滚动 | `true` |
| `metadata.description` | 页面描述 | `"..."` |

## 典型使用模式

### 模式 1：快速页面诊断

```python
info = call_mcp("browser_get_page_info")

print(f"页面类型: ", end="")
if info["elementCounts"]["forms"] > 0:
    print("表单页")
elif info["elementCounts"]["links"] > 50:
    print("导航/列表页")
elif info["elementCounts"]["headings"] > 10:
    print("内容页")
else:
    print("其他")

print(f"交互性: {info['interactive']['clickableElements']} 个可点击元素")
print(f"性能: {info['performance']['loadTime']}ms")
```

### 模式 2：决策树

```python
info = call_mcp("browser_get_page_info")

# 决策：是否需要 snapshot
if info["interactive"]["clickableElements"] > 0:
    # 有交互元素，获取详细 refs
    snapshot = call_mcp("browser_snapshot")
    # ... 使用 refs 交互
else:
    # 无交互元素，直接提取内容
    content = call_mcp("browser_evaluate", {
        "script": "return document.body.innerText;"
    })
```

### 模式 3：性能监控

```python
info = call_mcp("browser_get_page_info")
perf = info.get("performance", {})

if perf.get("loadTime", 0) > 3000:
    print("⚠️ 页面加载慢")
    # 增加超时时间
    
if perf.get("domContentLoadedTime", 0) > 1500:
    print("⚠️ DOM 解析慢")
```

### 模式 4：滚动策略

```python
info = call_mcp("browser_get_page_info")
scroll = info.get("scroll", {})

if scroll.get("isScrollable"):
    total_height = scroll.get("scrollHeight")
    viewport_height = info["viewport"]["height"]
    
    # 需要滚动几次才能看完页面
    scroll_times = (total_height // viewport_height) + 1
    print(f"需要滚动 {scroll_times} 次")
```

## 工作流建议

### 标准流程

```
1. browser_navigate(url)
   ↓
2. browser_get_page_info()  ← 获取概览
   ↓
3. 分析 elementCounts 和 interactive
   ↓
4. 根据分析结果：
   - 有表单 → browser_snapshot → browser_fill + browser_click
   - 列表页 → browser_evaluate 提取链接
   - 内容页 → browser_evaluate 提取正文
   - 交互页 → browser_snapshot → 使用 refs 交互
```

### 优化流程（减少调用）

```
1. browser_navigate(url)
   ↓
2. browser_get_page_info()
   ↓
3. 直接从 interactive 判断：
   - clickableElements > 0 → browser_snapshot
   - clickableElements == 0 → browser_evaluate 提取内容
```

## MCP 调用示例

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_get_page_info"
    }
  }' | jq '.result.content[0].text | fromjson | {
    title,
    elementCounts,
    interactive,
    "loadTimeMs": .performance.loadTime
  }'
```

## 字段优先级

### 必看字段（优先级高）

1. `elementCounts` - 了解页面结构
2. `interactive` - 判断交互性
3. `documentState.readyState` - 确认页面加载完成

### 有用字段（优先级中）

4. `performance.loadTime` - 性能参考
5. `scroll.isScrollable` - 滚动策略
6. `metadata.description` - SEO 信息

### 可选字段（优先级低）

7. `viewport` - 视口信息
8. `language` - 语言信息

## 与其他命令配合

| 场景 | 命令组合 |
|------|---------|
| **表单填写** | `get_page_info` → `snapshot` → `fill` + `click` |
| **链接提取** | `get_page_info` → `evaluate` (提取链接) |
| **内容爬取** | `get_page_info` → `evaluate` (提取正文) |
| **性能分析** | `get_page_info` (看 performance) |
| **SEO 检查** | `get_page_info` (看 metadata) |

## 实用技巧

### 1. 快速判断页面类型

```python
def classify_page(info):
    counts = info["elementCounts"]
    if counts["forms"] > 0:
        return "form"
    elif counts["links"] > 50:
        return "navigation"
    elif counts["headings"] > 10:
        return "content"
    else:
        return "other"
```

### 2. 估算交互复杂度

```python
def interaction_complexity(info):
    interactive = info["interactive"]
    total = interactive["clickableElements"] + interactive["inputElements"]
    
    if total > 50:
        return "complex"
    elif total > 20:
        return "moderate"
    elif total > 0:
        return "simple"
    else:
        return "static"
```

### 3. 检测 SPA

```python
def is_spa(info):
    # SPA 通常有很多脚本，但初始 HTML 元素少
    counts = info["elementCounts"]
    scripts = counts.get("scripts", 0)
    total_elements = sum(counts.values())
    
    return scripts > 10 and total_elements < 100
```

## 测试

```bash
cd /root/code/browserpilot/test

# 启动服务器
./browserwing-test --port 18080 &

# 运行测试（测试 4 个不同类型的网站）
./test-page-info.sh
```

## 更多信息

- 详细文档: [BROWSER_GET_PAGE_INFO_ENHANCED.md](./BROWSER_GET_PAGE_INFO_ENHANCED.md)
- 测试脚本: `/root/code/browserpilot/test/test-page-info.sh`

---

**关键点**: `browser_get_page_info` 现在是一个强大的页面分析工具，可以帮助 MCP client（尤其是 AI）快速了解页面结构并做出决策！🚀
