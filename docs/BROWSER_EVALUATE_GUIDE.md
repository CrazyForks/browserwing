# browser_evaluate 使用指南

## 概述

`browser_evaluate` 允许在浏览器上下文中执行任意 JavaScript 代码，适用于页面数据提取、DOM 操作、脚本注入等场景。

## 🔥 重要更新（自动包装功能）

从最新版本开始，`browser_evaluate` 支持**智能脚本包装**：
- ✅ 如果你的脚本不是函数格式，会自动包装为 `() => { 你的代码 }`
- ✅ 如果已经是函数格式（`() =>` 或 `function`），则保持原样
- ✅ 支持多行代码、复杂逻辑

## 基本语法

### 方式 1：直接写语句（推荐，自动包装）

```javascript
// 单行返回
return document.title;

// 多行代码
const links = [];
document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (link.textContent.trim()) {
        links.push({
            title: link.textContent.trim(),
            url: link.href
        });
    }
});
return links;
```

### 方式 2：箭头函数（显式）

```javascript
() => {
    return document.title;
}

() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({title: l.textContent, url: l.href}));
}
```

### 方式 3：单行箭头函数

```javascript
() => document.title
() => window.location.href
() => document.querySelectorAll('a').length
```

## MCP 调用示例

### 示例 1：获取页面标题

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "return document.title;"
      }
    }
  }'
```

**返回：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully executed script\nResult: 我的博客 - 首页"
      }
    ]
  }
}
```

### 示例 2：获取所有链接（你的场景）

**旧方式（会失败）：**
```json
{
  "script": "const links = [];\ndocument.querySelectorAll('a[href^=\"http\"]').forEach(link => {\n    links.push({title: link.textContent.trim(), url: link.href});\n});\nreturn links;"
}
```

**错误：** `SyntaxError: Unexpected token 'const'`

**新方式（自动包装，成功）：**
```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "const links = [];\ndocument.querySelectorAll(\"a[href^=\\\"http\\\"]\").forEach(link => {\n    if (link.textContent.trim() && !link.textContent.includes(\"随喜打赏\") && !link.textContent.includes(\"关于本博\") && !link.textContent.includes(\"友情链接\")) {\n        links.push({\n            title: link.textContent.trim(),\n            url: link.href\n        });\n    }\n});\nreturn links;"
      }
    }
  }'
```

**或者更简洁（使用 Array.from + filter + map）：**
```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "return Array.from(document.querySelectorAll(\"a[href^=\\\"http\\\"]\"))\n    .filter(link => {\n        const text = link.textContent.trim();\n        return text && !text.includes(\"随喜打赏\") && !text.includes(\"关于本博\") && !text.includes(\"友情链接\");\n    })\n    .map(link => ({\n        title: link.textContent.trim(),\n        url: link.href\n    }));"
      }
    }
  }'
```

**返回：**
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "Successfully executed script\nResult: [{\"title\":\"编写提示词需要遵循的五个原则\",\"url\":\"https://leileiluoluo.com/posts/ai-prompt-5-principles.html\"}, ...]"
    }]
  }
}
```

### 示例 3：获取页面元数据

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "return {\n    title: document.title,\n    url: window.location.href,\n    links: document.querySelectorAll(\"a\").length,\n    images: document.querySelectorAll(\"img\").length,\n    scripts: document.querySelectorAll(\"script\").length\n};"
      }
    }
  }'
```

### 示例 4：修改页面（注入样式）

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "const style = document.createElement(\"style\");\nstyle.textContent = \"body { filter: grayscale(100%); }\";\ndocument.head.appendChild(style);\nreturn \"Grayscale filter applied\";"
      }
    }
  }'
```

### 示例 5：等待元素出现（异步）

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "async () => {\n    while (!document.querySelector(\".loaded\")) {\n        await new Promise(resolve => setTimeout(resolve, 100));\n    }\n    return \"Element found!\";\n}"
      }
    }
  }'
```

## 智能包装规则

### 检测逻辑

脚本会被自动包装，**除非**它以下列任一开头：
- `()` - 箭头函数：`() => { ... }`
- `function` - 普通函数：`function() { ... }`
- `async ` - 异步函数：`async () => { ... }`

### 包装示例

| 输入脚本 | 实际执行 | 结果 |
|---------|---------|------|
| `return document.title;` | `() => {\nreturn document.title;\n}` | ✅ 成功 |
| `const x = 1; return x + 2;` | `() => {\nconst x = 1; return x + 2;\n}` | ✅ 成功 |
| `() => document.title` | `() => document.title` | ✅ 成功（不包装） |
| `function() { return 1; }` | `function() { return 1; }` | ✅ 成功（不包装） |
| `async () => { await fetch(...); }` | `async () => { await fetch(...); }` | ✅ 成功（不包装） |

## JSON 转义注意事项

在 JSON 字符串中，需要转义特殊字符：

### JavaScript 中的引号

```json
{
  "script": "return document.querySelector(\"#id\").textContent;"
}
```

或使用单引号：
```json
{
  "script": "return document.querySelector('#id').textContent;"
}
```

### 换行符

```json
{
  "script": "const x = 1;\nconst y = 2;\nreturn x + y;"
}
```

### 完整示例（多层转义）

```bash
# Shell 中的命令
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "const links = document.querySelectorAll(\"a[href^=\\\"http\\\"]\");\nreturn Array.from(links).map(l => l.href);"
      }
    }
  }'
```

**转义规则：**
1. JSON 字符串中的 `"` → `\"`
2. Shell 中的 `"` → `\"`（如果使用单引号包裹则不需要）
3. JSON 中的换行 → `\n`

## 返回值处理

### 支持的返回类型

✅ **基本类型**
```javascript
return "string";
return 123;
return true;
return null;
```

✅ **对象**
```javascript
return {name: "test", value: 123};
```

✅ **数组**
```javascript
return [1, 2, 3];
return [{a: 1}, {a: 2}];
```

✅ **复杂嵌套**
```javascript
return {
    meta: {title: document.title, url: location.href},
    links: Array.from(document.querySelectorAll('a')).map(l => l.href),
    count: document.querySelectorAll('a').length
};
```

❌ **不支持的类型**
- DOM 元素：`return document.body;` ❌
- 函数：`return () => {};` ❌
- Symbol：`return Symbol('test');` ❌

**解决方案**：将 DOM 元素转换为 JSON 可序列化的数据
```javascript
// ❌ 错误
return document.querySelector('#id');

// ✅ 正确
return {
    tag: document.querySelector('#id').tagName,
    text: document.querySelector('#id').textContent,
    html: document.querySelector('#id').innerHTML
};
```

## 常见用例

### 1. 页面数据提取

```javascript
// 提取文章列表
return Array.from(document.querySelectorAll('.post')).map(post => ({
    title: post.querySelector('h2').textContent,
    date: post.querySelector('.date').textContent,
    excerpt: post.querySelector('.excerpt').textContent,
    url: post.querySelector('a').href
}));
```

### 2. 表单操作

```javascript
// 填充表单
document.querySelector('#username').value = 'testuser';
document.querySelector('#password').value = 'testpass';
document.querySelector('form').submit();
return 'Form submitted';
```

### 3. 页面状态检查

```javascript
return {
    hasLoginButton: !!document.querySelector('.login-btn'),
    isLoggedIn: !!document.querySelector('.logout-btn'),
    cartItems: document.querySelectorAll('.cart-item').length,
    totalPrice: document.querySelector('.total-price')?.textContent
};
```

### 4. 滚动操作

```javascript
// 滚动到底部
window.scrollTo(0, document.body.scrollHeight);
return 'Scrolled to bottom';

// 滚动到特定元素
document.querySelector('#target').scrollIntoView();
return 'Scrolled to target';
```

### 5. 等待 AJAX 完成

```javascript
async () => {
    // 等待加载完成
    while (document.querySelector('.loading')) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    // 提取数据
    return Array.from(document.querySelectorAll('.item')).map(item => ({
        title: item.textContent.trim()
    }));
}
```

## 错误处理

### 常见错误

#### 1. 语法错误

```javascript
// ❌ 错误：缺少 return
const x = 1 + 2;

// ✅ 正确
const x = 1 + 2;
return x;
```

#### 2. 选择器错误

```javascript
// ❌ 错误：元素不存在
return document.querySelector('#nonexistent').textContent;

// ✅ 正确：添加检查
const elem = document.querySelector('#nonexistent');
return elem ? elem.textContent : null;

// ✅ 更好：使用可选链
return document.querySelector('#nonexistent')?.textContent || 'Not found';
```

#### 3. 异步操作错误

```javascript
// ❌ 错误：fetch 返回 Promise
return fetch('/api/data');

// ✅ 正确：使用 async/await
async () => {
    const response = await fetch('/api/data');
    return await response.json();
}
```

## 性能建议

### 1. 批量操作优化

```javascript
// ❌ 慢：多次 DOM 查询
const titles = [];
for (let i = 0; i < 100; i++) {
    titles.push(document.querySelectorAll('h2')[i].textContent);
}
return titles;

// ✅ 快：一次查询，数组操作
return Array.from(document.querySelectorAll('h2'))
    .map(h2 => h2.textContent);
```

### 2. 避免大量数据传输

```javascript
// ❌ 慢：返回大量 HTML
return document.body.innerHTML;

// ✅ 快：只返回需要的数据
return {
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(h => h.textContent)
};
```

## 最佳实践总结

1. ✅ **使用 `return` 返回值**（必须）
2. ✅ **优先使用直接语句**（自动包装，简洁）
3. ✅ **复杂逻辑使用多行**（可读性好）
4. ✅ **返回可序列化的数据**（对象、数组、基本类型）
5. ✅ **添加空值检查**（使用 `?.` 可选链）
6. ✅ **异步操作用 `async/await`**（等待 Promise）
7. ❌ **不要返回 DOM 元素**（无法序列化）
8. ❌ **不要在脚本中使用 `console.log`**（不会显示在 MCP 响应中）

## 测试新功能

```bash
cd /root/code/browserpilot/test

# 启动服务器
./browserwing-test --port 18080 &

# 测试 1：简单返回（自动包装）
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://leileiluoluo.com"}}}'

curl -X POST http://localhost:18080/api/v1/mcp/message \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"browser_evaluate","arguments":{"script":"return document.title;"}}}' \
  | jq -r '.result.content[0].text'

# 测试 2：多行代码（自动包装）
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "const links = [];\ndocument.querySelectorAll(\"a\").forEach(link => {\n    links.push({title: link.textContent.trim(), url: link.href});\n});\nreturn links.slice(0, 5);"
      }
    }
  }' | jq -r '.result.content[0].text'

# 测试 3：箭头函数（不包装）
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_evaluate","arguments":{"script":"() => document.title"}}}' \
  | jq -r '.result.content[0].text'
```

## 相关文档

- [元素选择指南](./ELEMENT_SELECTION_GUIDE.md)
- [RefID 使用说明](./REFID_IMPLEMENTATION.md)
- [MCP 测试指南](./MCP_TESTING_GUIDE.md)

---

现在 `browser_evaluate` 支持智能包装，不再需要手动写箭头函数了！🚀
