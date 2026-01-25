# browser_evaluate 智能包装修复

## 问题描述

用户使用 `browser_evaluate` 时遇到语法错误：

```json
{
  "script": "const links = [];\ndocument.querySelectorAll('a').forEach(...);\nreturn links;"
}
```

**错误：**
```
eval js error: SyntaxError: Unexpected token 'const' <nil>
```

## 根本原因

`page.Eval()` (rod 库) 要求脚本必须是**函数表达式**格式：
- `() => { ... }` - 箭头函数
- `function() { ... }` - 普通函数
- `async () => { ... }` - 异步函数

但用户传递的是**语句代码**（statement），不是函数，所以会报语法错误。

## 解决方案

实现**智能脚本包装**：
1. 检测脚本是否已经是函数格式
2. 如果不是，自动包装为 `() => { 用户代码 }`
3. 如果是，保持原样

### 实现代码

#### 1. 添加智能包装函数

```go
// wrapScriptIfNeeded 智能包装脚本
// 如果脚本不是函数格式，自动包装为箭头函数
func wrapScriptIfNeeded(script string) string {
	script = strings.TrimSpace(script)
	
	// 检测是否已经是函数格式
	// 1. 箭头函数：() => { ... } 或 () => ...
	// 2. 普通函数：function() { ... }
	// 3. 异步函数：async () => { ... } 或 async function() { ... }
	if strings.HasPrefix(script, "()") ||
		strings.HasPrefix(script, "function") ||
		strings.HasPrefix(script, "async ") {
		return script
	}

	// 不是函数格式，需要包装
	// 包装为箭头函数：() => { 用户代码 }
	return fmt.Sprintf("() => {\n%s\n}", script)
}
```

#### 2. 更新 safeEvaluate 函数

```go
func safeEvaluate(ctx context.Context, page *rod.Page, script string, result interface{}) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic during evaluate: %v", r)
		}
	}()

	// 智能包装脚本：如果不是函数格式，自动包装为箭头函数
	wrappedScript := wrapScriptIfNeeded(script)

	evalResult, evalErr := page.Eval(wrappedScript)
	if evalErr != nil {
		return evalErr
	}

	// 尝试解析结果
	if evalResult != nil {
		*result.(*interface{}) = evalResult.Value.Val()
	}

	return nil
}
```

#### 3. 更新 MCP Tool 描述

```go
tool := mcpgo.NewTool(
	"browser_evaluate",
	mcpgo.WithDescription(`Execute JavaScript code in the browser context. 
The script will be automatically wrapped in a function if needed.

Examples:
1. Arrow function (recommended):
   () => { return document.title; }
   
2. Direct statements (auto-wrapped):
   return document.title;
   const links = document.querySelectorAll('a'); return Array.from(links).map(l => l.href);
   
3. Multi-line code (auto-wrapped):
   const links = [];
   document.querySelectorAll('a').forEach(link => {
       links.push({title: link.textContent, url: link.href});
   });
   return links;

Note: Always use 'return' to return values. The result will be serialized as JSON.`),
	mcpgo.WithString("script", mcpgo.Required(), mcpgo.Description("JavaScript code to execute (function or statements)")),
)
```

## 改进效果

### 之前（❌ 失败）

```bash
# 用户代码
{
  "script": "const links = [];\ndocument.querySelectorAll('a').forEach(link => {\n    links.push({title: link.textContent, url: link.href});\n});\nreturn links;"
}

# 错误
eval js error: SyntaxError: Unexpected token 'const' <nil>
```

### 之后（✅ 成功）

```bash
# 用户代码（相同）
{
  "script": "const links = [];\ndocument.querySelectorAll('a').forEach(link => {\n    links.push({title: link.textContent, url: link.href});\n});\nreturn links;"
}

# 自动包装为
() => {
const links = [];
document.querySelectorAll('a').forEach(link => {
    links.push({title: link.textContent, url: link.href});
});
return links;
}

# 结果
✅ Successfully executed script
Result: [{"title":"编写提示词需要遵循的五个原则","url":"https://..."}...]
```

## 包装规则

| 输入格式 | 检测逻辑 | 是否包装 | 最终执行 |
|---------|---------|---------|---------|
| `return document.title;` | 不以 `()`, `function`, `async` 开头 | ✅ 包装 | `() => {\nreturn document.title;\n}` |
| `const x = 1; return x;` | 不以 `()`, `function`, `async` 开头 | ✅ 包装 | `() => {\nconst x = 1; return x;\n}` |
| `() => document.title` | 以 `()` 开头 | ❌ 不包装 | `() => document.title` |
| `() => { return 1; }` | 以 `()` 开头 | ❌ 不包装 | `() => { return 1; }` |
| `function() { return 1; }` | 以 `function` 开头 | ❌ 不包装 | `function() { return 1; }` |
| `async () => { ... }` | 以 `async` 开头 | ❌ 不包装 | `async () => { ... }` |

## 支持的使用方式

### 方式 1：直接语句（推荐，自动包装）

```javascript
// 单行
return document.title;

// 多行
const links = [];
document.querySelectorAll('a').forEach(link => {
    links.push({title: link.textContent, url: link.href});
});
return links;

// 复杂逻辑
const data = [];
for (let i = 0; i < 10; i++) {
    const elem = document.querySelector(`#item-${i}`);
    if (elem) {
        data.push(elem.textContent);
    }
}
return data;
```

### 方式 2：箭头函数（显式）

```javascript
() => document.title

() => {
    return {
        title: document.title,
        url: window.location.href
    };
}
```

### 方式 3：异步函数

```javascript
async () => {
    const response = await fetch('/api/data');
    return await response.json();
}
```

## 测试验证

### 运行测试脚本

```bash
cd /root/code/browserpilot/test

# 启动服务器
./browserwing-test --port 18080 2>&1 | tee server.log &

# 等待启动
sleep 3

# 运行测试
./test-evaluate.sh
```

### 测试场景

测试脚本包含 10 个场景：

1. ✅ **简单返回** - `return document.title;`
2. ✅ **多行代码** - 声明变量、循环、返回对象
3. ✅ **箭头函数** - `() => document.title`
4. ✅ **显式箭头函数** - `() => { return {...}; }`
5. ✅ **async 函数** - `async () => { await ...; }`
6. ✅ **用户场景** - 提取链接（forEach）
7. ✅ **优化版** - 提取链接（Array.from + filter + map）
8. ⚠️ **缺少 return** - 返回 `undefined`
9. ✅ **复杂对象** - 嵌套对象、多层数据
10. ✅ **页面统计** - 元素计数、viewport 信息

### 预期输出

```
==========================================
browser_evaluate 智能包装功能测试
==========================================

1. 导航到测试页面...
✅ 页面加载完成

测试 简单返回 - 自动包装:
脚本: return document.title;...

✅ 成功:
Successfully executed script
Result: 我的博客 - 首页

------------------------------------------

测试 多行代码 - 自动包装:
脚本: const title = document.title;...

✅ 成功:
Successfully executed script
Result: {"title":"我的博客 - 首页","url":"https://leileiluoluo.com","links":45}

------------------------------------------

测试 提取链接 - 自动包装（你的场景）:
脚本: const links = [];...

✅ 成功:
Successfully executed script
Result: [{"title":"编写提示词需要遵循的五个原则（附实践案例）","url":"https://leileiluoluo.com/posts/ai-prompt-5-principles.html"},...]

------------------------------------------
```

## 向后兼容性

✅ **完全向后兼容**：
- 已有的箭头函数脚本：继续工作（不包装）
- 已有的普通函数脚本：继续工作（不包装）
- 新的语句脚本：自动包装，无需修改 API

## 用户体验改进

### 之前

```javascript
// ❌ 用户必须手动写箭头函数
"() => { return document.title; }"

// ❌ 复杂代码需要手动包装，容易出错
"() => {\n    const links = [];\n    document.querySelectorAll('a').forEach(link => {\n        links.push({title: link.textContent, url: link.href});\n    });\n    return links;\n}"
```

### 之后

```javascript
// ✅ 简洁：直接写返回语句
"return document.title;"

// ✅ 清晰：多行代码更易读
"const links = [];\ndocument.querySelectorAll('a').forEach(link => {\n    links.push({title: link.textContent, url: link.href});\n});\nreturn links;"

// ✅ 灵活：仍然可以使用箭头函数
"() => document.title"
```

## MCP Client 提示

现在 MCP tool 的描述会明确告诉 client：

```
Execute JavaScript code in the browser context. 
The script will be automatically wrapped in a function if needed.

Examples:
1. Arrow function (recommended):
   () => { return document.title; }
   
2. Direct statements (auto-wrapped):
   return document.title;
   const links = document.querySelectorAll('a'); return Array.from(links).map(l => l.href);
   
3. Multi-line code (auto-wrapped):
   const links = [];
   document.querySelectorAll('a').forEach(link => {
       links.push({title: link.textContent, url: link.href});
   });
   return links;

Note: Always use 'return' to return values. The result will be serialized as JSON.
```

## 相关文件

- **实现**: `/root/code/browserpilot/backend/executor/operations.go`
  - `safeEvaluate()` - 智能包装调用
  - `wrapScriptIfNeeded()` - 包装逻辑
- **MCP Tool**: `/root/code/browserpilot/backend/executor/mcp_tools.go`
  - `registerEvaluateTool()` - 更新描述
- **测试**: `/root/code/browserpilot/test/test-evaluate.sh`
- **文档**: `/root/code/browserpilot/docs/BROWSER_EVALUATE_GUIDE.md`

## 总结

✅ **问题解决**：`SyntaxError: Unexpected token 'const'` 不再发生  
✅ **智能包装**：自动检测并包装非函数脚本  
✅ **向后兼容**：已有脚本继续工作  
✅ **用户体验**：更简洁、更直观的 API  
✅ **MCP 提示**：清晰的文档和示例

现在用户可以直接写语句代码，不需要手动包装为箭头函数了！🚀
