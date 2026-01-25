# browser_evaluate 快速参考

## TL;DR

现在可以直接写 JavaScript 语句，无需手动包装！

```bash
# ✅ 新方式（推荐）
{"script": "return document.title;"}

# ✅ 仍然支持
{"script": "() => document.title"}
```

## 常见用例

### 1. 获取页面信息

```javascript
// 标题
return document.title;

// URL
return window.location.href;

// 元数据
return {
    title: document.title,
    url: window.location.href,
    links: document.querySelectorAll('a').length
};
```

### 2. 提取数据

```javascript
// 提取链接
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

// 或使用 Array.from（更简洁）
return Array.from(document.querySelectorAll('a[href^="http"]'))
    .filter(link => link.textContent.trim())
    .map(link => ({
        title: link.textContent.trim(),
        url: link.href
    }));
```

### 3. 提取表格数据

```javascript
return Array.from(document.querySelectorAll('table tr'))
    .map(row => 
        Array.from(row.querySelectorAll('td'))
            .map(cell => cell.textContent.trim())
    );
```

### 4. 检查元素存在

```javascript
return {
    hasLoginBtn: !!document.querySelector('.login-btn'),
    isLoggedIn: !!document.querySelector('.logout-btn'),
    cartCount: document.querySelector('.cart-count')?.textContent || '0'
};
```

### 5. 异步操作

```javascript
async () => {
    // 等待 API 响应
    const response = await fetch('/api/data');
    return await response.json();
}

async () => {
    // 等待元素出现
    while (!document.querySelector('.loaded')) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return 'Element appeared!';
}
```

## MCP 调用格式

```bash
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
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

## 注意事项

### ✅ 正确

```javascript
// 使用 return 返回值
return document.title;

// 可选链避免 null 错误
return document.querySelector('#id')?.textContent || 'Not found';

// 返回可序列化的数据
return {title: "test", count: 123, items: [1, 2, 3]};
```

### ❌ 错误

```javascript
// 忘记 return（会返回 undefined）
const title = document.title;

// 返回 DOM 元素（无法序列化）
return document.body;

// 返回函数（无法序列化）
return () => {};
```

## JSON 转义

在 JSON 字符串中需要转义引号：

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

## 多行代码换行

```json
{
  "script": "const x = 1;\nconst y = 2;\nreturn x + y;"
}
```

## 完整示例

```bash
# 提取博客文章列表
curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_navigate",
      "arguments": {"url": "https://example.com/blog"}
    }
  }'

curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_evaluate",
      "arguments": {
        "script": "return Array.from(document.querySelectorAll(\".post\")).map(post => ({\n    title: post.querySelector(\"h2\").textContent,\n    date: post.querySelector(\".date\").textContent,\n    excerpt: post.querySelector(\".excerpt\").textContent,\n    url: post.querySelector(\"a\").href\n}));"
      }
    }
  }' | jq -r '.result.content[0].text'
```

## 测试

```bash
cd /root/code/browserpilot/test
./browserwing-test --port 18080 &
./test-evaluate.sh
```

## 更多信息

- 详细文档: [BROWSER_EVALUATE_GUIDE.md](./BROWSER_EVALUATE_GUIDE.md)
- 修复说明: [EVALUATE_AUTO_WRAP_FIX.md](./EVALUATE_AUTO_WRAP_FIX.md)
- 测试脚本: `/root/code/browserpilot/test/test-evaluate.sh`

---

**关键点**：现在可以直接写语句，自动包装为函数！🎉
