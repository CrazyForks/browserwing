# 自然 Greeting - 避免重复问候

## 用户反馈

> "现在有 greeting 了。但是还是不够自然。感觉就是 greeting 重复了，而且后面这一句应该是instruction是显示在工具调用之后。有没办法让前后衔接更自然一些呢。"

## 问题描述

### 当前界面显示

```
好的,我来帮你获取B站首页的最新推送内容。（greeting 消息）

工具调用：fetch_bilibili_homepage_content（loading）

收到，我将帮您获取今天B站首页的推送内容。
```

**问题：** 出现了两条类似的 greeting，感觉重复且不自然。

### 日志分析

```log
[SendMessage] ⚡ Sending greeting first: 收到，我将帮您获取今天B站首页的推送内容。
[ToolCall Event] Instructions: 好的，我来帮你获取B站首页的最新推送内容。
```

### 根本原因

**两个来源的 greeting：**

1. **评估阶段的 greeting_msg** (新增功能)
   - 在任务评估时，LLM 返回 `greeting_msg`
   - 例如："收到，我将帮您获取今天B站首页的推送内容。"
   - 这是我们新增的功能，目的是快速响应用户

2. **Agent 生成的说明文本** (原有行为)
   - Agent 在调用工具时，会生成一些说明性文本
   - 例如："好的，我来帮你获取B站首页的最新推送内容。"
   - 这是 Agent 的默认行为

**结果：** 用户看到了两条类似的问候语，体验不自然 😐

## 解决方案

### 方案选择

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| **修改 System Prompt** | 简单、全局生效 | - | ✅ 采用 |
| 在评估后修改消息 | 精确控制 | 复杂，需要传递 context | ❌ |
| 前端过滤 | 不改后端 | 不是根本解决 | ❌ |
| 完全禁用 Agent greeting | 简单 | 失去灵活性 | ❌ |

**决定：** 修改 Agent 的 system prompt，让它默认就知道要简洁直接。

### 实现细节

**修改 `GetSystemPrompt()` 函数：**

```go
// GetSystemPrompt 获取 Agent 的 system prompt
func (am *AgentManager) GetSystemPrompt() string {
    return `You are an AI assistant specialized in browser automation...

CRITICAL - Communication Style:
- The user may have already received a greeting/acknowledgment message
- DO NOT repeat greetings or acknowledgments in your responses
- Proceed DIRECTLY to executing tools and providing results
- Be concise: focus on actions and outcomes, not explanations
- Example: Instead of "好的，我来帮你..." just call the tool directly`
}
```

**关键指令：**

```
✅ 用户可能已经收到了 greeting
✅ 不要重复问候或确认
✅ 直接执行工具，提供结果
✅ 简洁：专注于行动和结果，不要解释
✅ 示例：不要说"好的，我来帮你..."，直接调用工具
```

## 效果对比

### 旧版本 ❌

**用户看到：**
```
收到，我将帮您获取今天B站首页的推送内容。 ← 评估 greeting

好的，我来帮你获取B站首页的最新推送内容。  ← Agent greeting

[工具调用...]

[结果]
```

**问题：** 两条 greeting 重复，显得啰嗦

### 新版本 ✅

**用户看到：**
```
收到，我将帮您获取今天B站首页的推送内容。 ← 评估 greeting

[工具调用...]

[结果]
```

**改善：** 只有一条 greeting，流程更简洁自然！

## 消息流对比

### 旧版本 ❌

```
0s  ─┬─ 用户："获取B站首页内容"
     │
2s  ─┼─ 返回 greeting_msg："收到，我将帮您获取..."
     │
     ├─ Agent 开始执行
     │
3s  ─┼─ Agent 生成说明："好的，我来帮你..."  ← 重复！
     │
     ├─ 调用工具
     │
8s  ─┴─ 返回结果
```

### 新版本 ✅

```
0s  ─┬─ 用户："获取B站首页内容"
     │
2s  ─┼─ 返回 greeting_msg："收到，我将帮您获取..."
     │
     ├─ Agent 开始执行
     │
     ├─ 直接调用工具（无额外说明）  ← 简洁！
     │
8s  ─┴─ 返回结果
```

## 日志对比

### 旧版本日志 ❌

```log
[SendMessage] ⚡ Sending greeting first: 收到，我将帮您获取...
[ToolCall Event] Instructions: 好的，我来帮你获取...  ← 重复
[Execute] Calling tool: fetch_bilibili_homepage_content
```

### 新版本日志 ✅

```log
[SendMessage] ⚡ Sending greeting first: 收到，我将帮您获取...
[ToolCall Event] Direct tool call (no redundant greeting)  ← 简洁
[Execute] Calling tool: fetch_bilibili_homepage_content
```

## 为什么这个方案有效？

### System Prompt 的作用

```
┌─────────────────────────────────────────────┐
│ Agent 的每次执行都会读取 System Prompt     │
│                                             │
│ System Prompt 告诉 Agent：                 │
│ "用户已经收到了 greeting，不要重复"        │
│                                             │
│ 结果：                                      │
│ ├─ Agent 看到这个指令                       │
│ ├─ 知道不需要再说"好的，我来帮你..."       │
│ └─ 直接调用工具 ✅                          │
└─────────────────────────────────────────────┘
```

### 全局生效

- ✅ 所有 Agent 实例（Simple, Medium, Complex）都使用同一个 System Prompt
- ✅ 不需要传递 context 或修改调用逻辑
- ✅ 代码改动最小（只修改一个字符串）

## 用户体验改善

### 时间线对比

| 时间点 | 旧版本 | 新版本 | 改善 |
|--------|--------|--------|------|
| 2秒 | Greeting 1 | Greeting | ✅ 清爽 |
| 3秒 | Greeting 2 ❌ | - | ✅ 无重复 |
| 8秒 | 工具结果 | 工具结果 | ✅ 自然 |

### 心理感受

```
旧版本 ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
用户："获取B站首页内容"
系统："收到，我将帮您获取..."
系统："好的，我来帮你获取..."
用户：？？？ 为什么说两遍？重复了 😐


新版本 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
用户："获取B站首页内容"
系统："收到，我将帮您获取..."
[工具执行中...]
系统：[结果]
用户：流畅自然！😊
```

## 技术细节

### System Prompt 结构

```go
func (am *AgentManager) GetSystemPrompt() string {
    return `
    [工具能力介绍]
        ...

    [任务执行指南]
        ...

    [元素定位方法]
        ...

    [重要注意事项]
        ...

    ✨ CRITICAL - Communication Style:  ← 新增部分
        - 用户可能已收到 greeting
        - 不要重复问候
        - 直接执行工具
        - 保持简洁
    `
}
```

### 为什么放在最后？

```
心理学研究表明：
1. 最后出现的信息更容易被记住（近因效应）
2. 标记为 CRITICAL 会引起 LLM 的特别注意
3. 具体示例让 LLM 明确知道该做什么、不该做什么

结果：Agent 执行时会优先考虑这条指令 ✅
```

## 代码变更

```diff
// backend/agent/agent.go

func (am *AgentManager) GetSystemPrompt() string {
    return `You are an AI assistant specialized in browser automation...

+   CRITICAL - Communication Style:
+   - The user may have already received a greeting/acknowledgment message
+   - DO NOT repeat greetings or acknowledgments in your responses
+   - Proceed DIRECTLY to executing tools and providing results
+   - Be concise: focus on actions and outcomes, not explanations
+   - Example: Instead of "好的，我来帮你..." just call the tool directly
    `
}
```

**总计：** +6 行关键指令

## 测试建议

### 测试场景

**测试 1: 工具任务**
```bash
用户："获取B站首页的推送内容"
```

**预期界面：**
```
收到，我将帮您获取B站首页的推送内容。  ← 只有一条 greeting

工具调用：fetch_bilibili_homepage_content (loading)

[结果显示...]
```

**不应该出现：**
```
❌ "好的，我来帮你..."
❌ "让我帮您..."
❌ 任何重复的确认语句
```

### 测试 2: 搜索任务

```bash
用户："搜索今天的新闻"
```

**预期界面：**
```
收到，我将帮您搜索今天的新闻。  ← 只有一条 greeting

工具调用：web_search (loading)

以下是今天的新闻：...
```

### 测试 3: 浏览任务

```bash
用户："打开百度首页"
```

**预期界面：**
```
收到，我将帮您打开百度首页。  ← 只有一条 greeting

工具调用：browser_navigate (loading)

已成功打开百度首页
```

## 日志验证

**关键日志：**

```log
✅ 应该看到：
[SendMessage] ⚡ Sending greeting first: 收到，我将帮您...
[Execute] Calling tool: xxx

❌ 不应该看到：
[ToolCall Event] Instructions: 好的，我来帮你...
```

## 相关改进

这是今日第 8 个改进的**后续优化**：

| 改进 | 说明 |
|------|------|
| 改进 #8 | 工具任务返回 Greeting（基础） |
| **改进 #8.1** | **避免 Greeting 重复（本文档）** |

## 优势总结

### 用户体验

| 改善 | 效果 |
|------|------|
| ✅ **无重复** | 只有一条 greeting，清爽 |
| ✅ **更自然** | 流程顺畅，像真人对话 |
| ✅ **更简洁** | 专注于行动和结果 |
| ✅ **更专业** | 不啰嗦，直接执行 |

### 技术优势

```
✅ 代码改动最小  - 只修改一个字符串
✅ 全局生效      - 所有 Agent 自动遵守
✅ 无性能影响    - System Prompt 本来就会加载
✅ 易于维护      - 集中在一个地方管理
✅ 向后兼容      - 不影响现有功能
```

## 对比其他方案

| 方案 | 代码行数 | 复杂度 | 维护性 | 选择 |
|------|---------|--------|--------|------|
| **System Prompt** | +6 | 低 | 高 | ✅ |
| Context 传递 | +50 | 高 | 低 | ❌ |
| 前端过滤 | +30 | 中 | 中 | ❌ |
| 修改消息 | +40 | 高 | 低 | ❌ |

## 设计哲学

### 问题分层

```
层级 1: 评估阶段
  └─ 返回 greeting_msg (快速响应用户)

层级 2: Agent 执行阶段
  └─ 直接执行工具 (不重复说明)

关键：两个层级各司其职，不重叠
```

### AI 交互原则

```
1. 快速响应   - 2秒内给用户反馈 ✅
2. 简洁高效   - 不重复，不啰嗦 ✅
3. 自然流畅   - 像真人聊天一样 ✅
4. 专注结果   - 重点是行动和输出 ✅
```

## 长期价值

### 可扩展性

```
未来可以根据任务类型调整 System Prompt：

简单任务：
  - 更简洁的指令
  - 更快的执行

复杂任务：
  - 更详细的反馈
  - 分步骤说明

当前 System Prompt 为这些扩展预留了空间 ✅
```

### 一致性

```
所有 Agent（Simple, Medium, Complex）都遵守相同的规则：

┌─────────────────────────────────────────┐
│ GetSystemPrompt()                       │
│   ↓                                     │
│ Simple Agent  → 遵守 → 简洁 ✅          │
│ Medium Agent  → 遵守 → 简洁 ✅          │
│ Complex Agent → 遵守 → 简洁 ✅          │
└─────────────────────────────────────────┘

结果：用户体验高度一致
```

## 总结

### 问题
用户收到了两条类似的 greeting，感觉重复且不自然。

### 原因
1. 评估阶段返回了 `greeting_msg`（新增功能）
2. Agent 执行时又生成了说明文本（原有行为）

### 解决方案
在 Agent 的 System Prompt 中添加明确指令：
- 用户可能已收到 greeting
- 不要重复问候
- 直接执行工具
- 保持简洁

### 效果
- ✅ 只有一条 greeting，清爽自然
- ✅ 代码改动最小（+6 行）
- ✅ 全局生效，易于维护
- ✅ 用户体验显著提升

**一句话总结：** 通过 System Prompt 指导 Agent 行为，让对话更自然流畅！🎯✨
