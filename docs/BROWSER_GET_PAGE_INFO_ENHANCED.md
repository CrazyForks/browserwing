# browser_get_page_info 增强版

## 概述

`browser_get_page_info` 现在返回页面的综合信息，不再只是简单的 `url` 和 `title`。参考了 **playwright-mcp** 和 **agent-browser** 的设计理念。

## 设计理念

### Playwright MCP 的方法
- 没有单一的"页面信息"命令
- 通过多个专门工具组合获取信息：
  - `browser_snapshot`: 可访问性树
  - `browser_console_messages`: 控制台日志
  - `browser_network_requests`: 网络请求

### Agent-Browser 的方法
- 提供多个 `get` 子命令：
  - `get title`: 获取标题
  - `get url`: 获取 URL
  - `get count <selector>`: 统计元素
- 核心是 `snapshot` 命令（可访问性树 + refs）

### browserpilot 的策略
- **综合信息命令**: 一次调用获取所有页面元数据
- **快速概览**: MCP client 可以快速了解页面结构
- **配合 snapshot**: 获取信息后使用 `browser_snapshot` 获取可交互元素的 refs

## 返回数据结构

### 完整的 JSON 结构

```json
{
  "url": "https://leileiluoluo.com",
  "title": "我的博客 - 首页",
  
  "viewport": {
    "width": 1280,
    "height": 720,
    "devicePixelRatio": 2
  },
  
  "documentState": {
    "readyState": "complete",
    "documentElement": true,
    "body": true
  },
  
  "elementCounts": {
    "links": 45,
    "buttons": 12,
    "inputs": 8,
    "images": 20,
    "scripts": 15,
    "forms": 2,
    "iframes": 0,
    "headings": 18
  },
  
  "scroll": {
    "scrollX": 0,
    "scrollY": 150,
    "scrollWidth": 1280,
    "scrollHeight": 2400,
    "isScrollable": true
  },
  
  "metadata": {
    "description": "我的个人技术博客，分享编程经验和技术文章",
    "keywords": "技术博客, 编程, Python, JavaScript",
    "author": "磊磊",
    "ogTitle": "我的博客",
    "ogDescription": "个人技术博客",
    "ogImage": "https://leileiluoluo.com/og-image.png",
    "ogUrl": "https://leileiluoluo.com",
    "ogType": "website",
    "twitterCard": "summary_large_image",
    "twitterTitle": "我的博客",
    "twitterDescription": "个人技术博客",
    "twitterImage": "https://leileiluoluo.com/twitter-image.png",
    "viewport": "width=device-width, initial-scale=1",
    "charset": "UTF-8"
  },
  
  "performance": {
    "navigationStart": 1706140800000,
    "domContentLoadedTime": 450,
    "loadTime": 850,
    "domInteractive": 420,
    "domComplete": 830
  },
  
  "interactive": {
    "clickableElements": 57,
    "inputElements": 8,
    "visibleInputs": 6
  },
  
  "language": {
    "language": "zh-CN",
    "direction": "ltr"
  }
}
```

## 数据字段说明

### 1. 基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | string | 当前页面 URL |
| `title` | string | 页面标题 |

### 2. viewport（视口）

| 字段 | 类型 | 说明 |
|------|------|------|
| `width` | number | 视口宽度（像素） |
| `height` | number | 视口高度（像素） |
| `devicePixelRatio` | number | 设备像素比（Retina 屏幕为 2） |

### 3. documentState（文档状态）

| 字段 | 类型 | 说明 |
|------|------|------|
| `readyState` | string | 文档状态：`loading`, `interactive`, `complete` |
| `documentElement` | boolean | 是否有 `<html>` 元素 |
| `body` | boolean | 是否有 `<body>` 元素 |

### 4. elementCounts（元素统计）

| 字段 | 类型 | 说明 |
|------|------|------|
| `links` | number | 链接数量（`<a>`） |
| `buttons` | number | 按钮数量（`<button>`, `[role="button"]`） |
| `inputs` | number | 输入元素数量（`<input>`, `<textarea>`, `<select>`） |
| `images` | number | 图片数量（`<img>`） |
| `scripts` | number | 脚本数量（`<script>`） |
| `forms` | number | 表单数量（`<form>`） |
| `iframes` | number | 内嵌框架数量（`<iframe>`） |
| `headings` | number | 标题数量（`<h1>` ~ `<h6>`） |

**用途**：快速了解页面结构，判断是否是表单页、内容页、或列表页。

### 5. scroll（滚动信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `scrollX` | number | 水平滚动位置 |
| `scrollY` | number | 垂直滚动位置 |
| `scrollWidth` | number | 文档总宽度（包括不可见区域） |
| `scrollHeight` | number | 文档总高度（包括不可见区域） |
| `isScrollable` | boolean | 页面是否可滚动 |

**用途**：判断是否需要滚动、当前滚动位置。

### 6. metadata（元数据）

#### 基本 Meta 标签

| 字段 | 类型 | 说明 |
|------|------|------|
| `description` | string | 页面描述（SEO） |
| `keywords` | string | 关键词 |
| `author` | string | 作者 |
| `charset` | string | 字符编码（通常是 UTF-8） |
| `viewport` | string | viewport meta 标签内容 |

#### Open Graph（社交分享）

| 字段 | 类型 | 说明 |
|------|------|------|
| `ogTitle` | string | OG 标题（用于社交分享） |
| `ogDescription` | string | OG 描述 |
| `ogImage` | string | OG 图片 URL |
| `ogUrl` | string | OG URL |
| `ogType` | string | OG 类型（website, article, etc.） |

#### Twitter Card

| 字段 | 类型 | 说明 |
|------|------|------|
| `twitterCard` | string | Twitter 卡片类型 |
| `twitterTitle` | string | Twitter 标题 |
| `twitterDescription` | string | Twitter 描述 |
| `twitterImage` | string | Twitter 图片 URL |

**用途**：了解页面 SEO 信息、社交分享预览。

### 7. performance（性能信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `navigationStart` | number | 导航开始时间戳 |
| `domContentLoadedTime` | number | DOM 内容加载时间（毫秒） |
| `loadTime` | number | 页面完全加载时间（毫秒） |
| `domInteractive` | number | DOM 可交互时间（毫秒） |
| `domComplete` | number | DOM 完成时间（毫秒） |

**用途**：性能分析、判断页面加载速度。

### 8. interactive（交互元素统计）

| 字段 | 类型 | 说明 |
|------|------|------|
| `clickableElements` | number | 可点击元素总数 |
| `inputElements` | number | 输入元素总数 |
| `visibleInputs` | number | 可见的输入元素数量 |

**用途**：快速判断页面交互性，决定是否需要调用 `browser_snapshot` 获取详细 refs。

### 9. language（语言和方向）

| 字段 | 类型 | 说明 |
|------|------|------|
| `language` | string | 页面语言（如 `zh-CN`, `en-US`） |
| `direction` | string | 文本方向（`ltr` 或 `rtl`） |

**用途**：判断页面语言、是否需要从右到左阅读（阿拉伯语、希伯来语）。

## 使用场景

### 场景 1：快速页面概览

```bash
# MCP client 调用
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_navigate",
      "arguments": {"url": "https://leileiluoluo.com"}
    }
  }'

# 获取页面信息
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_get_page_info"
    }
  }' | jq '.'
```

**AI 分析**：
```
页面信息：
- 标题: "我的博客 - 首页"
- 类型: 内容网站（45个链接，18个标题）
- 交互性: 中等（12个按钮，8个输入框）
- 性能: 良好（加载时间 850ms）
- 建议: 调用 browser_snapshot 获取可交互元素的 refs
```

### 场景 2：判断页面类型

```python
# AI Agent 逻辑
page_info = call_mcp("browser_get_page_info")

if page_info["elementCounts"]["forms"] > 0:
    # 表单页面
    if page_info["elementCounts"]["inputs"] > 5:
        # 复杂表单
        strategy = "multi_step_form_fill"
    else:
        # 简单表单（如登录）
        strategy = "simple_form_fill"
        
elif page_info["elementCounts"]["links"] > 50:
    # 导航页/列表页
    strategy = "extract_links_and_navigate"
    
elif page_info["elementCounts"]["headings"] > 10:
    # 内容页（博客文章等）
    strategy = "extract_content"
    
else:
    # 其他页面
    strategy = "generic_interaction"
```

### 场景 3：性能监控

```python
page_info = call_mcp("browser_get_page_info")
perf = page_info.get("performance", {})

if perf.get("loadTime", 0) > 3000:
    print("⚠️ 页面加载慢（> 3秒）")
    # 可能需要等待更长时间
    
if perf.get("domContentLoadedTime", 0) > 1500:
    print("⚠️ DOM 解析慢（> 1.5秒）")
```

### 场景 4：SEO 分析

```python
page_info = call_mcp("browser_get_page_info")
metadata = page_info.get("metadata", {})

# 检查 SEO 基本要素
issues = []
if not metadata.get("description"):
    issues.append("缺少 meta description")
if not metadata.get("ogTitle"):
    issues.append("缺少 Open Graph 标题")
if not metadata.get("ogImage"):
    issues.append("缺少 Open Graph 图片")
    
print(f"SEO 问题: {', '.join(issues) if issues else '无'}")
```

### 场景 5：配合 browser_snapshot

```python
# 1. 先获取页面概览
page_info = call_mcp("browser_get_page_info")

# 2. 判断是否有交互元素
if page_info["interactive"]["clickableElements"] > 0:
    # 3. 获取详细的可交互元素 refs
    snapshot = call_mcp("browser_snapshot")
    
    # 4. 使用 refs 进行精确交互
    call_mcp("browser_click", {"identifier": "@e1"})
else:
    print("页面无交互元素，可能是静态内容页")
```

## MCP 调用示例

### 基本调用

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
  }'
```

### 响应示例

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"url\":\"https://leileiluoluo.com\",\"title\":\"我的博客 - 首页\",\"viewport\":{\"width\":1280,\"height\":720,\"devicePixelRatio\":2},\"elementCounts\":{\"links\":45,\"buttons\":12,\"inputs\":8,\"images\":20,\"scripts\":15,\"forms\":2,\"iframes\":0,\"headings\":18},\"interactive\":{\"clickableElements\":57,\"inputElements\":8,\"visibleInputs\":6},\"metadata\":{\"description\":\"我的个人技术博客\",\"charset\":\"UTF-8\"}}"
      }
    ]
  }
}
```

## 与其他命令的协作

### 推荐工作流

```
1. browser_navigate
   ↓
2. browser_get_page_info (快速了解页面)
   ↓
3. 分析 elementCounts 和 interactive
   ↓
4a. 如果有表单 → browser_snapshot → browser_fill
4b. 如果是列表页 → browser_snapshot → browser_click
4c. 如果是内容页 → browser_evaluate 提取内容
```

### 命令对比

| 命令 | 用途 | 返回内容 | 适用场景 |
|------|------|---------|---------|
| `browser_get_page_info` | 页面概览 | 元数据、统计、性能 | 快速了解页面结构 |
| `browser_snapshot` | 可交互元素 | 可访问性树 + refs | 精确元素交互 |
| `browser_evaluate` | 自定义提取 | JavaScript 执行结果 | 复杂数据提取 |
| `browser_take_screenshot` | 视觉快照 | 图片 | 视觉调试 |

## 性能考虑

### 执行时间
- **快速**：大部分信息通过单次 JavaScript 调用获取
- **估计耗时**：50-200ms（取决于页面复杂度）

### 开销
- **低开销**：只执行 DOM 查询，不涉及网络请求
- **缓存友好**：结果可缓存，页面未变化时复用

### 最佳实践

```python
# ✅ 推荐：按需获取
page_info = call_mcp("browser_get_page_info")
if page_info["elementCounts"]["forms"] > 0:
    # 只在需要时获取 snapshot
    snapshot = call_mcp("browser_snapshot")

# ❌ 不推荐：无脑调用
for url in urls:
    navigate(url)
    get_page_info()  # 不管是否需要
    get_snapshot()   # 不管是否需要
```

## 对比其他工具

### vs Playwright MCP

| 功能 | Playwright MCP | browserpilot |
|------|---------------|--------------|
| 页面信息 | 分散在多个命令 | 单一命令综合返回 |
| 元素统计 | 需要自己 evaluate | 内置统计 |
| 性能信息 | 需要自己 evaluate | 内置性能指标 |
| Metadata | 需要自己 evaluate | 内置 OG/Twitter |

### vs agent-browser

| 功能 | agent-browser | browserpilot |
|------|--------------|--------------|
| 获取信息 | 多个 `get` 子命令 | 单一命令 |
| 元素统计 | `get count <selector>` | 内置多种统计 |
| 性能 | 不支持 | 内置性能指标 |
| 综合性 | 需要多次调用 | 一次调用全部 |

## 总结

### 增强点

✅ **综合信息**：一次调用获取所有页面元数据  
✅ **元素统计**：快速了解页面结构（链接、按钮、输入框等）  
✅ **性能指标**：页面加载时间、DOM 完成时间  
✅ **SEO 元数据**：Open Graph、Twitter Card、meta 标签  
✅ **交互性判断**：可点击/输入元素统计  
✅ **滚动信息**：判断页面是否可滚动、当前位置  
✅ **语言信息**：页面语言和文本方向  

### 设计优势

1. **单次调用**：避免多次 MCP 往返
2. **结构化数据**：JSON 格式，易于解析
3. **AI 友好**：字段命名清晰，便于 LLM 理解
4. **可扩展**：未来可添加更多字段

### 使用建议

- **第一步**：导航后立即调用 `browser_get_page_info` 了解页面
- **第二步**：根据 `elementCounts` 和 `interactive` 决定下一步操作
- **第三步**：需要精确交互时调用 `browser_snapshot` 获取 refs

现在 `browser_get_page_info` 不再只是简单的 URL 和 title，而是提供了 MCP client 真正需要的丰富页面信息！🚀
